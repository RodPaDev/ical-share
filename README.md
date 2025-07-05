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

Run the application:

```
bun start
```

The script will:
1. Export events from your macOS Calendar for the current week
2. Generate an ICS file (`shared.ics`)
3. Upload the file to UploadThing
4. Output a shareable URL that can be used to import the calendar

## How It Works

1. The `dump_events.applescript` script queries the macOS Calendar app for events
2. The `calendar-export.ts` module processes these events and creates an ICS file
3. The `upload.ts` module uploads the ICS file to UploadThing with a permanent ID
4. The main script coordinates these operations and outputs the shareable URL

## License

This project is privately maintained.