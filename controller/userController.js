const userService = require("../services/userService");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");
const factory = require("./factoryController");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const user = await userService.getAllUsers(req.query);

  res.status(200).json({
    success: true,
    count: user.length,
    message: "Users retrieved successfully",
    pagination: user.pagination,
    data: user,
  });
});

exports.createUser = factory.createOne(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.addMyImages = catchAsync(async (req, res) => {
  const user = await userService.addUserImages(req.user.id, req.files);

  res.status(200).json({
    success: true,
    message: "Images uploaded successfully.",
    data: user,
  });
});

exports.addUserImages = catchAsync(async (req, res) => {
  const user = await userService.addUserImages(req.params.id, req.files);

  res.status(200).json({
    success: true,
    message: "Images uploaded successfully.",
    data: user,
  });
});

exports.updateProfileImage = catchAsync(async (req, res, next) => {
  const user = await userService.updateProfileImage(req.user.id, req.file);

  res.status(200).json({
    success: true,
    message: "Profile image updated successfully",
    data: user,
  });
});

exports.updateUserProfileImage = catchAsync(async (req, res) => {
  const user = await userService.updateProfileImage(req.params.id, req.file);

  res.status(200).json({
    success: true,
    message: "User profile image updated successfully",
    data: user,
  });
});

exports.deleteMyProfileImage = catchAsync(async (req, res) => {
  await userService.deleteProfileImage(req.user.id);

  res.status(200).json({
    success: true,
    message: "Profile image deleted successfully",
  });
});

exports.deleteUserProfileImage = catchAsync(async (req, res) => {
  await userService.deleteProfileImage(req.params.id);

  res.status(200).json({
    success: true,
    message: "User profile image deleted successfully.",
  });
});
