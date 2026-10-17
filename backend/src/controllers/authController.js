const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { formatUserForMobile } = require('../utils/mobileFormat');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password',
      });
    }

    const user = await User.findOne({ employeeId: username })
      .populate('branchId', 'name code')
      .populate('departmentId', 'name code');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    const token = generateToken(user._id);
    const mobileUser = formatUserForMobile(user);

    res.json({
      success: true,
      token,
      user: mobileUser,
      ...mobileUser,
      preferred_language: user.language || 'en',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('branchId', 'name code')
      .populate('departmentId', 'name code')
      .select('-password');

    const mobileUser = formatUserForMobile(user);

    res.json({
      success: true,
      status: true,
      user: mobileUser,
      data: mobileUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updatePreference = async (req, res) => {
  try {
    const language = req.body.language || req.body.preferred_language || 'en';

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { language },
      { new: true }
    )
      .populate('branchId', 'name code')
      .populate('departmentId', 'name code')
      .select('-password');

    const mobileUser = formatUserForMobile(user);

    res.json({ success: true, status: true, user: mobileUser, data: mobileUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const registerPushToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.json({ success: true, message: 'Push token registered' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  login,
  getProfile,
  updatePreference,
  registerPushToken,
};
