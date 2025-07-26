const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function restartDevServer() {
  try {
    console.log('🔄 Restarting development server...');
    
    // Kill any existing Next.js processes
    console.log('🛑 Stopping existing processes...');
    exec('pkill -f "next dev"', (error) => {
      if (error) {
        console.log('No existing Next.js processes found');
      } else {
        console.log('✅ Stopped existing processes');
      }
    });
    
    // Clear Next.js cache
    console.log('🧹 Clearing Next.js cache...');
    const cacheDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('✅ Cleared .next cache');
    }
    
    // Clear node_modules cache if needed
    console.log('🧹 Clearing node_modules cache...');
    exec('npm cache clean --force', (error) => {
      if (error) {
        console.log('⚠️ Could not clear npm cache:', error.message);
      } else {
        console.log('✅ Cleared npm cache');
      }
    });
    
    // Wait a moment for processes to stop
    setTimeout(() => {
      console.log('🚀 Starting development server...');
      console.log('💡 Run this command in a new terminal:');
      console.log('   npm run dev');
      console.log('');
      console.log('🎉 Development server should now work with updated schema!');
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error restarting server:', error);
  }
}

restartDevServer(); 