const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'supersecret';

// controllers/authController.js
exports.signup = async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const existing = await User.findOne({ 
        $or: [{ email: username }, { phone: username }] 
      });
      if (existing) return res.status(400).json({ status: false, msg: 'User already exists' });
  
      const passwordHash = bcrypt.hashSync(password, 10);
  
      const newUser = await User.create({
        email: username.includes('@') ? username : undefined,
        phone: /^\d{10,}$/.test(username) ? username : undefined,
        passwordHash
      });
  
      const token = jwt.sign({ id: newUser._id }, SECRET, { expiresIn: '6h' });
      res.json({ status: true, token });
    } catch (err) {
      console.error('❌ Signup error:', err);
      res.status(500).json({ status: false, msg: 'Server error' });
    }
  };
  

  exports.login = async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({
        $or: [{ email: username }, { phone: username }]
      });
  
      if (!user) return res.status(401).json({ status: false, msg: 'User not found' });
  
      const isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch) return res.status(401).json({ status: false, msg: 'Invalid password' });
  
      const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: '6h' });
      res.json({ status: true, token });
    } catch (err) {
      console.error('❌ Login error:', err);
      res.status(500).json({ status: false, msg: 'Server error' });
    }
  };
  
