# 3. Authentication

This module handles registration, login, JWT access/refresh tokens,
multi-device sessions, logout, and password reset.

Source confirmed from the pasted `authController.js`. The corresponding
`authService.js`, `authMiddleware.js`, `models/User.js`, and
`models/RefreshToken.js` were **not yet pasted** — behavior for those is
marked *(inferred)* below and should be confirmed later.

## High-level flow

```
Client
  │
  ▼
routes/authRoutes.js        (maps HTTP method+path → controller)
  │
  ▼
controller/authController.js (reads req, calls service, shapes response)
  │
  ▼
services/authService.js      (business logic: hashing, tokens, DB writes)
  │
  ▼
models/User.js / models/RefreshToken.js  (MongoDB via Mongoose)
```

Every controller method is wrapped in `catchAsync`, so any error thrown
inside `authService` (e.g. "Invalid credentials", "User not found")
automatically propagates to `middleware/errorMiddleware.js` instead of
needing a manual try/catch per route.

## Endpoints (from `authController.js`)

### `register`
- Calls `authService.registerUser(req.body, { userAgent, ipAddress })`.
- Passing `userAgent`/`ipAddress` alongside the new user's data strongly
  suggests registration **also creates a session/refresh-token record**
  immediately (tracking which device/browser/IP the account was created
  and first logged in from) — *(inferred)*, confirm in `authService.js`.
- Responds `200` with the created user in `data`.

### `login`
- Calls `authService.loginUser(req.body, { userAgent, ipAddress })`.
- `req.body` is expected to contain login credentials (email + password).
- Returns a `result` object in `data` — very likely `{ user, accessToken,
  refreshToken }` *(inferred — confirm exact shape in authService.js)*.
- The `userAgent`/`ipAddress` are passed through so the resulting refresh
  token/session can be tagged with device info (shown in `getSession`
  below, which lists sessions — implying each one stores this metadata).

### `profile`
- **Not** wrapped in `catchAsync` (the only handler in this file that
  isn't) — worth normalizing for consistency, since any thrown error here
  would need its own try/catch or it'll crash unhandled.
- Simply returns `req.user`, which is populated by the `protect`
  auth middleware after verifying the incoming JWT *(inferred — this is
  the standard pattern: middleware decodes the token, looks up the user,
  attaches it as `req.user`, then the route can just read it)*.

### `refreshToken`
- Takes `{ refreshToken }` from `req.body`.
- Calls `authService.refreshAccessToken(refreshToken, { userAgent,
  ipAddress })` — issues a new access token (and likely rotates/validates
  the refresh token against what's stored in `models/RefreshToken.js`).
- This is the standard **refresh token rotation pattern**: instead of
  forcing the user to log in again every time the short-lived access
  token expires, the client sends the longer-lived refresh token to get a
  new access token.

### `getSession`
- Calls `authService.getUserSession(req.user._id)`.
- Returns all active sessions (refresh tokens) for the logged-in user,
  including a `count`. This is what powers a "Devices logged in" /
  "Active sessions" UI — each session record likely stores `userAgent`,
  `ipAddress`, and `createdAt` (confirm against `models/RefreshToken.js`).

### `deleteSession`
- Calls `authService.deleteSession(req.params.sessionId, req.user._id)`.
- Lets a logged-in user revoke **one specific** session/device (e.g. "log
  out my old phone" from a device list) — passing `req.user._id` too
  ensures a user can only delete their own sessions, not someone else's.

### `logoutAllDevices`
- Calls `authService.logoutAllDevices(req.user._id)`.
- Deletes **all** refresh tokens/sessions for the user, forcing every
  device to re-authenticate. Returns `deletedSessions` count.

### `forgotPassword`
- Calls `authService.forgotPassword(req.body.email)`.
- Expected behavior *(inferred)*: generates a password-reset token,
  saves a hashed version of it (and an expiry) on the `User` document,
  and emails the plain token/link to the user via `utils/email.js`
  (nodemailer).

### `resetPassword`
- Calls `authService.resetPassword(req.params.token, req.body.password)`.
- Expected behavior *(inferred)*: hashes the incoming token, looks up a
  user whose stored reset token matches and hasn't expired, sets the new
  (bcrypt-hashed) password, and clears the reset token fields.

## Middleware involved (inferred from `authMiddleware.js` usage elsewhere)

- **`protect`** — reads the `Authorization: Bearer <token>` header,
  verifies the JWT with `jsonwebtoken`, loads the matching user from
  MongoDB, and attaches it to `req.user`. Runs before any route that
  needs `req.user` (`profile`, `getSession`, `deleteSession`,
  `logoutAllDevices`, and the `/me/...` user routes seen in
  `04-user-profile-image-gallery.md`).
- **`restrictTo(...roles)`** — used on admin-only routes (e.g. updating
  another user's profile image by `:id`, per the earlier gallery
  discussion) to check `req.user.role` after `protect` has run.

> ⚠️ Confirm the exact implementation once `authMiddleware.js` is pasted
> — the above is the standard pattern implied by how it's consumed.

## Rate limiting

`middleware/rateLimiter.js` uses `express-rate-limit`. This is very
likely applied to `login`, `forgotPassword`, and possibly `register`, to
blunt brute-force and email-bombing attacks — confirm exact limits/window
once the file is pasted.

## Password security

- `bcrypt` hashes passwords before storage (never stored as plaintext).
- Password reset tokens are typically stored **hashed** too (common
  pattern: hash the token with a fast hash like SHA-256 before saving, so
  a database leak doesn't expose usable reset tokens) — confirm in
  `authService.js`.

## What's still missing from this doc

To finish this section with 100% confirmed (not inferred) detail, paste:

- `services/authService.js` — the real implementation of every method
  called above
- `middleware/authMiddleware.js` — `protect` / `restrictTo`
- `models/User.js` — schema fields, pre-save hashing hook, any instance
  methods (e.g. `comparePassword`)
- `models/RefreshToken.js` — session schema
- `routes/authRoutes.js` — to confirm exact URL paths and middleware
  order per route
- `validators/authValidator.js` — exact validation rules
- `utils/generateToken.js`, `utils/generateRefreshToken.js`,
  `utils/email.js`
