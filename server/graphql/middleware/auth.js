const jwt = require('jsonwebtoken');
const { validateToken } = require('../../utils/tokenService');
const User = require('../../models/User');

const getUser = async req => {
  let token = req.headers.authorization;

  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return null;

  try {
    // Use enhanced token validation with blacklist checking
    const decoded = await validateToken(token);
    const user = await User.findById(decoded.userId).populate('roles');

    if (!user || !user.isActive) return null;

    return {
      userId: user._id.toString(),
      email: user.email,
      isAdmin: user.isAdmin,
      roles: user.roles,
      user: user,
    };
  } catch (error) {
    console.error('GraphQL Auth Error:', error);
    return null;
  }
};

module.exports = {
  getUser,
};
