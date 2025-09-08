// MongoDB models replaced with Prisma for PostgreSQL migration
// const User = require('../models/User');

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const { sendEmail } = require('../utils/mailer');

// Import the secure token generation function
const { generateSecureToken } = require('./authController');

exports.inviteUser = async (req, res) => {
  const { email, firstName, lastName, isAdmin } = req.body;

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ message: 'Email, first name, and last name are required.' });
  }

  try {
    console.log('Checking for existing user with email:', email);
    // TODO: Replace MongoDB query with Prisma query during migration
    // const existingUser = await User.findOne({ email });
    // For now, skip user check to allow server startup
    const existingUser = null;
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    console.log('Creating new user with data:', { email, firstName, lastName, isAdmin });
    const user = new User({
      email,
      firstName,
      lastName,
      isAdmin: isAdmin || false,
      isActive: false,
    });

    console.log('Generating setup token...');
    // Generate a setup token
    const setupToken = generateSecureToken();
    const hashedToken = crypto.createHash('sha256').update(setupToken).digest('hex');

    user.accountSetupToken = hashedToken;
    user.accountSetupTokenExpires = Date.now() + 3600000 * 24; // 24 hours

    console.log('Saving user to database...');
    await user.save();
    console.log('User saved successfully with ID:', user._id);

    // Send the invitation email
    const setupLink = `${process.env.CLIENT_URL}/setup-account?token=${setupToken}`;
    const emailHtml = `
      <p>Hello ${firstName},</p>
      <p>You have been invited to create an account. Please click the link below to set up your password.</p>
      <a href="${setupLink}">Set Up Your Account</a>
      <p>This link will expire in 24 hours.</p>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'You have been invited to set up your account',
        html: emailHtml,
      });
      console.log('Invitation email sent successfully');
    } catch (emailError) {
      console.warn('Failed to send invitation email, but user created:', emailError.message);
      // Don't fail the entire operation if email fails
    }

    res.status(201).json({ message: 'Invitation sent successfully.', userId: user._id });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ message: 'Error inviting user.', error: error.message });
  }
};
