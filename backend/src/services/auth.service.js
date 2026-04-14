/**
 * Auth Service — user authentication business logic.
 */

const User          = require('../models/user.model');
const generateToken = require('../utils/generateToken');

const registerUser = async ({ name, email, password, role, phone }) => {
  const existing = await User.findOne({ email });
  if (existing) throw { status: 409, message: 'Email already registered' };
  const user  = await User.create({ name, email, password, role, phone });
  const token = generateToken(user._id, user.role);
  return {
    user:  { _id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    throw { status: 401, message: 'Invalid email or password' };
  if (!user.isActive)
    throw { status: 403, message: 'Account is deactivated. Contact admin.' };
  const token = generateToken(user._id, user.role);
  return {
    user:  { _id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  };
};

const getAllUsers = async () => {
  return User.find().select('-password').sort({ createdAt: -1 });
};

const updateUser = async (id, requestingUserId, data) => {
  if (id === requestingUserId.toString())
    throw { status: 400, message: 'You cannot modify your own account status' };
  const user = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
  if (!user) throw { status: 404, message: 'User not found' };
  return user;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!(await user.comparePassword(currentPassword)))
    throw { status: 400, message: 'Current password is incorrect' };
  user.password = newPassword;
  await user.save();
};

module.exports = { registerUser, loginUser, getAllUsers, updateUser, changePassword };
