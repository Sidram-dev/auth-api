const User = require("../models/User");

const generateToken = require("../utils/generateToken");

exports.registerUser = async (userData) => {
  const { name, email, password } = userData;

  const userexist = await User.findOne({ email });
  if (userexist) {
    throw new Error(" Email already exist");
  }
  const user = await User.create({
    name,
    email,
    password,
  });
  return user;
};

exports.loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }
  const token = generateToken(user.id);
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
