const crypto = require("crypto");

const generateRefreshToken = () => {
    return crypto.randomBytes(32).toString("hex");
};
module.exports = generateRefreshToken;