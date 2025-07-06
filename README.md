# Calendar Sharing Tool

A simple utility to export macOS Calendar events to an ICS file and upload it to a shareable URL using UploadThing.

## Features

- Exports events from the macOS Calendar app for the current week
- Converts calendar events to standard ICS format
- Uploads the ICS file to UploadThing with a permanent URL
- Provides a shareable link that can be imported into other calendar applications

## Prerequisites

- macOS (required for Calendar app access)
- [Bun](https://bun.sh/) JavaScript runtime
- UploadThing account and API credentials

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   bun install
   ```
3. Copy the example environment file and fill in your credentials:
   ```
   cp .env.example .env
   ```

## Environment Variables

Create a `.env` file with the following variables:

```
UPLOADTHING_TOKEN=your_uploadthing_api_token
UPLOADTHING_APP_ID=your_uploadthing_app_id
CALENDAR_PERMA_KEY=your_custom_permanent_key_for_the_file
```

## Usage

### Running Manually

Run the application:

```
bun start
```

The script will:
1. Export events from your macOS Calendar for the current week
2. Generate an ICS file (`shared.ics`)
3. Upload the file to UploadThing
4. Output a shareable URL that can be used to import the calendar

### Running in the Background

To run the application in the background and have it start automatically on system boot:

1. Create a launch agent plist file:

```
mkdir -p ~/Library/LaunchAgents
```

2. Create a file named `dev.rodpa.ical-share.plist` in the LaunchAgents directory with the following content (adjust paths as needed):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>dev.rodpa.ical-share</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/bun</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/ical-share</string>
    <key>RunAtLoad</key>
    <true/>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>StandardOutPath</key>
    <string>/tmp/ical-share.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ical-share.err</string>
</dict>
</plist>
```

3. Load the launch agent:

```
launchctl load ~/Library/LaunchAgents/dev.rodpa.ical-share.plist
```

This will run the script once per hour (3600 seconds) and also at system startup.

## How It Works

1. The `dump_events.applescript` script queries the macOS Calendar app for events
2. The `calendar-export.ts` module processes these events and creates an ICS file
3. The `upload.ts` module uploads the ICS file to UploadThing with a permanent ID
4. The main script coordinates these operations and outputs the shareable URL

## License

This project is privately maintained.