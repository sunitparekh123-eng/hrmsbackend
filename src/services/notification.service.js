const { Notification } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { Op } = require('sequelize');
const { PAGINATION } = require('../utils/constants');

class NotificationService {
  async getNotifications(employeeId, { page = 1, limit = PAGINATION.DEFAULT_LIMIT, type, category, isRead } = {}) {
    const offset = (page - 1) * limit;
    const whereClause = { employee_id: employeeId };
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (isRead !== undefined) whereClause.is_read = isRead === 'true' || isRead === true;

    const { rows, count } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async markAsRead(notificationId, employeeId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, employee_id: employeeId },
    });

    if (!notification) throw new AppError('Notification not found', 404);

    await notification.update({ is_read: true });
    return notification;
  }

  async markAllAsRead(employeeId) {
    await Notification.update(
      { is_read: true },
      { where: { employee_id: employeeId, is_read: false } }
    );
    return true;
  }

  async getUnreadCount(employeeId) {
    const count = await Notification.count({
      where: { employee_id: employeeId, is_read: false },
    });

    return { unread_count: count };
  }

  // Utility: Create notification (used by other services)
  async createNotification(employeeId, title, message, type, category, actionUrl = null) {
    return await Notification.create({
      employee_id: employeeId,
      title,
      message,
      type,
      category,
      is_read: false,
      action_url: actionUrl,
    });
  }
}

module.exports = new NotificationService();