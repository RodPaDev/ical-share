import { spawnSync } from "child_process";
import { writeFileSync, existsSync, mkdtempSync, chmodSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { startOfWeek, endOfWeek, format, parseISO, isValid } from "date-fns";
import { createEvents } from "ics";
import * as calendarInteropBinary from "calendarInterop" with { type: "file" };
import { file } from "bun";
import { tmpdir } from "os";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function formatForEventKit(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateToICS(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function dateToIcsFormat(date: Date): [number, number, number, number, number] {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
}

function dateToIcsAllDayFormat(date: Date): [number, number, number] {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

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
  if (dateStr.includes("T")) {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  }
  const date = new Date(dateStr);
  return isValid(date) ? date : null;
}

async function getEventKitTool(): Promise<string> {
  const isCompiled = __dirname.startsWith("/$bun");

  if (isCompiled) {
    const tempDir = mkdtempSync(join(tmpdir(), "ical-interop-"));
    const outPath = join(tempDir, "calendar-interop");

    const bunFile = file(calendarInteropBinary.default);
    const arrayBuffer = await bunFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    writeFileSync(outPath, buffer);
    chmodSync(outPath, 0o755);

    return outPath;
  }

  const binaryPath = resolve(__dirname, "calendarInterop");
  if (!existsSync(binaryPath)) {
    throw new Error(`EventKit tool not found at ${binaryPath}. Please build it with: ./build.sh`);
  }

  return binaryPath;
}

export async function exportCalendarToICS(outputPath = "./shared.ics"): Promise<string> {
  const now = new Date();
  const startDate = startOfWeek(now, { weekStartsOn: 1 });
  const endDate = endOfWeek(now, { weekStartsOn: 1 });

  console.log("🔍 Running EventKit calendar export...");
  console.log(`📅 Fetching events for week: ${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`);

  const binaryPath = await getEventKitTool();
  const startFormatted = formatForEventKit(startDate);
  const endFormatted = formatForEventKit(endDate);

  console.log(`🔧 Using EventKit tool: ${binaryPath}`);
  console.log(`📅 Date range: ${startFormatted} to ${endFormatted}`);

  const proc = spawnSync(binaryPath, [startFormatted, endFormatted], {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 10,
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
    const emptyIcs = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:bun-calendar-export",
      "CALSCALE:GREGORIAN",
      "END:VCALENDAR",
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
    if (event.notes) description += `\n\nNotes: ${event.notes}`;

    const icsEvent: any = {
      title: event.title,
      description,
      uid: `${Date.now()}-${index}@bun-export`,
      start: event.isAllDay ? dateToIcsAllDayFormat(start) : dateToIcsFormat(start),
      end: event.isAllDay ? dateToIcsAllDayFormat(end) : dateToIcsFormat(end),
    };

    if (event.location) icsEvent.location = event.location;

    return { icsEvent, startDate: start, event };
  }).filter((item): item is { icsEvent: any; startDate: Date; event: CalendarEvent } => item !== null);

  const eventsByDay = new Map<string, Array<{ startDate: Date; event: CalendarEvent }>>();
  validEvents.forEach(({ startDate, event }) => {
    const dayKey = format(startDate, "yyyy-MM-dd");
    if (!eventsByDay.has(dayKey)) eventsByDay.set(dayKey, []);
    eventsByDay.get(dayKey)!.push({ startDate, event });
  });

  console.log("\n📅 Events by day:");
  Array.from(eventsByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dayKey, dayEvents]) => {
      const first = dayEvents[0];
      const label = format(first.startDate, "EEEE, MMMM d");
      console.log(`\n🗓️  ${label}`);
      for (const { startDate, event } of dayEvents) {
        const timeStr = event.isAllDay ? "All day" : format(startDate, "h:mm a");
        console.log(`   ✅ ${event.title} (${timeStr})`);
      }
    });

  const { error, value } = createEvents(validEvents.map(e => e.icsEvent));
  if (error || !value) throw new Error(`❌ Failed to create ICS: ${error}`);

  writeFileSync(outputPath, value);
  console.log(`\n✅ Calendar exported to ${outputPath}`);
  return outputPath;
}

export async function testEventKitTool(): Promise<void> {
  console.log("🧪 Testing EventKit tool...");
  try {
    const binaryPath = await getEventKitTool();
    const testDate = formatForEventKit(new Date());
    const proc = spawnSync(binaryPath, [testDate], {
      encoding: "utf-8",
      timeout: 10000,
    });

    if (proc.error) return void console.error("❌ Test failed:", proc.error);

    try {
      const result: CalendarExportResult = JSON.parse(proc.stdout);
      console.log(`📅 Date range: ${result.dateRange.start} to ${result.dateRange.end}`);
      console.log(`📊 Found ${result.totalCount} events`);
      result.events.slice(0, 3).forEach(e => {
        const timeStr = e.isAllDay ? "All day" : format(parseEventKitDate(e.startDate)!, "h:mm a");
        console.log(`  • ${e.title} (${e.calendar}) – ${timeStr}`);
      });
    } catch {
      console.log("Raw output:", proc.stdout);
    }

    if (proc.stderr) console.log("⚠️ Stderr:", proc.stderr);
  } catch (err) {
    console.error("❌ EventKit tool test failed:", err);
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--test")) testEventKitTool();
  else exportCalendarToICS();
}
