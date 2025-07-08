# iCal Share

A simple utility to export macOS Calendar events to an ICS file and upload it to Cloudflare R2 storage, making it publicly accessible via a custom URL.

## Features

- Exports calendar events from macOS Calendar app using EventKit
- Converts events to standard ICS format
- Uploads the ICS file to Cloudflare R2 storage
- Provides a public URL for sharing your calendar
- Supports scheduled automatic updates via macOS LaunchAgent

## Requirements

- macOS (requires EventKit framework)
- [Bun](https://bun.sh/) runtime
- Xcode Command Line Tools (for Swift compilation)
- Cloudflare R2 storage account

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   bun install
   ```
3. Configure environment variables (see Configuration section below)
4. Build the project:
   ```
   bun run build
   ```

> ⚠️ Important: All environment variables accessed via process.env are inlined and baked into the compiled binary during bun build.
If you need to change secrets or configs, you must update .env and rebuild the binary.
> This is not ideal but I'll update it in the future if I see a need for it.

## Configuration

Copy the `.env.example` file to `.env` and fill in the required values:

```
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-public-url.com

# Calendar Configuration
CALENDAR_PERMA_KEY=your-custom-identifier
```

## Usage

### One-time Export

Run the script to export your calendar and upload it:

```
bun start
```

This will:
1. Export events from your macOS Calendar for the current week
2. Convert them to an ICS file
3. Upload the file to your R2 bucket
4. Output the public URL for sharing

### Scheduled Updates

To set up automatic calendar exports, use the included scheduler script:

```
bun run scripts/ical-scheduler.ts --interval 1h
```

Options:
- `--interval <duration>`: How often to run the export (e.g., 30m, 1h, 1d, 1w)
- `--label <name>`: Custom LaunchAgent label (default: com.ical-share)
- `--binary <path>`: Path to the compiled binary

After creating the LaunchAgent, load it with:

```
launchctl load ~/Library/LaunchAgents/com.ical-share.plist
```

## How It Works

1. The Swift component (`calendar-interop.swift`) uses EventKit to access your macOS Calendar events
2. The TypeScript code exports these events to an ICS file using the `ics` library
3. The file is uploaded to Cloudflare R2 using the AWS S3 SDK
4. The public URL is generated based on your R2 configuration

## License

MIT