import { exportCalendarToICS } from "./calendar-export";
import { uploadICS } from "./upload";
import dotenv from "dotenv";
dotenv.config();

const CALENDAR_PERMA_KEY = process.env.CALENDAR_PERMA_KEY
if (!CALENDAR_PERMA_KEY) {
  console.error("❌ CALENDAR_PERMA_KEY is not set in .env");
  process.exit(1);
}

const APP_ID = process.env.UPLOADTHING_APP_ID;
if (!APP_ID) {
  console.error("❌ UPLOADTHING_APP_ID is not set in .env");
  process.exit(1);
}
const FILE_PATH = "./shared.ics";

async function main() {
  try {
    // const path = exportCalendarToICS(FILE_PATH);
    await uploadICS( "./shared.ics", CALENDAR_PERMA_KEY!);
    console.log("📎 File URL:", `https://${APP_ID}.ufs.sh/f/${CALENDAR_PERMA_KEY}`)
  } catch (err) {
    console.error("❌ Failed:", err);
    process.exit(1);
  }
}

main();
