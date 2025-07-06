#!/bin/bash

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"


# Check if an interval argument is provided
if [ $# -ne 1 ]; then
  echo "Usage: $0 <interval>"
  echo "Examples: $0 1m (1 minute), $0 1h (1 hour), $0 1d (1 day)"
fi

if [ -z "$1" ]; then
  echo "Defaulting to 1 hour interval."
  INTERVAL="1h"
else
  INTERVAL="$1"
fi

# Convert interval to seconds for sleep command
case ${INTERVAL: -1} in
  s)
    SECONDS=${INTERVAL%?}
    ;;
  m)
    SECONDS=$((${INTERVAL%?} * 60))
    ;;
  h)
    SECONDS=$((${INTERVAL%?} * 3600))
    ;;
  d)
    SECONDS=$((${INTERVAL%?} * 86400))
    ;;
  *)
    echo "Invalid interval format. Use <number><unit> where unit is s (seconds), m (minutes), h (hours), or d (days)"
    exit 1
    ;;
esac

# Make the script executable
chmod +x "$(dirname "$0")/src/main.ts"

# Function to run the main.ts script
run_script() {
  bun run start
}

# Run once immediately
run_script

# Then run at the specified interval
while true; do
  sleep $SECONDS
  run_script
done