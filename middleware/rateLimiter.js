const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    message :{
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes"
    }
})

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs   
    message: {
        success: false,
        message: "Too many login attempts from this IP, please try again after 15 minutes"
    }
})

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 register requests per windowMs
    message: {
        success: false,
        message: "Too many accounts created from this IP, please try again after an hour"
    }
})

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 forgot password requests per windowMs
    message: {
        success: false,
        message: "Too many password reset requests from this IP, please try again after 15 minutes"
    }
})

module.exports = {apiLimiter, loginLimiter, registerLimiter, forgotPasswordLimiter}

