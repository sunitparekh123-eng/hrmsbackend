const authService = require('../services/auth.service');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return success(res, 'Login successful', result, 200);
    } catch (err) {
      logger.error(`Login error: ${err.message}`);
      return next(err);
    }
  }

  async register(req, res, next) {
    try {
      const employeeData = req.body;
      const issuedBy = req.employee ? req.employee.id : null;
      const result = await authService.register(employeeData, issuedBy);
      return success(res, 'Employee onboarded successfully', result, 201);
    } catch (err) {
      logger.error(`Register error: ${err.message}`);
      return next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return success(res, 'Token refreshed successfully', result, 200);
    } catch (err) {
      logger.error(`Refresh token error: ${err.message}`);
      return next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const employeeId = req.employee.id;
      await authService.changePassword(employeeId, currentPassword, newPassword);
      return success(res, 'Password changed successfully', null, 200);
    } catch (err) {
      logger.error(`Change password error: ${err.message}`);
      return next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const employeeId = req.employee.id;
      await authService.logout(employeeId);
      return success(res, 'Logged out successfully', null, 200);
    } catch (err) {
      logger.error(`Logout error: ${err.message}`);
      return next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const result = await authService.getMe(employeeId);
      return success(res, 'Profile fetched successfully', result, 200);
    } catch (err) {
      logger.error(`Get me error: ${err.message}`);
      return next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      return success(res, 'If that email is registered, a reset link has been sent.', null, 200);
    } catch (err) {
      logger.error(`Forgot password error: ${err.message}`);
      return next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, new_password } = req.body;
      await authService.resetPassword(token, new_password);
      return success(res, 'Password has been reset successfully. You can now login.', null, 200);
    } catch (err) {
      logger.error(`Reset password error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new AuthController();