#!/bin/bash

echo "🔍 Getting Supabase project URL for Twitter OAuth callback..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    exit 1
fi

# Extract Supabase URL from environment
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2)

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local"
    exit 1
fi

echo "✅ Found Supabase URL: $SUPABASE_URL"

# Extract project reference
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')

echo ""
echo "📋 Twitter OAuth Callback URLs to add to your Twitter app:"
echo ""
echo "1. Supabase callback:"
echo "   https://$PROJECT_REF.supabase.co/auth/v1/callback"
echo ""
echo "2. Local development callback:"
echo "   http://localhost:3000/auth/callback/supabase"
echo ""
echo "📝 Instructions:"
echo "1. Go to https://developer.twitter.com/en/portal/dashboard"
echo "2. Select your app"
echo "3. Go to 'App settings' → 'Authentication settings'"
echo "4. Add both callback URLs above"
echo "5. Make sure 'App permissions' is set to 'Read and Write'"
echo "6. Save changes"
echo ""
echo "After updating your Twitter app, restart your dev server:"
echo "   ./scripts/restart-dev.sh" 