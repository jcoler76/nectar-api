import { logger } from '../../../utils/logger.js';

export interface TeamsNotifyConfig {
  label?: string;
  webhookUrl: string;
  title?: string;
  message: string;
  color?: string; // hex or theme color
}

export const execute = async (config: TeamsNotifyConfig, _context: any) => {
  try {
    const fetch = require('node-fetch');
    if (!config.webhookUrl) throw new Error('webhookUrl is required');

    const body = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: config.color || '0078D4',
      title: config.title || config.label || 'Workflow Notification',
      text: config.message,
    };

    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const ok = res.ok;
    if (!ok) {
      const text = await res.text();
      throw new Error(`Teams webhook failed: ${res.status} ${text}`);
    }

    return { success: true };
  } catch (error: any) {
    logger.error('Teams notify failed', { error: error.message });
    return { success: false, error: error.message };
  }
};
