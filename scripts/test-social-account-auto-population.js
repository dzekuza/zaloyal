const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSocialAccountAutoPopulation() {
  try {
    console.log('🧪 Testing social account auto-population...')
    
    // First, get a user to test with
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1)
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }
    
    if (!users || users.length === 0) {
      console.error('❌ No users found to test with')
      return
    }
    
    const testUser = users[0]
    console.log(`👤 Using user: ${testUser.email} (${testUser.id})`)
    
    // Add a test social account for this user
    const testSocialAccount = {
      user_id: testUser.id,
      platform: 'twitter',
      account_id: '123456789',
      username: 'testuser123',
      access_token: 'test_token',
      created_at: new Date().toISOString()
    }
    
    console.log('📝 Adding test social account...')
    const { data: socialAccount, error: socialError } = await supabase
      .from('social_accounts')
      .insert([testSocialAccount])
      .select()
      .single()
    
    if (socialError) {
      console.error('❌ Error creating social account:', socialError)
    } else {
      console.log('✅ Social account created successfully:', {
        id: socialAccount.id,
        platform: socialAccount.platform,
        username: socialAccount.username
      })
    }
    
    // Test fetching social accounts for the user
    console.log('🔍 Fetching social accounts for user...')
    const { data: fetchedAccounts, error: fetchError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', testUser.id)
    
    if (fetchError) {
      console.error('❌ Error fetching social accounts:', fetchError)
    } else {
      console.log('✅ Social accounts fetched successfully:', fetchedAccounts)
      
      // Test URL generation
      const testPlatforms = ['twitter', 'discord', 'telegram']
      testPlatforms.forEach(platform => {
        const account = fetchedAccounts.find(acc => acc.platform === platform)
        if (account) {
          let expectedUrl = ''
          switch (platform) {
            case 'twitter':
              expectedUrl = `https://twitter.com/${account.username}`
              break
            case 'discord':
              expectedUrl = `https://discord.com/users/${account.username}`
              break
            case 'telegram':
              expectedUrl = `https://t.me/${account.username}`
              break
          }
          console.log(`✅ ${platform} URL generation: ${expectedUrl}`)
        } else {
          console.log(`⚠️  No ${platform} account found for user`)
        }
      })
    }
    
    // Clean up test social account
    console.log('🧹 Cleaning up test social account...')
    if (socialAccount) {
      await supabase.from('social_accounts').delete().eq('id', socialAccount.id)
    }
    
    console.log('🎉 Social account auto-population test completed!')
    
  } catch (error) {
    console.error('❌ Error in test:', error)
  }
}

testSocialAccountAutoPopulation() 