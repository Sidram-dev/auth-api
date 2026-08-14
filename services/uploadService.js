const uploadToCloudinary = require("../utils/cloudinaryUpload");
const AppError = require("../utils/appError");
const processImage = require("../utils/imageProcessor");
exports.uploadImage = async (
  file,
  {
    folder = "uploads",
    width = 500,
    height = 500,
    quality = 80,
    format = "webp",
    fit = "cover",
  } = {},
) => {
  if (!file) {
    throw new AppError("Please upload an image.", 400);
  }

  const processedImage = await processImage(file.buffer, {
    width,
    height,
    quality,
    format,
    fit,
  });

  const result = await uploadToCloudinary(processedImage, folder);

  return {
    url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
};

exports.uploadImages = async (
  files,
  {
    folder = "uploads",
    width = 500,
    height = 500,
    quality = 80,
    format = "webp",
    fit = "cover",
  } = {},
) => {
  if (!files || files.length === 0) {
    throw new AppError("Please upload at least one image.", 400);
  }

  const uploadedImages = [];

  for (const file of files) {
    // Process image
    const processedImage = await processImage(file.buffer, {
      width,
      height,
      quality,
      format,
      fit,
    });

    // Upload to Cloudinary
    const result = await uploadToCloudinary(processedImage, folder);

    uploadedImages.push({
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    });
  }

  return uploadedImages;
};
