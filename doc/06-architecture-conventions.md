# 6. Architecture & Coding Conventions

This file documents the *patterns* used consistently across the codebase,
so new code you (or another dev) writes later stays consistent.

## The layered pattern

```
routes/  →  controller/  →  services/  →  models/
```

- **routes/**: only `router.METHOD(path, [middleware...], controllerFn)`.
  No logic.
- **controller/**: extracts what's needed from `req`, calls exactly one
  service function, shapes the JSON response. No direct Mongoose or
  Cloudinary calls.
- **services/**: all business logic — DB queries, Cloudinary calls,
  hashing, token generation. Throws `AppError` for expected failure
  cases (not found, validation failure, etc.).
- **models/**: Mongoose schemas only.

**Rule of thumb**: if you're tempted to write `User.findById` inside a
controller, stop — that belongs in a service function instead.

## Error handling pattern

- **`utils/AppError.js`**: a custom `Error` subclass carrying a
  `statusCode` (e.g. `new AppError("User not found.", 404)`).
- **`utils/catchAsync.js`**: wraps every async controller function.
  Instead of:
  ```js
  exports.foo = async (req, res, next) => {
    try { ... } catch (err) { next(err); }
  };
  ```
  every controller in this project does:
  ```js
  exports.foo = catchAsync(async (req, res) => {
    // just write the happy path — thrown errors are caught automatically
  });
  ```
- **`middleware/errorMiddleware.js`**: the final Express error-handling
  middleware (4-argument signature) that catches anything passed to
  `next(err)` (or thrown inside a `catchAsync`-wrapped function) and
  formats the `{ success: false, message }` response.

> ⚠️ Inconsistency spotted: `authController.profile`, `forgotPassword`,
> and `resetPassword` are **not** wrapped in `catchAsync` (unlike every
> other handler in `authController.js`). Worth fixing for consistency —
> otherwise a thrown error in those three will not be caught the same way.

## The generic factory pattern

`controller/factoryController.js` exports generic, reusable CRUD handlers
(`createOne`, `getOne`, `updateOne`, `deleteOne`) that take a Mongoose
model and return an Express handler. `userController.js` uses these
directly for plain CRUD:

```js
exports.createUser = factory.createOne(User);
exports.getUser    = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
```

This avoids rewriting the same "find by id / 404 if missing / return
JSON" logic for every model. Custom behavior (profile image, gallery)
still gets its own dedicated controller + service functions, since it
needs logic beyond generic CRUD.

## The "self" vs "admin" route pairing convention

Every mutating user action comes in two flavors:

- **`/me/...`** — acts on `req.user.id` (the logged-in user, from the
  `protect` middleware). No `:id` param needed — can't act on anyone
  else's data.
- **`/:id/...`** — acts on `req.params.id`, gated by `restrictTo("admin")`
  so only admins can modify another user's data.

Both routes call the **same service function** — only the source of the
`userId` differs (`req.user.id` vs `req.params.id`). This is a good
pattern to keep reusing for any future per-user resource.

## Image upload conventions

- **Multer field name matters**: singular actions (profile image) use
  `upload.single("image")` → `req.file`. Plural actions (gallery) use
  `upload.array("images", 10)` → `req.files`. Keep this naming
  consistent for any new upload feature.
- **Always process with Sharp before Cloudinary** — resize/format/quality
  are standardized per use case (profile: 500×500 webp q80; gallery:
  800×800 webp q80) so stored images are predictable in size and format.
- **Delete before replace**: whenever an image is being replaced (not
  just added), delete the old Cloudinary asset by `public_id` first to
  avoid orphaned storage.
- **Upload ≠ persist**: a raw "upload to Cloudinary" endpoint should never
  be assumed to update MongoDB. Any endpoint that needs the image
  *remembered* must explicitly call `user.save()` (or equivalent) after
  uploading.

## Response envelope convention

Every controller response follows:
```json
{ "success": true, "message": "...", "data": { } }
```
and list endpoints additionally include `count` and/or `pagination`. Keep
new endpoints consistent with this shape so frontend code can rely on it
uniformly.

## Security middleware stack (global, applied in `server.js` — confirm order)

Typical order for this stack (confirm against actual `server.js`):
1. `helmet()` — security headers
2. `cors()` — cross-origin access
3. `express.json()` — body parsing
4. `hpp()` — parameter pollution protection
5. `morgan("dev")` — request logging (dev only, typically)
6. Rate limiters on specific sensitive routes (not global)
7. Routes
8. `errorMiddleware` — must be registered **last**, after all routes

> Paste `server.js` to confirm the real order and lock this section in.

## Naming conventions observed

- Files: camelCase (`authController.js`, `uploadMiddleware.js`)
- Mongoose sub-document fields: camelCase (`profileImage`, `uploadedAt`)
- Route param placeholders: `:id`, `:sessionId`, `:token`, `:publicId`
- Consistent verb prefixes in service functions: `get...`, `update...`,
  `delete...`, `add...`

Keep these conventions when adding new modules so the codebase stays
predictable to navigate.
