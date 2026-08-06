const sharp = require("sharp");

const processImage = async (
  buffer,
  {
    width = 500,
    height = 500,
    quality = 80,
    format = "webp",
    fit = "cover",
  } = {}
) => {
  let image = sharp(buffer).resize(width, height, { fit });

  switch (format) {
    case "jpeg":
      image = image.jpeg({ quality });
      break;

    case "png":
      image = image.png({ quality });
      break;

    default:
      image = image.webp({ quality });
  }

  return image.toBuffer();
};

module.exports = processImage;