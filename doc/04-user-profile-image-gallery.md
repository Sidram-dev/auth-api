# 4. User Profile Image & Image Gallery (Cloudinary Upload Architecture)

This is the feature that was designed and built step-by-step in an earlier
session. It covers **two separate concerns** that were initially confused
and then deliberately split apart:

1. A **single profile image** per user (`user.profileImage`)
2. A **gallery of multiple images** per user (`user.images[]`)

## The original bug (why this doc exists)

Uploading images via a generic upload endpoint (`POST /api/upload/images`)
stored files in Cloudinary and returned their URLs — but **never wrote
anything to MongoDB**. So `GET` on the user still showed:

```json
"profileImage": { "url": null, "public_id": null }
```

Root cause: uploading to Cloudinary and updating the `User` document are
**two different responsibilities**, and only one API (the profile-image
update endpoint) was doing both. The generic upload endpoint only did
step one (Cloudinary), with nobody calling `user.save()` afterward.

**Lesson learned / convention going forward**: an "upload" endpoint that
only touches Cloudinary should be treated as a low-level utility. Anything
that needs to be *remembered* by the app (attached to a user, a post,
etc.) needs its own endpoint that uploads **and** persists the reference.

## Feature 1: Single Profile Image (already implemented, confirmed working)

### Schema shape (`models/User.js`, partial — confirmed from usage)

```js
profileImage: {
  url: { type: String, default: null },
  public_id: { type: String, default: null },
}
```

### Flow

```
PATCH /api/users/me/profile-image        (logged-in user, self)
PATCH /api/users/:id/profile-image        (admin, any user)
        │
        ▼
userController.updateProfileImage / updateUserProfileImage
        │
        ▼
userService.updateProfileImage(userId, file)
        │
        ├─ find user by id (404 if not found)
        ├─ if user already has a profileImage.public_id →
        │      delete old image from Cloudinary first
        │      (prevents orphaned Cloudinary assets)
        ├─ uploadService.uploadImage(file, {
        │      folder: "users/profile",
        │      width: 500, height: 500,
        │      quality: 80, format: "webp", fit: "cover"
        │    })
        ├─ user.profileImage = { url, public_id }
        ├─ user.save()
        └─ strip password before returning the user object
```

### Confirmed source — `userService.updateProfileImage`

```js
exports.updateProfileImage = async (userId, file) => {
  if (!file) {
    throw new AppError("Please upload an image.", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (user.profileImage?.public_id) {
    await deleteFromCloudinary(user.profileImage.public_id);
  }

  const uploadedImage = await uploadService.uploadImage(file, {
    folder: "users/profile",
    width: 500,
    height: 500,
    quality: 80,
    format: "webp",
    fit: "cover",
  });

  user.profileImage = {
    url: uploadedImage.url,
    public_id: uploadedImage.public_id,
  };

  await user.save();
  user.password = undefined;
  return user;
};
```

Key details worth remembering:
- **Old image cleanup**: deleting the previous Cloudinary asset *before*
  uploading the new one avoids storage/cost leaks from orphaned images.
- **Standardized processing**: every profile image is forced to
  500×500, `webp`, quality 80, `fit: cover` — consistent thumbnails
  regardless of what the user uploads.
- **Password stripped**: `user.password = undefined` before returning,
  since Mongoose would otherwise include the hashed password field in the
  response.

### `deleteProfileImage`

```js
exports.deleteProfileImage = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (!user.profileImage?.public_id) {
    throw new AppError("Profile image not found", 404);
  }
  await deleteFromCloudinary(user.profileImage.public_id);
  user.profileImage = { url: null, public_id: null };
  await user.save();
};
```
Deletes from Cloudinary, then resets the field to nulls (doesn't remove
the sub-document, just clears it — keeps the schema shape consistent).

### Confirmed controller — `userController.js`

```js
exports.updateProfileImage = catchAsync(async (req, res, next) => {
  const user = await userService.updateProfileImage(req.user.id, req.file);
  res.status(200).json({ success: true, message: "Profile image updated successfully", data: user });
});

exports.updateUserProfileImage = catchAsync(async (req, res) => {
  const user = await userService.updateProfileImage(req.params.id, req.file);
  res.status(200).json({ success: true, message: "User profile image updated successfully", data: user });
});

exports.deleteMyProfileImage = catchAsync(async (req, res) => {
  await userService.deleteProfileImage(req.user.id);
  res.status(200).json({ success: true, message: "Profile image deleted successfully" });
});

exports.deleteUserProfileImage = catchAsync(async (req, res) => {
  await userService.deleteProfileImage(req.params.id);
  res.status(200).json({ success: true, message: "User profile image deleted successfully." });
});
```

Note the consistent pattern: a **"me"** version (acts on `req.user.id`,
for the logged-in user) and an **admin** version (acts on
`req.params.id`, presumably gated by `restrictTo("admin")` in the route
file) for every mutating action. This same pattern is reused for the
gallery feature below.

## Feature 2: Image Gallery (designed; being implemented)

### Why `profileImage` wasn't reused for this
Decision made deliberately: **don't overload `profileImage` to hold an
array.** Keep `profileImage` as the single "avatar" concept, and add a
separate `images[]` array for a gallery — this mirrors how production
apps (e-commerce product photos, portfolio sites) separate "the one
featured image" from "the full set."

### Schema addition (`models/User.js`)

```js
images: [
  {
    url:        { type: String, required: true },
    public_id:  { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
],
```

### Planned service — `userService.addUserImages`

```js
exports.addUserImages = async (userId, files) => {
  if (!files || files.length === 0) {
    throw new AppError("Please upload at least one image.", 400);
  }
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);

  const uploadedImages = await uploadService.uploadImages(files, {
    folder: "users/gallery",
    width: 800,
    height: 800,
    quality: 80,
    format: "webp",
    fit: "cover",
  });

  user.images.push(...uploadedImages);   // appends, doesn't overwrite
  await user.save();
  user.password = undefined;
  return user;
};
```

Note this calls a **plural** `uploadService.uploadImages(files, options)`
— different from the singular `uploadImage(file, options)` used by the
profile-image flow. `uploadService.js` needs a plural method that loops
over multiple files and returns an array of `{ url, public_id }`.

### Planned controller additions

```js
exports.addUserImages = catchAsync(async (req, res) => {
  const user = await userService.addUserImages(req.params.id, req.files);
  res.status(200).json({ success: true, message: "Images uploaded successfully.", data: user });
});

exports.addMyImages = catchAsync(async (req, res) => {
  const user = await userService.addUserImages(req.user.id, req.files);
  res.status(200).json({ success: true, message: "Images uploaded successfully.", data: user });
});
```

Note `req.files` (plural, from `upload.array(...)`) vs. `req.file`
(singular, from `upload.single(...)`) used by the profile-image routes.

### Planned routes

```js
// admin — upload gallery images for any user
router.post(
  "/:id/images",
  restrictTo("admin"),
  upload.array("images", 10),
  userController.addUserImages
);

// logged-in user — upload their own gallery images
router.post(
  "/me/images",
  upload.array("images", 10),
  userController.addMyImages
);
```

`upload.array("images", 10)` — the Multer field name **must be
`"images"`** in the multipart form, and it accepts up to 10 files per
request.

### Full planned API surface for this feature

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `PATCH` | `/api/users/me/profile-image` | self | Update own profile image |
| `PATCH` | `/api/users/:id/profile-image` | admin | Update any user's profile image |
| `DELETE` | `/api/users/me/profile-image` | self | Delete own profile image |
| `DELETE` | `/api/users/:id/profile-image` | admin | Delete any user's profile image |
| `POST` | `/api/users/me/images` | self | Add gallery images (own) |
| `POST` | `/api/users/:id/images` | admin | Add gallery images (any user) |
| `GET` | `/api/users/me/images` | self | List own gallery — **not yet implemented** |
| `GET` | `/api/users/:id/images` | admin | List a user's gallery — **not yet implemented** |
| `DELETE` | `/api/users/me/images/:publicId` | self | Delete one gallery image — **not yet implemented** |
| `DELETE` | `/api/users/:id/images/:publicId` | admin | Delete one gallery image — **not yet implemented** |
| `DELETE` | `/api/users/me/images` | self | Delete entire gallery — **not yet implemented** |

### Implementation status (as of this doc)

- ✅ Schema plan finalized (`images[]` sub-document array)
- ✅ `addUserImages` service — written, not yet confirmed pasted/tested
- ✅ `addUserImages` / `addMyImages` controllers — written
- ✅ Routes for uploading — written
- ⬜ `uploadService.uploadImages` (plural) — needs to exist; only the
  singular `uploadImage` was confirmed so far
- ⬜ `GET` list gallery endpoint
- ⬜ `DELETE` single image from gallery (remove from Cloudinary **and**
  `$pull` from the `images` array)
- ⬜ `DELETE` entire gallery (loop-delete every `public_id` from
  Cloudinary, then clear the array)

### Next implementation steps (when you resume this feature)

1. Add `uploadService.uploadImages(files, options)` — likely
   `Promise.all(files.map(f => uploadService.uploadImage(f, options)))`.
2. Test `POST /api/users/me/images` with form-data field name `images`
   (multiple files) + `Authorization: Bearer <token>`.
3. Confirm MongoDB shows the `images[]` array populated with
   `url`, `public_id`, `uploadedAt` per image.
4. Build the three remaining endpoints (list, delete-one, delete-all).
5. Update `05-api-reference.md` once each is confirmed working.
