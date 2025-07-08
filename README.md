# iCal Share

A simple tool to export your macOS Calendar events to an ICS file and upload it to Cloudflare R2 storage, making it publicly accessible via a URL.

## Features

- Exports events from your macOS Calendar app
- Generates a standard ICS file compatible with most calendar applications
- Uploads the ICS file to Cloudflare R2 storage
- Provides a public URL for sharing your calendar
- Can run on a schedule to keep your shared calendar up-to-date

## Prerequisites

- macOS (requires access to the macOS Calendar app)
- [Bun](https://bun.sh/) runtime (v1.2.17 or later)
- Xcode Command Line Tools (for Swift compilation)
- Cloudflare R2 storage account

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/ical-share.git
   cd ical-share
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Build the Swift calendar export tool:
   ```bash
   ./build.sh
   ```

4. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

5. Configure your `.env` file with the following values:
   ```
   # Cloudflare R2 Configuration
   R2_ACCOUNT_ID=your-r2-account-id
   R2_ACCESS_KEY_ID=your-r2-access-key
   R2_SECRET_ACCESS_KEY=your-r2-secret-key
   R2_BUCKET_NAME=your-bucket-name
   R2_PUBLIC_URL=https://your-public-url.example.com
   
   # Calendar Configuration
   CALENDAR_PERMA_KEY=your-custom-calendar-identifier
   ```

   The `CALENDAR_PERMA_KEY` is a custom identifier that will be used in the URL for your calendar (e.g., `your-custom-calendar-identifier.ics`).

6. Grant calendar access permissions when prompted during the first run.

## Usage

### One-time Export

To export your calendar once and upload it:

```bash
bun start
```

This will:
1. Export events from your macOS Calendar for the current week
2. Generate an ICS file (`shared.ics`)
3. Upload the file to your R2 bucket
4. Display the public URL for sharing

### Scheduled Export

To run the export on a schedule, use the `run.sh` script with an interval parameter:

```bash
./run.sh 1h  # Run every hour
```

Supported interval formats:
- `s` for seconds (e.g., `30s`)
- `m` for minutes (e.g., `15m`)
- `1h` for hours (e.g., `1h`)
- `1d` for days (e.g., `1d`)

The script will run immediately and then at the specified interval until stopped.

## Testing

To test the calendar export tool without uploading:

```bash
./build.sh test
```

Or using the TypeScript interface:

```bash
bun run src/calendar-export.ts --test
```

## Troubleshooting

### Calendar Access

If you encounter permission issues:
1. Go to System Preferences > Security & Privacy > Privacy > Calendars
2. Ensure that Terminal (or your IDE) has permission to access your calendars

### Build Issues

If the Swift build fails:
1. Make sure Xcode Command Line Tools are installed: `xcode-select --install`
2. Try rebuilding with: `./build.sh rebuild`

### Upload Issues

If uploads fail:
1. Verify your R2 credentials in the `.env` file
2. Check that your bucket exists and has the correct permissions
3. Ensure your R2 public URL is correctly configured

## License

MIT