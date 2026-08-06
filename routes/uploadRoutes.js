const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const uploadController = require("../controller/uploadController");

router.post(
  "/profile",
  upload.array("images",5),
  uploadController.uploadImages
);


module.exports = router;