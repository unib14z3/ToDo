# Task Planner

A lightweight cloud-synced task planner with email OTP signup, PRN-based authentication, and AWS-backed persistence.

## Project Overview

This project includes:

- `index.html` — static frontend UI for signup, login, task creation, and task management
- `Backend/index.mjs` — AWS Lambda handler for signup, login, OTP delivery, and task sync
- `Backend/DEPLOYMENT_GUIDE.md` — deployment instructions for AWS API Gateway, Lambda, DynamoDB, and SES

The app is designed as a browser-first task planner that stores user accounts and tasks in DynamoDB and uses AWS SES for OTP email verification.

## Features

- Email OTP verification during signup
- Login with PRN and password
- Add, complete, and delete tasks
- Task priority and estimated hours
- Cloud sync to AWS via API Gateway + Lambda
- Progress bar and task stats

## Architecture

- Frontend: static HTML/CSS/JavaScript in `index.html`
- Backend: AWS Lambda in `Backend/index.mjs`
- Database: DynamoDB table `todo-users`
- Email service: AWS SES for OTP emails
- API layer: API Gateway HTTP API routes

## Files

- `index.html` — complete single-page frontend
- `Backend/index.mjs` — Lambda handler using AWS SDK v3
- `Backend/DEPLOYMENT_GUIDE.md` — deployment and AWS configuration guide

## Setup

1. Open `index.html` in your browser to run the app as a static frontend.
2. Configure the backend API endpoint by updating the `API` constant near the top of `index.html`.

```js
const API = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com';
```

3. Deploy the backend following `Backend/DEPLOYMENT_GUIDE.md`.

## AWS Backend Requirements

- DynamoDB table: `todo-users`
- Lambda runtime: Node.js 20.x
- Environment variable: `SENDER_EMAIL` set to a verified SES sender address
- SES identity verification for the sender email (and recipient email if the account is in sandbox mode)

## Usage

1. Open the app in a browser.
2. Choose **Sign Up** to create an account.
3. Enter name, PRN, password, and email.
4. Send OTP and verify the code.
5. Create your account and start adding tasks.
6. Use **Login** to sign in after account creation.

## Notes

- The current frontend uses a hard-coded AWS API URL in `index.html`.
- Passwords are stored in plaintext in DynamoDB in the current implementation. For production use, add password hashing.
- Task sync is triggered automatically on create, update, and delete.

## Security Considerations

- Hash passwords before storing them in production.
- Remove OTP records after successful verification.
- Restrict CORS origins to your trusted domain instead of `*`.
- Add rate limiting to the OTP endpoint to prevent abuse.

## License

This repository does not include a specific license file.
