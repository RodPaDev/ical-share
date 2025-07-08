#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

// === Helpers ===
function parseInterval(input: string): number {
  const match = /^(\d+)([smhdw])$/.exec(input.trim());
  if (!match) {
    throw new Error("Invalid time format. Use like: 30m, 2h, 1d, 7w");
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };

  return value * multipliers[unit];
}

// === CLI ===
const program = new Command();
program
  .name("ical-scheduler")
  .description("Generate a LaunchAgent plist for ical-share")
  .option("-i, --interval <duration>", "Repeat interval (e.g. 1h, 30m, 2d)", "1h")
  .option("-l, --label <name>", "LaunchAgent label", "com.ical-share")
  .option("-b, --binary <path>", "Path to compiled binary", resolve("out/ical-share"))
  .parse(process.argv);

const opts = program.opts();

let intervalSec: number;
try {
  // log how 
  intervalSec = parseInterval(opts.interval);
} catch (err) {
  console.error(chalk.red(`❌ ${err.message}`));
  process.exit(1);
}

if (!existsSync(opts.binary)) {
  console.error(chalk.red(`❌ Binary not found at: ${opts.binary}`));
  process.exit(1);
}

const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${opts.label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${opts.binary}</string>
  </array>
  <key>StartInterval</key>
  <integer>${intervalSec}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/ical-share.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/ical-share.err</string>
</dict>
</plist>`;

const plistDir = resolve(homedir(), "Library/LaunchAgents");
const plistPath = resolve(plistDir, `${opts.label}.plist`);

if (!existsSync(plistDir)) mkdirSync(plistDir, { recursive: true });
writeFileSync(plistPath, plistContent);

// log how often the task will run
console.log(chalk.blue(`🔄 Task will run every ${opts.interval}`));
console.log(chalk.green("✅ LaunchAgent plist created!"));
console.log(chalk.cyan(`📝 Path: ${plistPath}`));
console.log("");
console.log(chalk.gray("ℹ️ Next steps:"));
console.log(`   ${chalk.yellow("launchctl load")} ${plistPath}`);
console.log(`   ${chalk.yellow("launchctl unload")} ${plistPath}`);
console.log(`   ${chalk.yellow("launchctl start")} ${opts.label}`);
console.log(`   ${chalk.yellow("launchctl stop")} ${opts.label}`);
console.log(`   ${chalk.yellow("launchctl list | grep")} ${opts.label}`);
