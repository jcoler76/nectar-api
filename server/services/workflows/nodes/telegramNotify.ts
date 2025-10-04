import { logger } from '../../../utils/logger.js';

export interface TelegramNotifyConfig {
  label?: string;
  botToken: string;
  chatId: string;
  message: string;
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
}

/**
 * Telegram Bot Notification Node
 * Sends messages to Telegram chats/channels/groups using Bot API
 *
 * Features:
 * - Simple text messages
 * - Markdown and HTML formatting support
 * - Silent notifications
 * - Web page preview control
 *
 * Setup:
 * 1. Create a bot via @BotFather on Telegram
 * 2. Get the bot token
 * 3. Add bot to your channel/group or start a chat
 * 4. Get the chat ID (use @userinfobot or check API responses)
 */
export const execute = async (config: TelegramNotifyConfig, _context: any) => {
  try {
    if (!config.botToken) {
      throw new Error('botToken is required');
    }
    if (!config.chatId) {
      throw new Error('chatId is required');
    }
    if (!config.message) {
      throw new Error('message is required');
    }

    const fetch = require('node-fetch');

    // Telegram Bot API endpoint
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

    const payload: any = {
      chat_id: config.chatId,
      text: config.message,
    };

    // Optional formatting
    if (config.parseMode) {
      payload.parse_mode = config.parseMode;
    }

    if (config.disableWebPagePreview !== undefined) {
      payload.disable_web_page_preview = config.disableWebPagePreview;
    }

    if (config.disableNotification !== undefined) {
      payload.disable_notification = config.disableNotification;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }

    logger.info('Telegram notification sent successfully', {
      label: config.label,
      chatId: config.chatId,
      messageId: data.result?.message_id,
    });

    return {
      success: true,
      platform: 'Telegram',
      messageId: data.result?.message_id,
    };
  } catch (error: any) {
    logger.error('Telegram notification failed', {
      error: error.message,
      label: config.label,
    });
    return {
      success: false,
      error: error.message,
      platform: 'Telegram',
    };
  }
};
