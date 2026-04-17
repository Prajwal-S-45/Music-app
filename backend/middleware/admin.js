const User = require('../models/User');

const parseAdminEmails = () => {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const adminEmails = parseAdminEmails();
    const isAdmin = adminEmails.includes((user.email || '').toLowerCase());

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Admin check failed' });
  }
};

module.exports = adminMiddleware;
