const authService = require("../services/authService");

const catchAsync = require("../utils/catchAsync");

const AppError = require("../utils/appError");

// exports.register = async (req, res) => {
//   try {
//     const user = await authService.registerUser(req.body);

//     if (!user) {
//       res.status(400).json({
//         success: false,
//         message: "User not registered",
//       });
//     }
//     res.status(200).json({
//       success: true,
//       message: "User registered successfully",
//       data: user,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "development",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

exports.register = catchAsync(async (req, res) => {
  const result = await authService.registerUser(req.body, {
    userAgent: req.get("User-Agent"),
    ipAddress: req.ip,
  });

  res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

  res.status(200).json({
    success: true,
    message: "User registered successfully",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

exports.login = catchAsync(async (req, res) => {
  const result = await authService.loginUser(req.body, {
    userAgent: req.get("User-Agent"),
    ipAddress: req.ip,
  });

  res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

exports.profile = async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
};

exports.refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken, {
    userAgent: req.get("User-Agent"),
    ipAddress: req.ip,
  });
  res.status(200).json({
    suceess: true,
    message: "Token refreshed successfully",
    data: result,
  });
});

exports.getSession = catchAsync(async (req, res) => {
  const session = await authService.getUserSession(req.user._id);
  res.status(200).json({
    success: true,
    message: "User session retrieved successfully",
    count: session.length,
    data: session,
  });
});

exports.deleteSession = catchAsync(async (req, res) => {
  await authService.deleteSession(req.params.sessionId, req.user._id);
  res.status(200).json({
    success: true,
    message: "Session deleted successfully",
  });
});

exports.logoutAllDevices = catchAsync(async (req, res) => {
  const deletedCount = await authService.logoutAllDevices(req.user._id);
  res.status(200).json({
    success: true,
    message: "Logged out from all devices successfully",
    deletedSessions: deletedCount,
  });
});

exports.forgotPassword = async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);

  res.status(200).json({
    success: true,
    message: "Password reset token generated successfully.",
    data: result,
  });
};

exports.resetPassword = async (req, res) => {
  const result = await authService.resetPassword(
    req.params.token,
    req.body.password,
  );
  res.status(200).json({
    success: true,
    message: "Password reset successfully.",
    data: result,
  });
};
