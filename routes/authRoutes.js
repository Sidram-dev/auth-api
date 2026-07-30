const express = require("express");
const router = express.Router();

const authController = require("../controller/authController");
const { registerValidation,loginValidation } = require("../validators/authValidator");
const { validate } = require("../middleware/authMiddleware");
const {protect }=require("../middleware/authMiddleware");

router.post("/register", registerValidation, validate, authController.register);
router.post("/login",loginValidation,validate,authController.login);
router.get("/profile",protect,authController.profile);

module.exports = router;
