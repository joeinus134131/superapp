#!/bin/bash

# SuperApp Mobile - Quick Start Script
# Run this to start the app immediately

echo "🚀 SuperApp Mobile - Starting..."
echo ""

# Go to mobile directory
cd /Users/user/superapp/packages/mobile

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies... (this may take 2-3 minutes)"
    npm install --legacy-peer-deps
fi

echo ""
echo "✅ Dependencies ready!"
echo ""
echo "🎯 Choose what to do:"
echo ""
echo "  1. Start dev server:"
echo "     npm start"
echo ""
echo "  2. Run on Android emulator:"
echo "     npm run android"
echo ""
echo "  3. Run on physical device:"
echo "     1. Install Expo Go from Play Store"
echo "     2. Run: npm start"
echo "     3. Scan QR code with Expo Go"
echo ""
echo "🌐 Or open in web browser:"
echo "     npm run web"
echo ""
echo "📱 Ready to go! 🎉"
