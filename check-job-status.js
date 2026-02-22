/**
 * Quick script to check the status of the current generation job
 * Run with: node check-job-status.js
 */

// This script helps diagnose stuck generations by checking:
// 1. LocalStorage for active jobs
// 2. Backend API for job status
// 3. DynamoDB for actual job state

console.log('='.repeat(60));
console.log('Generation Job Status Checker');
console.log('='.repeat(60));
console.log('');

console.log('To check your stuck generation:');
console.log('');
console.log('1. Open your browser DevTools (F12)');
console.log('2. Go to the Console tab');
console.log('3. Run these commands:');
console.log('');
console.log('   // Check localStorage for active job');
console.log('   JSON.parse(localStorage.getItem("chart-generator-storage"))');
console.log('');
console.log('   // Clear the stuck job');
console.log('   window.clearStuckJob()');
console.log('');
console.log('4. If you see an active job, note the jobId');
console.log('5. You can then check the backend logs for that jobId');
console.log('');
console.log('='.repeat(60));
console.log('');
console.log('Quick Actions:');
console.log('');
console.log('A. Refresh the page - it should reconnect automatically');
console.log('B. Run window.clearStuckJob() in console to clear and restart');
console.log('C. Check backend terminal for error messages');
console.log('');
console.log('='.repeat(60));
