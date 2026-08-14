require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");

const connectDB = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const globalErrorHandler = require("./middleware/errorMiddleware");
const { apiLimiter } = require("./middleware/rateLimiter");
const cookieParser = require("cookie-parser");

const hpp = require("hpp");
const uploadRoutes = require("./routes/uploadRoutes");

const userRoutes = require("./routes/userRoutes");

const app = express();
const AppError = require("./utils/appError"); // ✅ Correct path

// connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use("/api", apiLimiter);

app.use(hpp());
app.set("query parser", "extended");
app.use("/api/uploads", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Authentication API Running",
  });
});

app.get("/health",(req, res) => {
  res.status(200).json({
    message: "Server is healthy",
    status: "ok"
  });
});

app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on("SIGTERM", async () => {
      console.log("SIGTERM received. Starting graceful shutdown...");

      server.close(async () => {
        console.log("HTTP server closed.");

        await mongoose.connection.close();

        console.log("MongoDB connection closed.");

        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Application startup failed.");
    process.exit(1);
  }
};

startServer();

process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Starting graceful shutdown...");

  server.close(async () => {
    console.log("HTTP server closed.");

    await mongoose.connection.close();

    console.log("MongoDB connection closed.");

    process.exit(0);
  });
});
