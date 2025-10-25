# UX Guidelines: Email Verification

This guide defines copy, accessibility practices, retry behavior, and error messaging for the email verification journey.

Scope:
- Send a 6-digit code to email
- Verify code entry
- Display verification status
- Handle rate limits, lockouts, offline scenarios

---

## Principles
- Enumeration-safe: never reveal whether an email exists or is already verified via copy.
- Clarity: plain language, short sentences, and actionable guidance.
- Accessibility: WCAG AA color contrast, keyboard-friendly, and screen reader support.
- Resilience: offline detection, queued retries, and progressive disclosure of errors.

---

## Copy Guidelines

### Request Code (send-code)
- Primary: "If an account exists for this email, we’ve sent a code."
- Secondary: "Check your inbox and enter the 6-digit code."
- Helper (dev mode): "For local development, a test code may be shown."

### Verify Code (verify-code)
- Success: "Email verified successfully."
- Invalid: "Invalid verification code."
- Expired: "Verification code has expired. Please request a new one."
- Backoff: "Too many attempts. Please wait {N}s before trying again."
- Lockout: "Too many attempts. Account temporarily locked. Try again in {N}s."

### Status (verification-status)
- Verified: "Your email is verified."
- Not verified: "Your email is not verified yet."
- Not found (internal): Use generic errors in user-facing contexts; avoid revealing existence.

### Offline/Network
- Offline toast: "You’re offline. We’ll retry when you reconnect."
- Network error: "We couldn’t reach the server. Please try again."

---

## Accessibility

### Forms & Inputs
- Email input:
  - Use `type="email"`, label association, and clear instructions.
  - Validate on submit; show inline error messages with `aria-live="polite"`.
- Code input (OTP):
  - Prefer a single input with `inputmode="numeric"` and `autocomplete="one-time-code"`.
  - If using multiple boxes, support paste, auto-advance, and backspace across boxes.
  - Announce errors via a visually hidden region with `role="alert"` and `aria-live="assertive"`.

### Keyboard & Focus
- Maintain logical tab order; provide visible focus outlines.
- After sending code, move focus to the code entry input.
- On error, focus the error summary or first invalid field.

### Color & Contrast
- Ensure text and interactive elements meet WCAG AA contrast ratios.
- Do not rely on color alone to convey validation state; include icons or text.

### Screen Readers
- Use descriptive button labels (e.g., "Send verification code").
- Provide status regions for operation feedback (sending, success, error).
- Announce time-sensitive details (e.g., "Code expires in 10 minutes") in a polite region.

---

## Retry Behavior

### Send Code
- Enforce resend cooldown visually (disable button, show countdown if available).
- On `429`, display remaining wait time from the API message.

### Verify Code
- On invalid code, allow immediate re-entry.
- On backoff (`429`), disable the submit action and show countdown.
- On lockout, display time remaining and offer a link to request a new code later.

### Offline Handling
- Detect offline state via `navigator.onLine` and fetch failures.
- Queue the last action and auto-retry when network reconnects.
- Provide a manual "Try again" button.

---

## Error Messages

Use short, clear, user-friendly messages. Avoid internal jargon.

- Validation: "Invalid input" + inline field detail (e.g., "Enter a valid email").
- Send rate limit: "Please wait {N}s before requesting another code."
- Verify backoff: "Too many verification attempts. Please wait {N}s before next attempt."
- Lockout: "Too many verification attempts. Account temporarily locked. Try again in {N}s."
- Expired code: "Verification code has expired. Please request a new one."
- Network: "We couldn’t reach the server. Please try again."
- Offline: "You’re offline. We’ll retry when you reconnect."

---

## Content Strategy
- Keep primary actions clear: "Send code", "Verify code".
- Use progressive disclosure: show details (e.g., rate limits) only when relevant.
- Maintain consistent tone across screens (helpful, direct, and human).

---

## Instrumentation (Optional)
- Capture frontend errors (global error listeners) and route key interactions (send, verify).
- Use sampling (`VITE_SENTRY_TRACES_SAMPLE_RATE`) to limit performance overhead.
- On backend, capture verification events, backoffs, and lockouts to monitor abuse patterns.