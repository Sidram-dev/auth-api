# 1. Folder Structure

Full project tree, with an explanation of what belongs in each folder and
why it's separated that way. This project follows a classic **layered
Express architecture**: `routes → controller → service → model`, with
`middleware`, `utils`, `config`, and `validators` as supporting layers.

```
auth-api/
├─ config/
│  ├─ cloudinary.js         # Cloudinary SDK setup (API key/secret/cloud name from .env)
│  └─ database.js           # Mongoose connection setup (MongoDB URI, connection options)
│
├─ controller/
│  ├─ authController.js     # HTTP layer for register/login/logout/refresh/sessions/password reset
│  ├─ factoryController.js  # Generic reusable CRUD handlers (createOne/getOne/updateOne/deleteOne)
│  ├─ uploadController.js   # HTTP layer for the standalone "upload only" image endpoint(s)
│  └─ userController.js     # HTTP layer for user CRUD + profile image + gallery endpoints
│
├─ middleware/
│  ├─ authMiddleware.js     # `protect` (verify JWT, attach req.user) + `restrictTo` (role check)
│  ├─ errorMiddleware.js    # Global Express error handler (catches AppError + unexpected errors)
│  ├─ rateLimiter.js        # express-rate-limit configs (e.g. login attempt limiting)
│  └─ uploadMiddleware.js   # Multer config (memory storage, file size/type limits) for image routes
│
├─ models/
│  ├─ RefreshToken.js       # Mongoose schema for refresh token / session documents
│  └─ User.js                # Mongoose schema: credentials, profileImage, images[], roles, etc.
│
├─ routes/
│  ├─ authRoutes.js         # /api/auth/* — mounts authController handlers
│  ├─ uploadRoutes.js       # /api/upload/* — mounts uploadController handlers
│  └─ userRoutes.js         # /api/users/* — mounts userController handlers
│
├─ services/
│  ├─ authService.js        # Business logic: hashing, token generation, session persistence
│  ├─ uploadService.js      # Business logic: talk to Cloudinary, process with Sharp, return URLs
│  └─ userService.js        # Business logic: user CRUD, profile image update, gallery management
│
├─ uploads/
│  ├─ users/                # Local disk storage (if Multer is configured with diskStorage here)
│  └─ abc                    # ⚠️ looks like a stray/test file — verify if still needed
│
├─ utils/
│  ├─ APIFeatures.js        # Query helper class: filter(), sort(), limitFields(), paginate()
│  ├─ AppError.js           # Custom Error class (message + statusCode) used across the app
│  ├─ catchAsync.js         # Wraps async controller functions so errors go to errorMiddleware
│  ├─ cloudinaryDelete.js   # Helper to delete an asset from Cloudinary by public_id
│  ├─ cloudinaryUpload.js   # Helper to upload a buffer/stream to Cloudinary
│  ├─ email.js              # Nodemailer transport + send-email helper (password reset, etc.)
│  ├─ generateRefreshToken.js # Signs/creates a refresh token
│  ├─ generateToken.js      # Signs a JWT access token
│  └─ imageProcessor.js     # Sharp-based resize/format/quality processing before upload
│
├─ validators/
│  └─ authValidator.js      # express-validator rule chains for register/login/etc.
│
├─ .env                      # Environment variables (NOT committed — see .gitignore)
├─ .gitignore
├─ package-lock.json
├─ package.json
└─ server.js                 # App entry point: creates Express app, mounts middleware + routes, starts server
```

## Why this structure?

- **`routes/`** only wires HTTP method + path → controller function. No
  business logic lives here.
- **`controller/`** only handles the HTTP concerns: reading `req`, calling
  the right service function, shaping the JSON response (`success`,
  `message`, `data`). No direct database or Cloudinary calls here — that's
  delegated to `services/`.
- **`services/`** contains the actual business logic — talking to
  Mongoose models, calling Cloudinary, hashing passwords, etc. This is the
  layer you'd unit test.
- **`models/`** defines the MongoDB schema/shape of the data.
- **`middleware/`** contains cross-cutting request processing that runs
  *before* a controller: authentication checks, rate limiting, file
  parsing (Multer), and centralized error handling.
- **`utils/`** holds small, reusable, stateless helper functions used
  across multiple services/controllers (error classes, async wrappers,
  token generation, Cloudinary helpers).
- **`validators/`** holds `express-validator` rule chains, kept separate
  from controllers so validation rules can be reused/tested independently.
- **`config/`** holds one-time setup/connection code for external
  services (MongoDB, Cloudinary) so credentials and connection logic live
  in one predictable place.

This separation is what makes the codebase **testable and swappable** —
e.g., you could swap Cloudinary for S3 by only touching `uploadService.js`
and `config/cloudinary.js`, without changing any controller or route.

## Things to double check later

- `uploads/abc` — unclear purpose; confirm whether it's a leftover test
  file safe to delete, or something the app depends on.
- `uploads/users/` — if Cloudinary is the actual storage destination
  (per the gallery feature discussion), confirm whether local disk
  storage under `uploads/` is still used at all, or is a legacy
  leftover from before Cloudinary was integrated.