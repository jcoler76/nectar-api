const nodemailer = require('nodemailer');
const { logger } = require('./logger');

const getTransporter = async () => {
  // For development, if no real SMTP server is configured, use a free Ethereal test account.
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
    const testAccount = await nodemailer.createTestAccount();
    logger.info(
      '📫 Using Ethereal for development emails. Preview links will be logged to the console.'
    );
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  // For production or configured development, use the credentials from .env
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends an email.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML body of the email.
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Mirabel API" <no-reply@example.com>',
      to,
      subject,
      html,
    });

    logger.info(`Email sent: ${info.messageId}`);

    // If we're using an Ethereal account, log the preview URL
    if (process.env.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info('📬 Email Preview URL: ' + previewUrl);
      }
    }

    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw new Error('Failed to send email.');
  }
};

module.exports = { sendEmail };
