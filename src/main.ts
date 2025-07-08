import { exportCalendarToICS } from "./calendar-export.js";
import { uploadICS } from "./upload.js";
import dotenv from "dotenv";
dotenv.config();

const CALENDAR_PERMA_KEY = process.env.CALENDAR_PERMA_KEY;
if (!CALENDAR_PERMA_KEY) {
  console.error("❌ CALENDAR_PERMA_KEY is not set in .env");
  process.exit(1);
}

const FILE_PATH = "./shared.ics";

async function main() {
  try {
    const path = await exportCalendarToICS(FILE_PATH);
    const url = await uploadICS(path, CALENDAR_PERMA_KEY);
    console.log("✅ ICS file uploaded successfully!");
    console.log("🌐 Public URL:", url);
  } catch (err) {
    console.error("❌ Failed:", err);
    process.exit(1);
  }
}

main();
