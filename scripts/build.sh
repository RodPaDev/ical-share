#!/bin/bash
set -euo pipefail

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/src"
SWIFT_FILE="$SRC_DIR/calendar-interop.swift"
BUILD_DIR="$SRC_DIR/build"
OUT_DIR="$SCRIPT_DIR/out"
BINARY_NAME="calendar-interop.bin"
TS_ENTRY="$SRC_DIR/main.ts"
TS_OUT="$OUT_DIR/ical-share"

# Ensure build & output directories exist
mkdir -p "$BUILD_DIR"
mkdir -p "$OUT_DIR"

echo "🔨 Building Swift calendar interop binary..."

# Check Swift compiler
if ! command -v swiftc &> /dev/null; then
    echo "❌ Swift compiler not found. Install via: xcode-select --install"
    exit 1
fi

# Compile Swift tool
swiftc -o "$BUILD_DIR/$BINARY_NAME" "$SWIFT_FILE" -framework EventKit -framework Foundation

# Copy binary to src for embedding in Bun executable
cp "$BUILD_DIR/$BINARY_NAME" "$SRC_DIR/$BINARY_NAME"

echo "📦 Moved Swift binary to $SRC_DIR/ for embedding"
echo "⚙️ Compiling Bun project..."
bun build "$TS_ENTRY" --compile --outfile "$TS_OUT"

# Ensure executables
chmod +x "$SRC_DIR/$BINARY_NAME"
chmod +x "$TS_OUT"

echo "✅ Build complete!"
echo "🚀 Run it with: $TS_OUT"
