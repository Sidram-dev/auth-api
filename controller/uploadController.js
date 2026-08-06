const catchAsync = require("../utils/catchAsync");
const uploadService = require("../services/uploadService");

exports.uploadImages = catchAsync(async (req, res) => {
  const image = await uploadService.uploadImages(req.files, {
    folder: "users/profile",
    width: 500,
    height: 500,
    quality: 80,
    format: "webp",
    fit: "cover",
  });

  res.status(200).json({
    success: true,
    message: "Image uploaded successfully.",
    data: image,
  });
});
