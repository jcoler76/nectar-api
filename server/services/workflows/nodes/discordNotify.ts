import { WebhookNotificationBase, WebhookPayload } from './base/webhookNotificationBase.js';

export interface DiscordNotifyConfig {
  label?: string;
  webhookUrl: string;
  content?: string;
  username?: string;
  avatarUrl?: string;
  embedTitle?: string;
  embedDescription?: string;
  embedColor?: string; // Hex color from panel
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number; // Decimal color value
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string; icon_url?: string };
    timestamp?: string;
    url?: string;
  }>;
}

/**
 * Discord Webhook Notification Node
 * Sends messages to Discord channels using Webhooks
 *
 * Features:
 * - Simple text messages
 * - Custom username and avatar
 * - Rich embeds with colors, fields, and formatting
 * - Multiple embeds per message (up to 10)
 */
class DiscordNotifier extends WebhookNotificationBase {
  protected getPlatformName(): string {
    return 'Discord';
  }

  protected validateConfig(config: DiscordNotifyConfig): void {
    super.validateConfig(config);
    if (!config.content && (!config.embeds || config.embeds.length === 0)) {
      throw new Error('Either content or embeds is required');
    }

    // Discord limits
    if (config.embeds && config.embeds.length > 10) {
      throw new Error('Discord supports maximum 10 embeds per message');
    }
  }

  protected formatPayload(config: DiscordNotifyConfig, _context: any): WebhookPayload {
    const payload: any = {};

    // Optional text content
    if (config.content) {
      payload.content = config.content;
    }

    // Optional username override
    if (config.username) {
      payload.username = config.username;
    }

    // Optional avatar URL
    if (config.avatarUrl) {
      payload.avatar_url = config.avatarUrl;
    }

    // Build embed from simple fields (from panel) or use advanced embeds
    const embedsList: any[] = [];

    // Simple embed from panel fields
    if (config.embedTitle || config.embedDescription) {
      const embed: any = {};
      if (config.embedTitle) embed.title = config.embedTitle;
      if (config.embedDescription) embed.description = config.embedDescription;
      if (config.embedColor) {
        // Convert hex to decimal
        const hex = config.embedColor.replace('#', '');
        embed.color = parseInt(hex, 16);
      }
      embedsList.push(embed);
    }

    // Advanced embeds (if provided)
    if (config.embeds && config.embeds.length > 0) {
      embedsList.push(...config.embeds);
    }

    if (embedsList.length > 0) {
      payload.embeds = embedsList;
    }

    return payload;
  }
}

const notifier = new DiscordNotifier();

export const execute = async (config: DiscordNotifyConfig, context: any) => {
  return notifier.execute(config, context);
};
