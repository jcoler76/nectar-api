import { logger } from '../../../../utils/logger.js';

export interface WebhookNotificationConfig {
  label?: string;
  webhookUrl: string;
  [key: string]: any;
}

export interface WebhookPayload {
  [key: string]: any;
}

/**
 * Base class for webhook-based notification services (Slack, Discord, Teams, etc.)
 * Provides common webhook execution logic with platform-specific payload formatting
 */
export abstract class WebhookNotificationBase {
  /**
   * Format the payload for the specific platform
   * @param config - Node configuration
   * @param context - Workflow execution context
   */
  protected abstract formatPayload(config: any, context: any): WebhookPayload;

  /**
   * Get the platform name for logging
   */
  protected abstract getPlatformName(): string;

  /**
   * Validate platform-specific configuration
   * @param config - Node configuration
   * @throws Error if validation fails
   */
  protected validateConfig(config: WebhookNotificationConfig): void {
    if (!config.webhookUrl) {
      throw new Error('webhookUrl is required');
    }
  }

  /**
   * Execute the webhook notification
   * @param config - Node configuration
   * @param context - Workflow execution context
   */
  async execute(config: WebhookNotificationConfig, context: any): Promise<any> {
    try {
      this.validateConfig(config);

      const fetch = require('node-fetch');
      const payload = this.formatPayload(config, context);

      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${this.getPlatformName()} webhook failed: ${res.status} ${text}`);
      }

      logger.info(`${this.getPlatformName()} notification sent successfully`, {
        label: config.label,
      });

      return { success: true, platform: this.getPlatformName() };
    } catch (error: any) {
      logger.error(`${this.getPlatformName()} notification failed`, {
        error: error.message,
        label: config.label,
      });
      return { success: false, error: error.message, platform: this.getPlatformName() };
    }
  }
}
