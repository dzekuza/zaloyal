#!/bin/bash

echo "🔄 Restarting development server..."

# Kill any existing Next.js processes
pkill -f "next dev" || true
pkill -f "npm run dev" || true
pkill -f "pnpm dev" || true

# Wait a moment for processes to stop
sleep 2

echo "🧹 Clearing Next.js cache..."
rm -rf .next || true

echo "📦 Installing dependencies..."
npm install || pnpm install

echo "🚀 Starting development server..."
npm run dev || pnpm dev 