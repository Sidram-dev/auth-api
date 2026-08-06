require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const globalErrorHandler = require("./middleware/errorMiddleware");
const { apiLimiter } = require("./middleware/rateLimiter");

const hpp = require("hpp");
const uploadRoutes = require("./routes/uploadRoutes");

const userRoutes = require("./routes/userRoutes");

const app = express();

connectDB();

app.use(express.json());
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

app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
