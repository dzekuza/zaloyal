#!/bin/bash

echo "🔍 Checking environment variables for OAuth configuration..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local in the root directory"
    exit 1
fi

echo "✅ .env.local file found"

# Check required Supabase variables
echo ""
echo "📋 Checking Supabase configuration..."

if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo "✅ NEXT_PUBLIC_SUPABASE_URL is set"
else
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is missing"
fi

if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
else
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
    echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
else
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is missing"
fi

# Check Twitter OAuth variables
echo ""
echo "🐦 Checking Twitter OAuth configuration..."

if grep -q "SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID" .env.local; then
    echo "✅ SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID is set"
else
    echo "❌ SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID is missing"
fi

if grep -q "SUPABASE_AUTH_EXTERNAL_TWITTER_SECRET" .env.local; then
    echo "✅ SUPABASE_AUTH_EXTERNAL_TWITTER_SECRET is set"
else
    echo "❌ SUPABASE_AUTH_EXTERNAL_TWITTER_SECRET is missing"
fi

# Check for conflicting variables
echo ""
echo "⚠️  Checking for conflicting variables..."

if grep -q "X_CLIENT_ID\|X_CLIENT_SECRET\|TWITTER_API_KEY\|TWITTER_API_SECRET" .env.local; then
    echo "❌ Found conflicting Twitter API variables!"
    echo "   Remove these from .env.local:"
    echo "   - X_CLIENT_ID"
    echo "   - X_CLIENT_SECRET" 
    echo "   - TWITTER_API_KEY"
    echo "   - TWITTER_API_SECRET"
    echo ""
    echo "   Use SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID and SUPABASE_AUTH_EXTERNAL_TWITTER_SECRET instead"
else
    echo "✅ No conflicting variables found"
fi

echo ""
echo "📝 Next steps:"
echo "1. If any variables are missing, add them to .env.local"
echo "2. Restart your development server: ./scripts/restart-dev.sh"
echo "3. Test OAuth configuration: http://localhost:3000/test-oauth"
echo "4. Try linking X account from profile page" 