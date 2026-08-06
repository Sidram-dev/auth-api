const User = require("../models/User");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/AppError");
const uploadService = require("../services/uploadService");
const deleteFromCloudinary = require("../utils/cloudinaryDelete");

exports.getAllUsers = async (queryString) => {
  const totalResults = await User.countDocuments();
  const features = new APIFeatures(User.find(), queryString)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;

  const page = Number(queryString.page) || 1;
  const limit = Number(queryString.limit) || 10;

  const totalPages = Math.ceil(totalResults / limit);

  return {
    users,
    pagination: {
      page,
      limit,
      totalPages,
      totalResults,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

exports.addUserImages = async (userId, files) => {
  if (!files || files.length === 0) {
    throw new AppError("Please upload at least one image.", 400);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const uploadedImages = await uploadService.uploadImages(files, {
    folder: "users/gallery",
    width: 800,
    height: 800,
    quality: 80,
    format: "webp",
    fit: "cover",
  });

  user.images.push(...uploadedImages);

  await user.save();

  user.password = undefined;

  return user;
};

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

exports.deleteProfileImage = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (!user.profileImage?.public_id) {
    throw new AppError("Profile image not found", 404);
  }

  await deleteFromCloudinary(user.profileImage.public_id);

  user.profileImage = {
    url: null,
    public_id: null,
  };

  await user.save();
};
