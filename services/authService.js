const User = require("../models/User");

const generateToken = require("../utils/generateToken");
const AppError = require("../utils/appError");

const RefreshToken = require("../models/RefreshToken");
const generateRefreshToken = require("../utils/generateRefreshToken");

const crypto = require("crypto");
const sendEmail = require("../utils/email");

exports.registerUser = async (userData, sessionInfo) => {
  const { name, email, password, role } = userData;

  const userexist = await User.findOne({ email });
  if (userexist) {
    throw new AppError(" Email already exist", 400);
  }
  const user = await User.create({
    name,
    email,
    password,
    role,
  });
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken();
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    deviceName: "Unknown Device",
    userAgent: sessionInfo.userAgent,
    ipAddress: sessionInfo.ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

exports.loginUser = async ({ email, password }, sessionInfo) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken();

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    deviceName: "Unknown Device",
    userAgent: sessionInfo.userAgent,
    ipAddress: sessionInfo.ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

exports.refreshAccessToken = async (refreshToken, sessionInfo) => {
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400);
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });

  if (!storedToken) {
    throw new AppError("Invalid refresh token", 401);
  }
  if (storedToken.expiresAt < new Date()) {
    throw new AppError("Refresh token expired", 401);
  }

  const user = await User.findById(storedToken.user);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  await RefreshToken.deleteOne({
    _id: storedToken._id,
  });

  const newRefreshToken = generateRefreshToken();

  await RefreshToken.create({
    token: newRefreshToken,
    user: user._id,
    deviceName: "Unknown Device",
    userAgent: sessionInfo.userAgent,
    ipAddress: sessionInfo.ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const accessToken = generateToken(user);
  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

exports.getUserSession = async (userId) => {
  const session = await RefreshToken.find({ user: userId })
    .select("-token")
    .sort({ createdAt: -1 });
  return session;
};

exports.deleteSession = async (sessionId, userId) => {
  const session = await RefreshToken.findOne({ _id: sessionId, user: userId });
  if (!session) {
    throw new AppError("Session not found", 404);
  }
  await RefreshToken.deleteOne({ _id: sessionId });
  return;
};

exports.logout = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  await RefreshToken.deleteOne({
    token: refreshToken,
  });
};

exports.logoutAllDevices = async (userId) => {
  const reult = await RefreshToken.deleteMany({ user: userId });
  return reult.deletedCount;
};

exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const message = `You requested a password reset. Please click on the following link to reset your password: ${resetURL}. If you did not request this, please ignore this email.`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: message,
      html: `
        <h2>Password Reset</h2>

        <p>Hello <strong>${user.name}</strong>,</p>

        <p>You requested a password reset.</p>

        <p>
          <a href="${resetURL}">
            Click here to reset your password
          </a>
        </p>

        <p>
          This link expires in
          <strong>10 minutes</strong>.
        </p>

        <p>
          If you didn't request this, simply ignore this email.
        </p>

        <hr>

        <small>
          Auth API
        </small>
      `,
    });

    return {
      message: "Password reset email sent successfully.",
    };
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({
      validateBeforeSave: false,
    });

    throw new AppError(
      "Unable to send password reset email. Please try again later.",
      500,
    );
  }
};

exports.resetPassword = async (token, newPassword) => {
  const hasedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hasedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    throw new AppError("Token is invalid or has expired", 400);
  }

  user.password = newPassword;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  user.passwordChangedAt = Date.now();

  await user.save();

  await RefreshToken.deleteMany({ user: user._id });

  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken();

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    accessToken,
    refreshToken,
  };
};
