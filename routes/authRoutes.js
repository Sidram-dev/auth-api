const express = require("express");
const router = express.Router();
const AppError = require("../utils/appError");

const authController = require("../controller/authController");
const {
  registerValidation,
  loginValidation,
} = require("../validators/authValidator");
const { validate } = require("../middleware/authMiddleware");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} = require("../middleware/rateLimiter");

router.post(
  "/register",
  registerLimiter,
  registerValidation,
  validate,
  authController.register,
);
router.post(
  "/login",
  loginLimiter,
  loginValidation,
  validate,
  authController.login,
);
router.get("/profile", protect, authController.profile);
router.get("/admin", protect, restrictTo("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome Admin!",
    user: req.user,
  });
});

router.get("/dashboard", protect, restrictTo("user", "admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome " + req.user.name,
    user: req.user,
  });
});

router.get("/user", protect, restrictTo("user"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome " + req.user.name,
    user: req.user,
  });
});

router.get("/manager", protect, restrictTo("manager"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome " + req.user.name,
    user: req.user,
  });
});

router.get("/superadmin", protect, restrictTo("superadmin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome " + req.user.name,
    user: req.user,
  });
});

router.post("/refresh-token", authController.refreshToken);

router.get("/sessions", protect, authController.getSession);

router.delete("/sessions/:sessionId", protect, authController.deleteSession);

router.delete("/sessions", protect, authController.logoutAllDevices);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  authController.forgotPassword,
);

router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
