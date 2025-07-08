#!/bin/bash

# Build script for EventKit calendar export tool

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/src"
SWIFT_FILE="$SCRIPT_DIR/calendar-export.swift"
BINARY_NAME="calendar-export"
BUILD_DIR="$SCRIPT_DIR/build"

# Create build directory
mkdir -p "$BUILD_DIR"

# Function to build the Swift binary
build_swift_tool() {
    echo "🔨 Building EventKit calendar export tool..."
    
    # Check if Swift is available
    if ! command -v swift &> /dev/null; then
        echo "❌ Swift compiler not found. Please install Xcode command line tools:"
        echo "   xcode-select --install"
        exit 1
    fi
    
    # Compile the Swift file
    swiftc -o "$BUILD_DIR/$BINARY_NAME" "$SWIFT_FILE" -framework EventKit -framework Foundation
    
    if [ $? -eq 0 ]; then
        echo "✅ Build successful! Binary created at: $BUILD_DIR/$BINARY_NAME"
        
        # Make it executable
        chmod +x "$BUILD_DIR/$BINARY_NAME"
    else
        echo "❌ Build failed!"
        exit 1
    fi
}

# Function to clean build artifacts
clean_build() {
    echo "🧹 Cleaning build artifacts..."
    rm -rf "$BUILD_DIR"
    rm -f "$SCRIPT_DIR/$BINARY_NAME"
    echo "✅ Clean complete!"
}

# Function to test the binary
test_binary() {
    if [ ! -f "$BUILD_DIR/$BINARY_NAME" ]; then
        echo "❌ Binary not found. Please build first."
        exit 1
    fi
    
    echo "🧪 Testing calendar export tool..."
    
    # Test with current date
    START_DATE=$(date "+%m/%d/%Y %H:%M:%S")
    echo "Testing with date: $START_DATE"
    
    "$BUILD_DIR/$BINARY_NAME" "$START_DATE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Test completed successfully!"
    else
        echo "❌ Test failed!"
        exit 1
    fi
}

# Main script logic
case "${1:-build}" in
    "build")
        build_swift_tool
        ;;
    "clean")
        clean_build
        ;;
    "test")
        test_binary
        ;;
    "rebuild")
        clean_build
        build_swift_tool
        ;;
    *)
        echo "Usage: $0 [build|clean|test|rebuild]"
        echo "  build   - Build the Swift binary (default)"
        echo "  clean   - Clean build artifacts"
        echo "  test    - Test the built binary"
        echo "  rebuild - Clean and rebuild"
        exit 1
        ;;
esac