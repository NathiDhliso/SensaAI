# Fix Stuck Generation at 5%

Your generation has been stuck at 5% for 20 minutes. Here are the solutions:

## Solution 1: Refresh the Page (Recommended)
1. Press `F5` or `Ctrl+R` to refresh the browser
2. The system will automatically reconnect to the active generation job
3. If the job is still running, it will resume showing progress
4. If the job failed, you'll see an error message

## Solution 2: Clear Stuck Job (If refresh doesn't work)
1. Open browser DevTools (Press `F12`)
2. Go to the **Console** tab
3. Type this command and press Enter:
   ```javascript
   window.clearStuckJob()
   ```
4. This will clear the stuck job and redirect you to the home page
5. You can then start a new generation

## Solution 3: Check Backend Logs
If the above doesn't work, check if the backend is having issues:

1. Open a new terminal
2. Navigate to the backend folder:
   ```powershell
   cd backend
   ```
3. Check if the backend is running:
   ```powershell
   npm run dev
   ```
4. Look for any error messages in the logs

## Solution 4: Restart Everything
If all else fails:

1. Stop the backend server (Ctrl+C in the backend terminal)
2. Stop the frontend server (Ctrl+C in the frontend terminal)
3. Restart the backend:
   ```powershell
   cd backend
   npm run dev
   ```
4. Restart the frontend:
   ```powershell
   npm run dev
   ```
5. Navigate to the generation page and try again

## Common Causes
- **Lambda cold start**: First request can take 30-60 seconds
- **Network timeout**: Check your internet connection
- **AWS credentials expired**: Check your `.env` files
- **DynamoDB throttling**: Too many concurrent requests

## Prevention
- Wait at least 2 minutes before assuming a generation is stuck
- Don't close the browser tab during generation
- Ensure stable internet connection
- Check AWS service status if issues persist
