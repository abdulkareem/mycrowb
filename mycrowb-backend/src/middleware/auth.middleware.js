const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

function authorize(...roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Missing token' });

    try {
      const payload = jwt.verify(token, jwtSecret);
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      req.user = payload;
      next();
    } catch (_e) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}

module.exports = { authorize };
