# auth-api — Project Documentation

> A MERN-stack backend (Node.js + Express + MongoDB/Mongoose) that provides
> authentication (JWT access + refresh tokens), user management, and
> Cloudinary-based image upload (profile image + image gallery).

This is the **root index**. Read this first, then open the numbered docs in
`/docs` in order — each one builds on the last, so reading top to bottom
gives you the full picture of how the project works.

## Why this documentation exists

Two audiences:

1. **Future you** — coming back after weeks/months away. You should be able
   to read these files and remember exactly what was built, why, and how
   the pieces connect, without re-reading the source code line by line.
2. **Another developer** — joining the project cold. They should be able to
   read these files and understand the architecture, conventions, and
   what's already implemented, before touching any code.

## Reading order

| # | File | What it covers |
|---|------|-----------------|
| 1 | [`01-folder-structure.md`](./doc/01-folder-structure.md) | Full folder tree + what each folder/file is responsible for |
| 2 | [`02-packages.md`](./doc/02-packages.md) | Every npm package installed, what it does, and why it's in this project |
| 3 | [`03-authentication.md`](./doc/03-authentication.md) | JWT access + refresh token flow, login/register/logout, sessions, password reset |
| 4 | [`04-user-profile-image-gallery.md`](./doc/04-user-profile-image-gallery.md) | Cloudinary image upload architecture — single profile image vs. multi-image gallery |
| 5 | [`05-api-reference.md`](./doc/05-api-reference.md) | Every known route: method, path, auth required, body, response |
| 6 | [`06-architecture-conventions.md`](./doc/06-architecture-conventions.md) | The layered pattern (routes → controller → service → model), error handling, and coding conventions used throughout |

## Quick project summary

- **Runtime**: Node.js, CommonJS modules (`"type": "commonjs"`)
- **Framework**: Express 5
- **Database**: MongoDB via Mongoose
- **Auth**: JWT (access token + refresh token), stored sessions in a
  `RefreshToken` collection, bcrypt password hashing
- **File uploads**: Multer (memory/disk) → Sharp (image processing) →
  Cloudinary (storage/CDN), via `streamifier` to stream buffers to Cloudinary
- **Security middleware**: Helmet, CORS, HPP, express-rate-limit,
  express-validator
- **Email**: Nodemailer (used for password reset, etc.)
- **Dev tooling**: nodemon for auto-restart in dev

## How to run the project

```bash
# install dependencies
npm install

# create a .env file (see 02-packages.md and 03-authentication.md
# for the environment variables each package/feature needs)

# run in dev mode (auto-restart via nodemon)
npm run dev
```

> ⚠️ **TODO for you**: paste the actual contents of `.env.example`,
> `server.js`, `config/database.js`, and `config/cloudinary.js` next time
> we update these docs, so the exact environment variables and startup
> sequence are documented precisely instead of inferred.

## Status of this documentation

This doc set was generated from:
- `package.json` (full contents provided)
- Full folder tree (provided)
- `authController.js` (full contents provided)
- `userController.js` and `userService.js` (full contents, from an earlier
  chat about the profile-image/gallery feature)
- A design discussion about adding a multi-image gallery feature

**Not yet reviewed/pasted in**: `authService.js`, `uploadService.js`,
`authMiddleware.js`, `uploadMiddleware.js`, `errorMiddleware.js`,
`rateLimiter.js`, `User.js`, `RefreshToken.js`, route files, validators,
and utils (`generateToken.js`, `generateRefreshToken.js`, `email.js`,
`imageProcessor.js`, `cloudinaryUpload.js`, `cloudinaryDelete.js`).

Wherever a doc below describes behavior from one of those unreviewed files,
it is marked **(inferred from usage / naming)** rather than confirmed from
source — so you know what's fact vs. educated guess. Paste those files in a
future session and I'll fill in the gaps with confirmed details.
