#!/bin/bash

echo "🚀 Building LivyFlow for production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Frontend build completed successfully!"
    echo "📁 Build output: dist/"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Deploy the 'dist/' folder to your hosting platform"
    echo "2. Set up your backend with the production environment variables"
    echo "3. Update your domain in the CORS settings"
else
    echo "❌ Frontend build failed!"
    exit 1
fi 