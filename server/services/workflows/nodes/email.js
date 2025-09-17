const { sendEmail } = require('../../../utils/enhancedMailer');
const { interpolateSecure, SECURITY_CONTEXTS } = require('../interpolationSecure');
const { logger } = require('../../../utils/logger');

const execute = async (config, context) => {
  const { to, subject, htmlBody, attachments = [] } = config;
  logger.info(`Executing Email Node: "${config.label}"`);

  if (!to || !subject) {
    return {
      status: 'error',
      message: 'Email recipient (to) and subject are required.',
    };
  }

  try {
    // Interpolate template variables in all fields using secure interpolation
    const interpolatedTo = interpolateSecure(to, context, SECURITY_CONTEXTS.EMAIL);
    const interpolatedSubject = interpolateSecure(subject, context, SECURITY_CONTEXTS.EMAIL);
    const interpolatedHtmlBody = interpolateSecure(htmlBody || '', context, SECURITY_CONTEXTS.HTML);

    // Process attachments if any
    const processedAttachments = [];
    for (const attachment of attachments) {
      if (attachment.filename && attachment.content) {
        const interpolatedContent = interpolateSecure(
          attachment.content,
          context,
          SECURITY_CONTEXTS.GENERAL
        );

        // Handle both base64 content and URLs
        let attachmentData;
        if (interpolatedContent.startsWith('http')) {
          // It's a URL - we could fetch it, but for now we'll skip URLs
          console.warn(`Skipping URL attachment: ${interpolatedContent}`);
          continue;
        } else {
          // Assume it's base64 content
          attachmentData = {
            filename: attachment.filename,
            content: interpolatedContent,
            encoding: attachment.encoding || 'base64',
          };
        }

        processedAttachments.push(attachmentData);
      }
    }

    logger.info(`Sending email to: ${interpolatedTo}`);
    logger.info(`Subject: ${interpolatedSubject}`);

    const emailResult = await sendEmail({
      to: interpolatedTo,
      subject: interpolatedSubject,
      html: interpolatedHtmlBody || `<p>Email sent from workflow: ${config.label}</p>`,
      attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
    });

    logger.info(`Email sent successfully. Message ID: ${emailResult.messageId}`);

    return {
      status: 'success',
      message: `Email sent successfully to ${interpolatedTo}`,
      messageId: emailResult.messageId,
      previewUrl: emailResult.previewUrl || null,
      sentTo: interpolatedTo,
      subject: interpolatedSubject,
    };
  } catch (error) {
    logger.error(`Email node "${config.label}" failed:`, error.message);

    return {
      status: 'error',
      message: `Failed to send email: ${error.message}`,
      error: error.message,
    };
  }
};

module.exports = {
  execute,
};
