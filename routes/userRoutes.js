const express = require("express");
const router = express.Router();

const userController = require("../controller/userController");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.use(protect);
router.use(restrictTo("admin"));

router.get("/", userController.getAllUsers);

router.post("/", protect, restrictTo("admin"), userController.createUser);

router.get("/:id", userController.getUser);

router.patch(
  "/profile-image",
  protect,
  upload.single("photo"),
  userController.updateProfileImage,
);
router.patch("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

router.post(
  "/me/images",
  upload.array("images", 10),
  userController.addMyImages,
);

router.post(
  "/:id/images",
  restrictTo("admin"),
  upload.array("images", 10),
  userController.addUserImages,
);

router.patch(
  "/:id/profile-image",
  protect,
  restrictTo("admin"),
  upload.single("photo"),
  userController.updateProfileImage,
);

router.delete(
  "/me/profile-image",
  protect,
  userController.deleteMyProfileImage,
);

router.delete(
  "/:id/profile-image",
  protect,
  restrictTo("admin"),
  userController.deleteUserProfileImage,
);

module.exports = router;
