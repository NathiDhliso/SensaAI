# Quick Start: Deploy to AWS

## TL;DR - Deploy in 3 Steps

### Step 1: Deploy Backend (5-10 minutes)

```powershell
# Install EB CLI (if not installed)
pip install awsebcli

# Run deployment script
.\DEPLOY_BACKEND.ps1
```

**Copy the backend URL** that appears at the end (e.g., `http://sensapbl-backend-prod.us-east-1.elasticbeanstalk.com`)

### Step 2: Set Amplify Environment Variables (2 minutes)

1. Go to: https://console.aws.amazon.com/amplify/
2. Select your app → **App settings** → **Environment variables**
3. Click **Manage variables**
4. Add this variable:
   ```
   VITE_API_URL = http://YOUR-BACKEND-URL-FROM-STEP-1/api/v1
   ```
5. Also add these (copy from your `.env` file):
   ```
   VITE_AWS_REGION
   VITE_COGNITO_USER_POOL_ID
   VITE_COGNITO_CLIENT_ID
   VITE_COGNITO_DOMAIN
   VITE_COGNITO_IDENTITY_POOL_ID
   VITE_COGNITO_REDIRECT_URI (use your Amplify URL)
   VITE_AWS_S3_BUCKET_NAME
   VITE_AWS_DYNAMODB_TABLE_NAME
   VITE_GYM_AI_URL
   ```
6. Save → Amplify will auto-redeploy

### Step 3: Update Backend CORS (1 minute)

```powershell
cd backend
eb setenv CORS_ORIGINS=https://YOUR-AMPLIFY-URL.amplifyapp.com
```

Replace `YOUR-AMPLIFY-URL` with your actual Amplify URL (e.g., `https://main.dckqci84h8ffk.amplifyapp.com`)

## Done! 🎉

Your app should now work on Amplify with authentication.

Test it:
1. Go to your Amplify URL
2. Try logging in
3. If you see errors, check the browser console

## Troubleshooting

**404 on login:**
- Check VITE_API_URL is set correctly in Amplify
- Verify backend is running: `curl http://YOUR-BACKEND-URL/health`

**CORS errors:**
- Update CORS_ORIGINS in backend to include your Amplify URL
- Make sure there are no trailing slashes

**Build fails:**
- Check Amplify build logs in console
- Verify all environment variables are set

## Need More Details?

See `DEPLOYMENT_GUIDE.md` for comprehensive instructions.

## Cost Estimate

- **Backend (Elastic Beanstalk)**: ~$15/month (t3.small)
- **Frontend (Amplify)**: Free tier covers most usage
- **Total**: ~$15-20/month

## Alternative: Local Development Only

If you don't want to deploy yet:

```powershell
# Terminal 1: Start backend
.\RESTART_BACKEND.ps1

# Terminal 2: Start frontend
npm run dev
```

Access at: http://localhost:5173
