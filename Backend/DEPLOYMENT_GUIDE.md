# Task Planner – AWS Deployment Guide

## Architecture Overview

```
Browser (todo_aws.html)
       │
       ▼
API Gateway (HTTP API)
   ├── POST /send-otp
   ├── POST /verify-otp
   ├── POST /signup
   ├── POST /login
   ├── POST /tasks
   └── OPTIONS /{proxy+}   ← CORS preflight
       │
       ▼
  Lambda (index.mjs, Node.js 20.x)
   ├── DynamoDB  →  table: todo-users
   └── SES       →  sends OTP emails
```

---

## Step 1 — DynamoDB Table

1. Go to **AWS Console → DynamoDB → Create table**
2. Table name: `todo-users`
3. Partition key: `prn` (String)
4. Leave everything else as default (On-demand billing is fine)
5. Click **Create table**

---

## Step 2 — SES (Email for OTPs)

> Skip this if you want to test without OTP first.

1. Go to **AWS Console → SES → Verified identities → Create identity**
2. Choose **Email address**, enter `noreply@yourdomain.com` (or any email you own)
3. Click the verification link sent to that inbox
4. **If still in SES Sandbox**: also verify each recipient email the same way,
   OR request production access via **SES → Account dashboard → Request production access**

---

## Step 3 — Lambda Function

### 3a. Create the function
1. Go to **AWS Console → Lambda → Create function**
2. Name: `todo-planner`
3. Runtime: **Node.js 20.x**
4. Architecture: `x86_64`
5. Click **Create function**

### 3b. Upload the code
Option A – paste in the console:
- Click the **Code** tab → open `index.mjs` → paste the contents of `lambda/index.mjs`
- Click **Deploy**

Option B – zip upload:
```bash
cd lambda
zip function.zip index.mjs
# Upload via Console → Code → Upload from → .zip file
```

### 3c. Set environment variable
- In Lambda → **Configuration → Environment variables → Edit**
- Add: `SENDER_EMAIL` = `noreply@yourdomain.com` (your SES-verified address)

### 3d. Attach IAM permissions
- In Lambda → **Configuration → Permissions → click the execution role**
- In IAM, click **Add permissions → Attach policies**
- Attach: `AmazonDynamoDBFullAccess`
- Attach: `AmazonSESFullAccess`

### 3e. Increase timeout
- Lambda → **Configuration → General configuration → Edit**
- Set timeout to **15 seconds** (default 3s is too short for SES calls)

---

## Step 4 — API Gateway

1. Go to **AWS Console → API Gateway → Create API**
2. Choose **HTTP API** (not REST API) → click **Build**
3. Click **Add integration** → select **Lambda** → choose `todo-planner`
4. API name: `todo-planner-api`
5. Click **Next**

### 4a. Add routes
Click **Add route** for each:

| Method | Path          |
|--------|---------------|
| POST   | /send-otp     |
| POST   | /verify-otp   |
| POST   | /signup       |
| POST   | /login        |
| POST   | /tasks        |
| ANY    | /{proxy+}     |  ← handles OPTIONS/CORS preflight

Set integration for **all routes** → Lambda → `todo-planner`

### 4b. CORS settings
- In API Gateway → **CORS**
- Allow origins: `*`
- Allow headers: `Content-Type`
- Allow methods: `POST, OPTIONS`
- Click **Save**

### 4c. Deploy
- Click **Next → Next → Create**
- Your API URL will look like:
  `https://abc123xyz.execute-api.ap-south-1.amazonaws.com`

---

## Step 5 — Update the HTML

Open `todo_aws.html` and replace line 203:

```js
// BEFORE
const API = 'https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com';

// AFTER
const API = 'https://abc123xyz.execute-api.ap-south-1.amazonaws.com';
```

Save and open the HTML in any browser — it's a static file, no hosting needed.

---

## Step 6 — Test

1. Open `todo_aws.html` in browser
2. Click **Sign Up**
3. Fill name, PRN, password, email
4. Click **Send OTP** → check inbox → enter the 6-digit code
5. Click **Create Account**
6. Add some tasks — watch the **✓ Synced** badge confirm AWS sync

---

## Common Errors

| Error | Fix |
|-------|-----|
| `Network error — check your API URL` | Wrong or missing `API` constant in HTML |
| `OTP sent` but no email | SES identity not verified; check SES sandbox restrictions |
| `Internal Server Error` from Lambda | Check **CloudWatch → Log groups → /aws/lambda/todo-planner** |
| CORS error in browser console | Re-check API Gateway CORS settings; redeploy the API |
| `Unauthorized` on tasks | Password mismatch; clear localStorage and re-login |

---

## Security Notes (before sharing publicly)

- [ ] Hash passwords with `bcrypt` before storing in DynamoDB
- [ ] Delete OTP record from DynamoDB after successful verification
- [ ] Add rate limiting in API Gateway to prevent OTP spam
- [ ] Restrict CORS `Allow-Origin` to your domain instead of `*`
