#!/bin/bash

echo "🔍 Comprehensive OAuth Debug Script"
echo "=================================="

# Check environment variables
echo ""
echo "📋 Environment Variables Check:"
echo "-------------------------------"

if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    
    # Check Supabase variables
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2)
        echo "✅ NEXT_PUBLIC_SUPABASE_URL: $SUPABASE_URL"
    else
        echo "❌ NEXT_PUBLIC_SUPABASE_URL missing"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Set"
    else
        echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY missing"
    fi
    
    # Check Twitter OAuth variables
    if grep -q "SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID" .env.local; then
        TWITTER_CLIENT_ID=$(grep "SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID" .env.local | cut -d'=' -f2)
        echo "✅ SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID: ${TWITTER_CLIENT_ID:0:10}..."
    else
        echo "❌ SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID missing"
    fi
    
    if grep -q "SUPABASE_AUTH_EXTERNAL_TWITTER_SECRET" .env.local; then
        echo "✅ SUPABASE_AUTH_EXTERNAL_TWITTER_SECRET: Set"
    else
        echo "❌ SUPABASE_AUTH_EXTERNAL_TWITTER_SECRET missing"
    fi
else
    echo "❌ .env.local file not found"
fi

# Check for conflicting variables
echo ""
echo "⚠️  Conflicting Variables Check:"
echo "-------------------------------"

if grep -q "X_CLIENT_ID\|X_CLIENT_SECRET\|TWITTER_API_KEY\|TWITTER_API_SECRET" .env.local; then
    echo "❌ Found conflicting Twitter API variables:"
    grep -E "X_CLIENT_ID|X_CLIENT_SECRET|TWITTER_API_KEY|TWITTER_API_SECRET" .env.local
    echo ""
    echo "   Remove these and use SUPABASE_AUTH_EXTERNAL_TWITTER_* variables instead"
else
    echo "✅ No conflicting variables found"
fi

# Check Supabase config
echo ""
echo "🔧 Supabase Configuration Check:"
echo "-------------------------------"

if [ -f "supabase/config.toml" ]; then
    if grep -q "auth.external.twitter" supabase/config.toml; then
        echo "✅ Twitter OAuth configured in Supabase config"
    else
        echo "❌ Twitter OAuth not configured in Supabase config"
    fi
else
    echo "❌ supabase/config.toml not found"
fi

# Check if server is running
echo ""
echo "🌐 Server Status Check:"
echo "----------------------"

if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Development server is running"
else
    echo "❌ Development server is not running"
    echo "   Start it with: npm run dev"
fi

# Check test OAuth page
echo ""
echo "🧪 OAuth Test Page Check:"
echo "-------------------------"

if curl -s http://localhost:3000/test-oauth > /dev/null; then
    echo "✅ Test OAuth page is accessible"
else
    echo "❌ Test OAuth page is not accessible"
fi

echo ""
echo "📝 Next Steps:"
echo "=============="
echo ""
echo "1. **Check Twitter App Settings:**"
echo "   - Go to https://developer.twitter.com/en/portal/dashboard"
echo "   - Make sure 'App permissions' is set to 'Read and Write'"
echo "   - Make sure 'Type of App' is set to 'Web App, Automated App or Bot'"
echo "   - Verify callback URLs are exactly:"
echo "     * https://ghbaaexxytbvmbimmrkj.supabase.co/auth/v1/callback"
echo "     * http://localhost:3000/auth/callback/supabase"
echo ""
echo "2. **Check Supabase Dashboard:**"
echo "   - Go to your Supabase Dashboard"
echo "   - Navigate to Authentication → Providers"
echo "   - Make sure Twitter is enabled"
echo "   - Verify the API Key and Secret match your environment variables"
echo ""
echo "3. **Test OAuth Flow:**"
echo "   - Visit: http://localhost:3000/test-oauth"
echo "   - Check browser console for specific errors"
echo "   - Try linking X account from profile page"
echo ""
echo "4. **Common Issues:**"
echo "   - Twitter app might need elevated access"
echo "   - API keys might be incorrect"
echo "   - Callback URLs might have extra spaces or characters"
echo "   - Supabase Auth might not be properly configured"
echo ""
echo "5. **Debug Commands:**"
echo "   - Check environment: ./scripts/check-env.sh"
echo "   - Get callback URLs: ./scripts/get-supabase-url.sh"
echo "   - Restart server: ./scripts/restart-dev.sh" 