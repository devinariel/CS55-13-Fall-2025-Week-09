# How to Fix Gemini API Key Configuration

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey) or [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or "Get API Key"
4. Copy your API key (it will look like: `AIzaSy...`)

## Step 2: Set the Secret in Firebase Cloud Secret Manager

### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **the-therapy-compass**
3. Navigate to **App Hosting** in the left sidebar
4. Click on **Secrets** tab
5. Click **Add Secret** or **Create Secret**
6. Enter:
   - **Secret name**: `GEMINI_API_KEY` (must match exactly)
   - **Secret value**: Paste your Gemini API key
7. Click **Save** or **Create**

### Option B: Using Google Cloud Console (Alternative)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **the-therapy-compass**
3. Navigate to **Secret Manager** (search in the top bar)
4. Click **CREATE SECRET**
5. Enter:
   - **Name**: `GEMINI_API_KEY`
   - **Secret value**: Paste your Gemini API key
6. Click **CREATE SECRET**

### Option C: Using Firebase CLI (Command Line)

Run this command in your terminal (it will prompt you to enter the API key):

```bash
node ./node_modules/firebase-tools/lib/bin/firebase.js apphosting:secrets:set GEMINI_API_KEY
```

When prompted, paste your Gemini API key and press Enter.

Alternatively, you can pipe the key directly:

```bash
echo -n "YOUR_GEMINI_API_KEY_HERE" | node ./node_modules/firebase-tools/lib/bin/firebase.js apphosting:secrets:set GEMINI_API_KEY --data-file=-
```

### Option D: Using gcloud CLI (if installed)

```bash
echo -n "YOUR_GEMINI_API_KEY_HERE" | gcloud secrets create GEMINI_API_KEY --data-file=- --project=the-therapy-compass
```

## Step 3: Verify the Secret is Set

### Using Firebase CLI:
```bash
node ./node_modules/firebase-tools/lib/bin/firebase.js apphosting:secrets:describe GEMINI_API_KEY
```

### Using Firebase Console:
1. Go to Firebase Console → App Hosting → Secrets
2. You should see `GEMINI_API_KEY` in the list

### Using Google Cloud Console:
1. Go to Google Cloud Console → Secret Manager
2. You should see `GEMINI_API_KEY` in the list

## Step 4: Redeploy Your Application

After setting the secret, you need to redeploy your application for the changes to take effect:

```bash
node ./node_modules/firebase-tools/lib/bin/firebase.js deploy --only apphosting
```

Or if you're using GitHub integration, push a new commit to trigger a redeploy.

## Step 5: Verify It's Working

1. Visit your deployed application
2. Navigate to a clinician's detail page
3. Check if the AI-generated summary appears instead of the fallback message

## Troubleshooting

- **If the secret still doesn't work**: Make sure you're setting it in the correct Firebase project
- **Check project ID**: Verify you're using the right project with `node ./node_modules/firebase-tools/lib/bin/firebase.js projects:list`
- **Verify secret name**: The secret must be named exactly `GEMINI_API_KEY` (matching `apphosting.yaml`)
- **Wait for deployment**: Secrets are only available after a new deployment

## Alternative: Set Secret via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to "App Hosting" → "Secrets"
4. Click "Add Secret"
5. Name: `GEMINI_API_KEY`
6. Value: Your Gemini API key
7. Click "Save"
8. Redeploy your app

