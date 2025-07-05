import { spawnSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { startOfWeek, endOfWeek, format, parseISO, isValid } from "date-fns";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function formatForAppleScript(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateToICS(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function parseAppleScriptDate(dateStr: string): Date | null {
  if (dateStr.includes('T')) {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  }
  const cleaned = dateStr.replace(/^[A-Za-z]+,\s*/, '').replace(' at ', ' ');
  const date = new Date(cleaned);
  return isValid(date) ? date : null;
}

export function exportCalendarToICS(outputPath = "./shared.ics"): string {
  const scriptPath = resolve(__dirname, "dump_events.applescript");
  const now = new Date();
  const startDate = startOfWeek(now, { weekStartsOn: 1 });
  const endDate = endOfWeek(now, { weekStartsOn: 1 });
  const startApple = formatForAppleScript(startDate);
  const endApple = formatForAppleScript(endDate);

  console.log("🔍 Running calendar export script...");
  console.log(`📅 Fetching events for week: ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`);

  const proc = spawnSync("osascript", [scriptPath, startApple], { 
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 10 
  });

  if (proc.error) {
    console.error("❌ Error running script:", proc.error);
    throw proc.error;
  }
  if (proc.stderr) {
    console.error("⚠️ Script stderr:", proc.stderr);
  }

  const outputParts = proc.stdout.split("=== EVENTS ===");
  const eventData = outputParts.length > 1 ? outputParts[1].trim() : proc.stdout.trim();
  const lines = eventData.split("\n").filter(line => line.trim());

  if (lines.length === 0) {
    console.warn("⚠️ No events found in the output");
    console.log("💡 Possible reasons:");
    console.log("   - No events in the current week");
    console.log("   - Calendar app permissions not granted");
    console.log("   - No calendars configured");
    return outputPath;
  }

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:bun-calendar-export",
    "CALSCALE:GREGORIAN",
  ];

  let eventCount = 0;
  for (const line of lines) {
    if (!line.trim() || !line.includes("||")) continue;
    const parts = line.split("||");
    if (parts.length !== 4) continue;
    const [calName, title, startStr, endStr] = parts;
    const start = parseAppleScriptDate(startStr.trim());
    const end = parseAppleScriptDate(endStr.trim());
    if (!start || !end) continue;
    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`SUMMARY:${title.trim()}`);
    icsLines.push(`DTSTART:${formatDateToICS(start)}`);
    icsLines.push(`DTEND:${formatDateToICS(end)}`);
    icsLines.push(`DESCRIPTION:Calendar: ${calName.trim()}`);
    icsLines.push(`UID:${Date.now()}-${eventCount}@bun-export`);
    icsLines.push("END:VEVENT");
    eventCount++;
    console.log(`✅ Added event: ${title.trim()} (${format(start, 'MMM d, h:mm a')})`);
  }

  icsLines.push("END:VCALENDAR");
  writeFileSync(outputPath, icsLines.join("\r\n"));
  console.log(`\n✅ Calendar exported to ${outputPath}`);
  console.log(`📊 Total events exported: ${eventCount}`);
  return outputPath;
}

if (import.meta.main) {
  exportCalendarToICS();
}
