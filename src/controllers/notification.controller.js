const notificationService = require('../services/notification.service');
const { success, paginated } = require('../utils/response');
const logger = require('../utils/logger');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const { page, limit, type, category, isRead } = req.query;
      const result = await notificationService.getNotifications(employeeId, { page, limit, type, category, isRead });
      return paginated(res, 'Notifications fetched', result.data, result.pagination, 200);
    } catch (err) {
      logger.error(`Get notifications error: ${err.message}`);
      return next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const result = await notificationService.markAsRead(id, req.employee.id);
      return success(res, 'Notification marked as read', result, 200);
    } catch (err) {
      logger.error(`Mark as read error: ${err.message}`);
      return next(err);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const employeeId = req.employee.id;
      await notificationService.markAllAsRead(employeeId);
      return success(res, 'All notifications marked as read', null, 200);
    } catch (err) {
      logger.error(`Mark all as read error: ${err.message}`);
      return next(err);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const employeeId = req.employee.id;
      const result = await notificationService.getUnreadCount(employeeId);
      return success(res, 'Unread count fetched', result, 200);
    } catch (err) {
      logger.error(`Get unread count error: ${err.message}`);
      return next(err);
    }
  }
}

module.exports = new NotificationController();