const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecret';

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('🛡️ Auth header:', authHeader);

  const token = authHeader?.split(' ')[1];
  if (!token) {
    console.warn('🚫 No token provided');
    return res.status(401).json({ status: false, msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    console.log('✅ Token valid:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Token invalid:', err.message);
    return res.status(403).json({ status: false, msg: 'Invalid token' });
  }
};
