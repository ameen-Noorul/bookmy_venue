const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const config = require("../config");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const router = express.Router();

// Register
router.post(
  "/register",
  catchAsync(async (req, res, next) => {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return next(new AppError("Email and password required", 400));
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return next(new AppError("Email already exists", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role === "OWNER" ? "OWNER" : "USER",
      },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry },
    );

    res.json({
      message: "Account created",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }),
);

// Login
router.post(
  "/login",
  catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Email and password required", 400));
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return next(new AppError("Wrong email or password", 400));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new AppError("Wrong email or password", 400));
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }),
);

module.exports = router;
