# 5. API Reference

All routes are mounted under an `/api` prefix (confirm exact mount points
in `server.js`, e.g. `app.use("/api/auth", authRoutes)`).

Every response follows the same envelope:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { }
}
```
Errors (from `errorMiddleware.js`) are expected to follow:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Auth routes — `/api/auth` (confirmed from `authController.js`)

| Method | Path (inferred, confirm in `authRoutes.js`) | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/register` | none | user registration fields | Create a new account |
| POST | `/login` | none | `{ email, password }` | Log in, returns tokens |
| GET | `/profile` | Bearer token | — | Get the logged-in user |
| POST | `/refresh-token` | none | `{ refreshToken }` | Exchange refresh token for new access token |
| GET | `/sessions` | Bearer token | — | List all active sessions/devices |
| DELETE | `/sessions/:sessionId` | Bearer token | — | Revoke one session |
| POST | `/logout-all` | Bearer token | — | Revoke every session for the user |
| POST | `/forgot-password` | none | `{ email }` | Request a password reset email |
| PATCH | `/reset-password/:token` | none | `{ password }` | Set a new password using reset token |

> Exact paths/HTTP verbs above are the most standard convention for this
> handler set but are **inferred** — paste `routes/authRoutes.js` to lock
> these in exactly.

## User routes — `/api/users` (confirmed from `userController.js` + gallery discussion)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | admin (likely) | List all users, paginated (`userService.getAllUsers`) |
| POST | `/` | admin (likely) | Create a user (`factoryController.createOne`) |
| GET | `/:id` | ? | Get one user (`factoryController.getOne`) |
| PATCH | `/:id` | ? | Update one user (`factoryController.updateOne`) |
| DELETE | `/:id` | admin (likely) | Delete one user (`factoryController.deleteOne`) |
| PATCH | `/me/profile-image` | self | Update own profile image — `multipart/form-data`, field `image` (singular, name inferred) |
| PATCH | `/:id/profile-image` | admin | Update any user's profile image |
| DELETE | `/me/profile-image` | self | Delete own profile image |
| DELETE | `/:id/profile-image` | admin | Delete any user's profile image |
| POST | `/me/images` | self | Add gallery images — `multipart/form-data`, field `images` (up to 10 files) |
| POST | `/:id/images` | admin | Add gallery images to any user |
| GET | `/me/images` | self | **Planned, not yet implemented** — list own gallery |
| GET | `/:id/images` | admin | **Planned, not yet implemented** — list a user's gallery |
| DELETE | `/me/images/:publicId` | self | **Planned, not yet implemented** — delete one gallery image |
| DELETE | `/:id/images/:publicId` | admin | **Planned, not yet implemented** — delete one gallery image |
| DELETE | `/me/images` | self | **Planned, not yet implemented** — delete entire gallery |

Auth guards marked "?" or "(likely)" should be confirmed against
`routes/userRoutes.js` once pasted — specifically which routes use
`restrictTo("admin")` vs just `protect`.

## Upload routes — `/api/upload` (partially known)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/images` | ? | Generic multi-image upload straight to Cloudinary — **does not** persist to any document. Use only for one-off uploads; for anything tied to a user, use the `/api/users/.../images` or `/profile-image` routes instead. |

> Confirm exact path/behavior against `routes/uploadRoutes.js` and
> `controller/uploadController.js` once pasted.

## Example request — update own profile image

```
PATCH /api/users/me/profile-image
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Body (form-data):
  image: <file>
```

## Example request — add gallery images

```
POST /api/users/me/images
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Body (form-data):
  images: <file 1>
  images: <file 2>
  images: <file 3>
```

## Example response — after adding gallery images

```json
{
  "success": true,
  "message": "Images uploaded successfully.",
  "data": {
    "_id": "...",
    "profileImage": { "url": "...", "public_id": "..." },
    "images": [
      { "url": "...", "public_id": "...", "uploadedAt": "2026-08-06T..." },
      { "url": "...", "public_id": "...", "uploadedAt": "2026-08-06T..." }
    ]
  }
}
```

## To finish this reference

Paste `routes/authRoutes.js`, `routes/userRoutes.js`,
`routes/uploadRoutes.js`, and `validators/authValidator.js` so every path,
HTTP verb, required field, and validation rule can be confirmed exactly
rather than inferred.
