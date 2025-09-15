#!/bin/bash

# Exit on error
set -e

# Log build start
echo "Starting Vercel build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building Angular SSR application..."
npm run build:ssr

# Verify build output
echo "Verifying build output..."
if [ ! -d "dist/excel-analytics" ]; then
    echo "Error: Build output directory not found"
    exit 1
fi

if [ ! -f "dist/excel-analytics/server/server.mjs" ]; then
    echo "Error: Server file not found"
    exit 1
fi

if [ ! -d "dist/excel-analytics/browser" ]; then
    echo "Error: Browser assets not found"
    exit 1
fi

# Log success
echo "Build completed successfully!"