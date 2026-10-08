const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const authService = require('../services/auth.service');
const { rotateRefreshToken, revokeFamily } = require('../services/token.service');

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  // Covers /api/v1/auth/refresh AND /api/v1/auth/logout, so logout can see the cookie
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const register = catchAsync(async (req, res) => {
  const { refreshToken, ...result } = await authService.register(req.body);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
  res.status(201).json({ status: 'success', data: result });
});

const login = catchAsync(async (req, res) => {
  const { refreshToken, ...result } = await authService.login(req.body);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
  res.status(200).json({ status: 'success', data: result });
});

const getMe = catchAsync(async (req, res) => {
  const { password, ...safeUser } = req.user;
  res.status(200).json({ status: 'success', data: safeUser });
});

const refresh = catchAsync(async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    throw new AppError('No refresh token provided', 401, 'NO_REFRESH_TOKEN');
  }

  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(rawToken);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    res.status(200).json({ status: 'success', data: { accessToken } });
  } catch (err) {
    res.clearCookie('refreshToken', { path: REFRESH_COOKIE_OPTS.path });

    if (err.message === 'REFRESH_REUSE_DETECTED') {
      throw new AppError(
        'Session invalidated, please log in again',
        401,
        'REFRESH_REUSE_DETECTED',
      );
    }
    throw new AppError('Invalid or expired session', 401, 'SESSION_INVALID');
  }
});

const logout = catchAsync(async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) await revokeFamily(rawToken);
  res.clearCookie('refreshToken', { path: REFRESH_COOKIE_OPTS.path });
  res.status(200).json({ status: 'success', message: 'Logged out' });
});

module.exports = { register, login, getMe, refresh, logout };