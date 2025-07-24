// Simple test to check if the task exists
// Run this with: node scripts/test-task-exists.js

const taskId = "6a8ee021-e184-4664-87d2-c21e5eaef53a";

console.log('🔍 Testing if task exists:', taskId);

// This is just a simple test - you can run this to see if the task ID is valid
console.log('Task ID format check:');
console.log('- Length:', taskId.length);
console.log('- Format:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId) ? 'Valid UUID' : 'Invalid UUID');

console.log('\nTo check if the task exists in your database, you can:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to the "tasks" table');
console.log('3. Search for the task ID:', taskId);
console.log('4. Check if the task exists and what its data looks like');

console.log('\nIf the task doesn\'t exist, that would explain the 404 error.');
console.log('If it does exist, the issue might be with the Twitter API calls.'); 