# 2. Installed Packages — What & Why

Source: `package.json` (pasted in full). Every dependency below is
documented with **what it is** and **why it's used in this specific
project**, not just a generic definition.

## Dependencies (production)

### `express` (^5.2.1)
The web framework. Handles routing, middleware pipeline, request/response
objects. Everything in `routes/`, `controller/`, and `middleware/` is built
on top of this. This project uses **Express 5**, which has stricter
async-error handling than Express 4 — this is part of why `catchAsync.js`
and `errorMiddleware.js` exist (to standardize how thrown errors in async
route handlers reach the error handler).

### `mongoose` (^9.8.1)
ODM (Object Document Mapper) for MongoDB. Used to define schemas
(`models/User.js`, `models/RefreshToken.js`) and query the database.
`config/database.js` sets up the connection.

### `jsonwebtoken` (^9.0.3)
Creates and verifies JWTs. Used for:
- **Access tokens** — short-lived, sent on every authenticated request,
  verified in `authMiddleware.js` (`protect`).
- **Refresh tokens** — longer-lived, used to issue new access tokens
  without forcing re-login (see `03-authentication.md`).
`utils/generateToken.js` and `utils/generateRefreshToken.js` wrap the
signing logic.

### `bcrypt` (^6.0.0)
Password hashing. User passwords are never stored in plaintext — they're
hashed with bcrypt before saving to MongoDB (almost certainly in a
Mongoose pre-save hook on `models/User.js`, or inside `authService.js`).
Also used to compare a plaintext login password against the stored hash.

### `dotenv` (^17.4.2)
Loads environment variables from a `.env` file into `process.env`. Keeps
secrets (DB connection string, JWT secret, Cloudinary keys, SMTP
credentials) out of source code.

### `cors` (^2.8.6)
Enables Cross-Origin Resource Sharing so a frontend running on a different
origin/port (e.g. a React app on `localhost:5173`) can call this API.

### `helmet` (^8.3.0)
Sets a batch of security-related HTTP headers automatically (e.g.
`X-Content-Type-Options`, `Strict-Transport-Security`) to reduce common
web vulnerabilities. Applied globally in `server.js`.

### `hpp` (^0.2.3)
"HTTP Parameter Pollution" protection — prevents attackers from sending
duplicate query params (e.g. `?role=user&role=admin`) to confuse
filtering/sorting logic, particularly relevant since `utils/APIFeatures.js`
builds Mongoose queries directly from `req.query`.

### `express-rate-limit` (^8.6.1)
Limits how many requests a client can make in a time window. Used in
`middleware/rateLimiter.js` — almost certainly applied to sensitive routes
like `/auth/login` and `/auth/forgot-password` to slow down brute-force
and credential-stuffing attempts.

### `express-validator` (^7.3.2)
Declarative request validation/sanitization. Rule chains live in
`validators/authValidator.js` (e.g. "email must be a valid email",
"password must be at least 8 characters") and run as middleware before
the controller executes.

### `multer` (^2.2.0)
Parses `multipart/form-data` requests — i.e. file uploads. Configured in
`middleware/uploadMiddleware.js`. Used for both the single profile-image
upload and the multi-image gallery upload (`upload.single(...)` vs
`upload.array("images", 10)`).

### `sharp` (^0.35.3)
High-performance image processing (resize, crop, format conversion,
compression). Used in `utils/imageProcessor.js` to standardize uploaded
images (e.g. resize to 500x500, convert to `webp`, set quality) **before**
sending them to Cloudinary — this reduces storage/bandwidth and keeps
image dimensions consistent.

### `cloudinary` (^2.10.0)
Official SDK for Cloudinary, a cloud image/video storage + CDN service.
Configured in `config/cloudinary.js`. Used to actually store uploaded
images (profile image + gallery images) and to delete them when a user
replaces/removes an image (`utils/cloudinaryDelete.js`).

### `streamifier` (^0.1.1)
Converts a Buffer (e.g. the in-memory file Multer gives you, after Sharp
processes it) into a readable Stream. Cloudinary's `upload_stream` API
expects a stream, not a raw buffer — `streamifier` bridges that gap. Used
inside `utils/cloudinaryUpload.js`.

### `nodemailer` (^9.0.3)
Sends emails via SMTP. Used in `utils/email.js`, most likely for the
"forgot password" flow (`authController.forgotPassword` /
`resetPassword`) to email the user a reset link/token.

### `morgan` (^1.11.0)
HTTP request logger middleware — logs each incoming request (method,
path, status, response time) to the console. Useful for development
debugging; commonly swapped for a quieter format or disabled in
production.

## Dev Dependencies

### `nodemon` (^3.1.14)
Watches source files and automatically restarts the Node server on
change. Wired into `npm run dev` / `npm start` (both currently run
`nodemon server.js` per `package.json` scripts).

## Environment variables this stack implies

Based on the packages above, `.env` almost certainly needs (confirm exact
names against `config/*.js` and `utils/*.js` once pasted):

| Variable | Used by |
|---|---|
| `PORT` | `server.js` |
| `MONGODB_URI` | `config/database.js` (mongoose) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | `utils/generateToken.js` |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | `utils/generateRefreshToken.js` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `config/cloudinary.js` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (or similar) | `utils/email.js` |
| `NODE_ENV` | commonly used to toggle morgan/error verbosity |

> ⚠️ These are **inferred from the packages installed**, not confirmed
> from the actual `.env` or config files. Paste `config/database.js`,
> `config/cloudinary.js`, and `utils/email.js` to lock these down exactly.
