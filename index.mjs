import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const db  = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({ region: "ap-south-1" });

const TABLE        = "todo-users";
const SENDER_EMAIL = process.env.SENDER_EMAIL; // set in Lambda env vars

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

const resp = (code, body) => ({
  statusCode: code,
  headers: CORS,
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path   = event.rawPath || event.path;
  const body   = event.body ? JSON.parse(event.body) : {};

  if (method === "OPTIONS") return resp(200, {});

  // ── POST /send-otp ──────────────────────────────────────────────
  if (path === "/send-otp" && method === "POST") {
    const { email } = body;
    if (!email) return resp(400, { error: "Email required" });

    const otp    = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await db.send(new PutCommand({
      TableName: TABLE,
      Item: { prn: `otp#${email}`, otpCode: otp, otpExpiry: expiry }
    }));

    await ses.send(new SendEmailCommand({
      Source: SENDER_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Your Task Planner verification code" },
        Body: {
          Html: {
            Data: `
              <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;border:1px solid #e0ddd6;border-radius:12px;">
                <h2 style="margin:0 0 8px;color:#1a1a18;">📋 Task Planner</h2>
                <p style="color:#888;margin:0 0 24px;">Your email verification code:</p>
                <div style="font-size:40px;font-weight:700;letter-spacing:.25em;color:#2563eb;margin-bottom:24px;">
                  ${otp}
                </div>
                <p style="color:#888;font-size:13px;margin:0;">
                  This code expires in <strong>10 minutes</strong>.<br>
                  If you did not request this, ignore this email.
                </p>
              </div>
            `
          },
          Text: { Data: `Your Task Planner OTP is: ${otp}\nExpires in 10 minutes.` }
        }
      }
    }));

    return resp(200, { message: "OTP sent" });
  }

  // ── POST /verify-otp ────────────────────────────────────────────
  if (path === "/verify-otp" && method === "POST") {
    const { email, otp } = body;
    if (!email || !otp) return resp(400, { error: "Email and OTP required" });

    const result = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { prn: `otp#${email}` }
    }));

    const rec = result.Item;
    if (!rec)                        return resp(400, { error: "No OTP found. Request a new one." });
    if (Date.now() > rec.otpExpiry)  return resp(400, { error: "OTP expired. Request a new one." });
    if (rec.otpCode !== String(otp)) return resp(400, { error: "Incorrect OTP." });

    return resp(200, { message: "Verified" });
  }

  // ── POST /signup ─────────────────────────────────────────────────
  if (path === "/signup" && method === "POST") {
    const { name, prn, password, email } = body;
    if (!name || !prn || !password || !email)
      return resp(400, { error: "All fields required" });

    const existing = await db.send(new GetCommand({ TableName: TABLE, Key: { prn } }));
    if (existing.Item) return resp(409, { error: "PRN already registered" });

    await db.send(new PutCommand({
      TableName: TABLE,
      Item: { prn, name, password, email, tasks: [], emailVerified: true }
      // ⚠️  Hash password with bcrypt before going to production!
    }));

    return resp(200, { message: "Account created", name, prn });
  }

  // ── POST /login ──────────────────────────────────────────────────
  if (path === "/login" && method === "POST") {
    const { prn, password } = body;
    const result = await db.send(new GetCommand({ TableName: TABLE, Key: { prn } }));
    const user = result.Item;

    if (!user || user.password !== password)
      return resp(401, { error: "Invalid PRN or password" });

    return resp(200, { name: user.name, prn: user.prn, email: user.email, tasks: user.tasks || [] });
  }

  // ── POST /tasks ──────────────────────────────────────────────────
  if (path === "/tasks" && method === "POST") {
    const { prn, password, tasks } = body;
    const result = await db.send(new GetCommand({ TableName: TABLE, Key: { prn } }));
    const user = result.Item;

    if (!user || user.password !== password)
      return resp(401, { error: "Unauthorized" });

    await db.send(new PutCommand({ TableName: TABLE, Item: { ...user, tasks } }));
    return resp(200, { message: "Saved" });
  }

  return resp(404, { error: "Route not found" });
};
