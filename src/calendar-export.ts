import { spawnSync } from "child_process";
import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { startOfWeek, endOfWeek, format, parseISO, isValid } from "date-fns";
import { createEvents } from "ics";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function formatForEventKit(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateToICS(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

// Convert date to ics package format [year, month, day, hour, minute]
function dateToIcsFormat(date: Date): [number, number, number, number, number] {
  return [
    date.getFullYear(),
    date.getMonth() + 1, // ics expects 1-based months
    date.getDate(),
    date.getHours(),
    date.getMinutes()
  ];
}

// Convert date to ics package format for all-day events [year, month, day]
function dateToIcsAllDayFormat(date: Date): [number, number, number] {
  return [
    date.getFullYear(),
    date.getMonth() + 1, // ics expects 1-based months
    date.getDate()
  ];
}

// Types for the JSON response from EventKit tool
interface CalendarEvent {
  calendar: string;
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  location?: string;
  notes?: string;
}

interface CalendarExportResult {
  dateRange: {
    start: string;
    end: string;
  };
  events: CalendarEvent[];
  totalCount: number;
}

function parseEventKitDate(dateStr: string): Date | null {
  // EventKit returns dates in ISO format: yyyy-MM-ddTHH:mm:ss
  if (dateStr.includes('T')) {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  }
  
  // Fallback for other formats
  const date = new Date(dateStr);
  return isValid(date) ? date : null;
}

function getEventKitTool(): string {
  const binaryPath = resolve(__dirname, "build/calendar-export");
  
  if (!existsSync(binaryPath)) {
    throw new Error(`EventKit tool not found at ${binaryPath}. Please build it first with: ./build.sh build`);
  }
  
  return binaryPath;
}

export function exportCalendarToICS(outputPath = "./shared.ics"): string {
  const now = new Date();
  const startDate = startOfWeek(now, { weekStartsOn: 1 });
  const endDate = endOfWeek(now, { weekStartsOn: 1 });
  
  console.log("🔍 Running EventKit calendar export...");
  console.log(`📅 Fetching events for week: ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`);

  // Get the EventKit tool path
  const binaryPath = getEventKitTool();
  
  const startFormatted = formatForEventKit(startDate);
  const endFormatted = formatForEventKit(endDate);
  
  console.log(`🔧 Using EventKit tool: ${binaryPath}`);
  console.log(`📅 Date range: ${startFormatted} to ${endFormatted}`);

  const proc = spawnSync(binaryPath, [startFormatted, endFormatted], { 
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 10 
  });

  if (proc.error) {
    console.error("❌ Error running EventKit tool:", proc.error);
    throw proc.error;
  }
  
  if (proc.status !== 0) {
    console.error("❌ EventKit tool exited with error:");
    console.error("stdout:", proc.stdout);
    console.error("stderr:", proc.stderr);
    throw new Error(`EventKit tool failed with exit code ${proc.status}`);
  }

  if (proc.stderr) {
    console.error("⚠️ EventKit tool stderr:", proc.stderr);
  }

  // Parse JSON response
  let exportResult: CalendarExportResult;
  try {
    exportResult = JSON.parse(proc.stdout);
  } catch (error) {
    console.error("❌ Failed to parse JSON response:", error);
    console.error("Raw output:", proc.stdout);
    throw new Error("Invalid JSON response from EventKit tool");
  }

  console.log(`📊 Found ${exportResult.totalCount} events`);
  console.log(`📅 Date range: ${exportResult.dateRange.start} to ${exportResult.dateRange.end}`);
  
  if (exportResult.totalCount === 0) {
    console.warn("⚠️ No events found in the output");
    console.log("💡 Possible reasons:");
    console.log("   - No events in the current week");
    console.log("   - Calendar app permissions not granted");
    console.log("   - No calendars configured");
    
    // Create empty ICS file
    const emptyIcs = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:bun-calendar-export",
      "CALSCALE:GREGORIAN",
      "END:VCALENDAR"
    ].join("\r\n");
    
    writeFileSync(outputPath, emptyIcs);
    return outputPath;
  }

  const validEvents = exportResult.events.map((event, index) => {
    const start = parseEventKitDate(event.startDate);
    const end = parseEventKitDate(event.endDate);
    
    if (!start || !end) {
      console.warn(`⚠️ Skipping event with invalid dates: ${event.title}`);
      return null;
    }

    let description = `Calendar: ${event.calendar}`;
    if (event.notes) {
      description += `\n\nNotes: ${event.notes}`;
    }

    const icsEvent: any = {
      title: event.title,
      description: description,
      uid: `${Date.now()}-${index}@bun-export`,
      start: event.isAllDay ? dateToIcsAllDayFormat(start) : dateToIcsFormat(start),
      end: event.isAllDay ? dateToIcsAllDayFormat(end) : dateToIcsFormat(end),
    };

    if (event.location) {
      icsEvent.location = event.location;
    }

    return { icsEvent, startDate: start, event };
  }).filter((item): item is { icsEvent: any; startDate: Date; event: CalendarEvent } => item !== null);

  // Group events by day for display
  const eventsByDay = new Map<string, Array<{ startDate: Date; event: CalendarEvent }>>();
  
  validEvents.forEach(({ startDate, event }) => {
    const dayKey = format(startDate, 'yyyy-MM-dd');
    if (!eventsByDay.has(dayKey)) {
      eventsByDay.set(dayKey, []);
    }
    eventsByDay.get(dayKey)!.push({ startDate, event });
  });

  // Display events grouped by day
  console.log('\n📅 Events by day:');
  const sortedDays = Array.from(eventsByDay.keys()).sort();
  
  sortedDays.forEach(dayKey => {
    const dayEvents = eventsByDay.get(dayKey)!;
    const firstEvent = dayEvents[0];
    const dayLabel = format(firstEvent.startDate, 'EEEE, MMMM d'); // e.g., "Monday, July 8"
    
    console.log(`\n🗓️  ${dayLabel}`);
    
    dayEvents.forEach(({ startDate, event }) => {
      const timeStr = event.isAllDay ? 'All day' : format(startDate, 'h:mm a');
      console.log(`   ✅ ${event.title} (${timeStr})`);
    });
  });

  // Create ICS content using the ics package
  const { error, value } = createEvents(validEvents.map(item => item.icsEvent));
  
  if (error) {
    console.error("❌ Error creating ICS file:", error);
    throw new Error(`Failed to create ICS: ${error}`);
  }

  if (!value) {
    throw new Error("No ICS content generated");
  }

  writeFileSync(outputPath, value);
  
  console.log(`\n✅ Calendar exported to ${outputPath}`);
  console.log(`📊 Total events exported: ${validEvents.length}`);
  
  return outputPath;
}

export function testEventKitTool(): void {
  console.log("🧪 Testing EventKit tool...");
  
  try {
    const binaryPath = getEventKitTool();
    const now = new Date();
    const testDate = formatForEventKit(now);
    
    const proc = spawnSync(binaryPath, [testDate], {
      encoding: "utf-8",
      timeout: 10000
    });
    
    if (proc.error) {
      console.error("❌ EventKit tool test failed:", proc.error);
      return;
    }
    
    console.log("✅ EventKit tool test output:");
    
    try {
      const result: CalendarExportResult = JSON.parse(proc.stdout);
      console.log(`📅 Date range: ${result.dateRange.start} to ${result.dateRange.end}`);
      console.log(`📊 Found ${result.totalCount} events`);
      
      if (result.events.length > 0) {
        console.log("\n🗓️ Sample events:");
        result.events.slice(0, 3).forEach(event => {
          const timeStr = event.isAllDay ? 'All day' : format(parseEventKitDate(event.startDate)!, 'h:mm a');
          console.log(`  • ${event.title} (${event.calendar}) - ${timeStr}`);
        });
      }
    } catch (error) {
      console.log("Raw output:", proc.stdout);
    }
    
    if (proc.stderr) {
      console.log("⚠️ Stderr:", proc.stderr);
    }
    
  } catch (error) {
    console.error("❌ EventKit tool test failed:", error);
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.includes("--test")) {
    testEventKitTool();
  } else {
    exportCalendarToICS();
  }
}