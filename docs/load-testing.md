# Load Testing Email Verification Endpoints

Use `autocannon` to validate rate limits under burst traffic without adding new dependencies to the repo.

## Prerequisites
- API running locally on `http://localhost:3001` (adjust as needed)
- Node.js installed

## Send Code Burst
```bash
npx autocannon -c 50 -d 15 -p 10 \
  -m POST \
  -H 'Content-Type: application/json' \
  -b '{"email":"test@example.com"}' \
  http://localhost:3001/api/users/auth/send-code
```
- `-c 50`: 50 concurrent connections
- `-d 15`: run for 15 seconds
- `-p 10`: pipeline 10 requests per connection

Expected: After the first request per email, subsequent attempts should hit per-email rate limit (`429`) within the window.

## Verify Code Burst (Bad Codes)
```bash
npx autocannon -c 50 -d 15 -p 10 \
  -m POST \
  -H 'Content-Type: application/json' \
  -b '{"email":"test@example.com","code":"000000"}' \
  http://localhost:3001/api/users/auth/verify-code
```
Expected: Rapid invalid attempts should trigger the per-email verify limiter (`429`) after defined thresholds.

## Notes
- Consider testing with different emails to avoid per-email limiter interactions.
- Monitor logs for limiter messages and ensure no elevated error rates.
- Run on a non-production environment.