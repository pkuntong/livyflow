#!/bin/bash

set -e

echo "🚀 Starting Vercel build process..."

# Clean up any existing build artifacts
echo "🧹 Cleaning up previous builds..."
rm -rf dist node_modules/.vite

# Ensure we're using the correct Node.js version
echo "📦 Checking Node.js version..."
node --version
npm --version

# Install dependencies with clean slate
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

# Debug Vite installation
echo "🔍 Debugging Vite installation..."
npm run debug:vite

# Build the application
echo "🏗️ Building application..."
npm run build:vercel

echo "✅ Build completed successfully!"
