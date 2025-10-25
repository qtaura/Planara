# Email Verification API

Base URL: `http://localhost:<PORT>/api/users`

All endpoints normalize emails (trim + lowercase). Responses are designed to be enumeration-safe.

- `POST /auth/send-code` — Request a 6-digit verification code
- `POST /auth/verify-code` — Verify the 6-digit code
- `GET /auth/verification-status/:email` — Check verification status

Rate limits and backoffs apply to send/verify endpoints. Admin helpers are listed at the end.

---

## POST /auth/send-code
Requests a verification code to be sent to the user’s email.

- Method: `POST`
- Path: `/auth/send-code`
- Auth: Not required
- Body:
```json
{
  "email": "user@example.com"
}
```

Notes:
- Always returns a generic success if the user does not exist or is already verified.
- Resend cooldown is enforced (1 minute); violating cooldown triggers escalating backoff.
- In local development, if `RESEND_API_KEY` is not set, response includes `devCode`.

### Success (existing, not verified)
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expiresAt": "2024-10-25T12:34:56.000Z"
}
```

### Success (nonexistent or already verified)
```json
{
  "success": true,
  "message": "If an account exists for this email, a verification code has been sent."
}
```

### Success (dev mode, returns devCode)
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expiresAt": "2024-10-25T12:34:56.000Z",
  "devCode": "123456"
}
```

### Rate limited (cooldown/backoff)
Status: `429`
```json
{
  "success": false,
  "error": "Please wait 23s before requesting another code."
}
```

### Validation error
Status: `400`
```json
{
  "success": false,
  "error": "Invalid input",
  "details": [
    {
      "code": "invalid_string",
      "message": "Invalid email address",
      "path": ["email"]
    }
  ]
}
```

---

## POST /auth/verify-code
Submits the 6-digit code to verify the user.

- Method: `POST`
- Path: `/auth/verify-code`
- Auth: Not required
- Body:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

Notes:
- Returns a generic invalid response for nonexistent users and already-verified accounts.
- Progressive backoff applies to repeated invalid attempts; lockout occurs after a threshold.
- Expired codes return a specific error.

### Success
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "id": "<id>",
    "email": "user@example.com",
    "username": "user",
    "isVerified": true
  }
}
```

### Invalid code
Status: `400`
```json
{
  "success": false,
  "error": "Invalid verification code"
}
```

### Locked out (too many attempts)
Status: `429`
```json
{
  "success": false,
  "error": "Too many verification attempts. Account temporarily locked. Try again in 120s."
}
```

### Backoff (too frequent attempts)
Status: `429`
```json
{
  "success": false,
  "error": "Too many verification attempts. Please wait 15s before next attempt."
}
```

### Expired code
Status: `400`
```json
{
  "success": false,
  "error": "Verification code has expired. Please request a new one."
}
```

### Validation error
Status: `400`
```json
{
  "success": false,
  "error": "Invalid input",
  "details": [
    {
      "code": "too_small",
      "message": "Code must be exactly 6 digits",
      "path": ["code"]
    }
  ]
}
```

---

## GET /auth/verification-status/:email
Returns the verification status of a known user.

- Method: `GET`
- Path: `/auth/verification-status/:email`
- Auth: Not required

### Success
```json
{
  "success": true,
  "user": {
    "id": "<id>",
    "email": "user@example.com",
    "username": "user",
    "isVerified": true
  }
}
```

### Not found
Status: `404`
```json
{
  "success": false,
  "error": "User not found with this email address"
}
```

### Validation error
Status: `400`
```json
{
  "success": false,
  "error": "Invalid email address"
}
```

---

## Curl Examples
Assuming `PORT=3010` and `API=http://localhost:3010/api/users`.

```bash
# Send code
curl -X POST "$API/auth/send-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"USER@example.com"}'

# Verify code
curl -X POST "$API/auth/verify-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","code":"123456"}'

# Verification status
curl "$API/auth/verification-status/user@example.com"
```

---

## Admin Helpers
- `POST /auth/admin/unlock` – Clear lockouts/backoffs for a user (auth required)
- `GET /auth/admin/lockout-state/:email` – Inspect lockout/backoff state (auth required)
- `GET /auth/admin/events/:email` – Recent security events (auth required)
- `GET /auth/admin/rotations/:email` – Verification secret rotations (auth required)