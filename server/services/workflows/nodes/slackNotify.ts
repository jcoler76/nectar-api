import { WebhookNotificationBase, WebhookPayload } from './base/webhookNotificationBase.js';

export interface SlackNotifyConfig {
  label?: string;
  webhookUrl: string;
  message: string;
  username?: string;
  iconEmoji?: string;
  channel?: string; // Override default channel
  attachments?: Array<{
    color?: string;
    title?: string;
    text?: string;
    fields?: Array<{ title: string; value: string; short?: boolean }>;
  }>;
}

/**
 * Slack Webhook Notification Node
 * Sends messages to Slack channels using Incoming Webhooks
 *
 * Features:
 * - Simple text messages
 * - Custom username and icon
 * - Rich attachments with colors and fields
 * - Channel override
 */
class SlackNotifier extends WebhookNotificationBase {
  protected getPlatformName(): string {
    return 'Slack';
  }

  protected validateConfig(config: SlackNotifyConfig): void {
    super.validateConfig(config);
    if (!config.message) {
      throw new Error('message is required');
    }
  }

  protected formatPayload(config: SlackNotifyConfig, _context: any): WebhookPayload {
    const payload: any = {
      text: config.message,
    };

    // Optional fields
    if (config.username) {
      payload.username = config.username;
    }

    if (config.iconEmoji) {
      payload.icon_emoji = config.iconEmoji;
    }

    if (config.channel) {
      payload.channel = config.channel;
    }

    if (config.attachments && config.attachments.length > 0) {
      payload.attachments = config.attachments;
    }

    return payload;
  }
}

const notifier = new SlackNotifier();

export const execute = async (config: SlackNotifyConfig, context: any) => {
  return notifier.execute(config, context);
};
