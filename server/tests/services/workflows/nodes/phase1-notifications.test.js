/**
 * Phase 1 Integration Tests - Communication Notifications
 * Tests for Slack, Discord, and Telegram workflow nodes
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

// Mock node-fetch before requiring the modules
jest.mock('node-fetch');
const fetch = require('node-fetch');

describe('Phase 1 Communication Integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Slack Notification', () => {
    it('should send a basic Slack message', async () => {
      const { execute } = require('../../../../services/workflows/nodes/slackNotify');

      // Mock successful response
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const config = {
        webhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
        message: 'Test notification',
      };

      const result = await execute(config, {});

      expect(result.success).toBe(true);
      expect(result.platform).toBe('Slack');
      expect(fetch).toHaveBeenCalledWith(
        config.webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const callArgs = fetch.mock.calls[0][1];
      const payload = JSON.parse(callArgs.body);
      expect(payload.text).toBe('Test notification');
    });

    it('should include optional fields in Slack message', async () => {
      const { execute } = require('../../../../services/workflows/nodes/slackNotify');

      fetch.mockResolvedValue({ ok: true, status: 200 });

      const config = {
        webhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
        message: 'Test notification',
        username: 'Custom Bot',
        iconEmoji: ':robot_face:',
        channel: '#general',
      };

      const result = await execute(config, {});

      expect(result.success).toBe(true);
      const callArgs = fetch.mock.calls[0][1];
      const payload = JSON.parse(callArgs.body);
      expect(payload.username).toBe('Custom Bot');
      expect(payload.icon_emoji).toBe(':robot_face:');
      expect(payload.channel).toBe('#general');
    });

    it('should handle Slack webhook errors', async () => {
      const { execute } = require('../../../../services/workflows/nodes/slackNotify');

      fetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid webhook',
      });

      const config = {
        webhookUrl: 'https://hooks.slack.com/services/INVALID',
        message: 'Test',
      };

      const result = await execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack webhook failed');
    });

    it('should require message field', async () => {
      const { execute } = require('../../../../services/workflows/nodes/slackNotify');

      const config = {
        webhookUrl: 'https://hooks.slack.com/services/TEST',
        // message missing
      };

      const result = await execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('message is required');
    });
  });

  describe('Discord Notification', () => {
    it('should send a basic Discord message', async () => {
      const { execute } = require('../../../../services/workflows/nodes/discordNotify');

      fetch.mockResolvedValue({ ok: true, status: 200 });

      const config = {
        webhookUrl: 'https://discord.com/api/webhooks/TEST',
        content: 'Test notification',
      };

      const result = await execute(config, {});

      expect(result.success).toBe(true);
      expect(result.platform).toBe('Discord');
      const callArgs = fetch.mock.calls[0][1];
      const payload = JSON.parse(callArgs.body);
      expect(payload.content).toBe('Test notification');
    });

    it('should send Discord message with embed', async () => {
      const { execute } = require('../../../../services/workflows/nodes/discordNotify');

      fetch.mockResolvedValue({ ok: true, status: 200 });

      const config = {
        webhookUrl: 'https://discord.com/api/webhooks/TEST',
        embedTitle: 'Alert',
        embedDescription: 'Something happened',
        embedColor: '#FF5733',
      };

      const result = await execute(config, {});

      expect(result.success).toBe(true);
      const callArgs = fetch.mock.calls[0][1];
      const payload = JSON.parse(callArgs.body);
      expect(payload.embeds).toHaveLength(1);
      expect(payload.embeds[0].title).toBe('Alert');
      expect(payload.embeds[0].description).toBe('Something happened');
      expect(payload.embeds[0].color).toBe(16733491); // Hex FF5733 in decimal
    });

    it('should require content or embeds', async () => {
      const { execute } = require('../../../../services/workflows/nodes/discordNotify');

      const config = {
        webhookUrl: 'https://discord.com/api/webhooks/TEST',
        // No content or embeds
      };

      const result = await execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Either content or embeds is required');
    });
  });

  describe('Telegram Notification', () => {
    it('should send a basic Telegram message', async () => {
      const { execute } = require('../../../../services/workflows/nodes/telegramNotify');

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          result: { message_id: 123 },
        }),
      });

      const config = {
        botToken: '123456:ABC-DEF1234',
        chatId: '987654321',
        message: 'Test notification',
      };

      const result = await execute(config, {});

      expect(result.success).toBe(true);
      expect(result.platform).toBe('Telegram');
      expect(result.messageId).toBe(123);

      const callUrl = fetch.mock.calls[0][0];
      expect(callUrl).toContain('api.telegram.org');
      expect(callUrl).toContain(config.botToken);

      const callArgs = fetch.mock.calls[0][1];
      const payload = JSON.parse(callArgs.body);
      expect(payload.chat_id).toBe('987654321');
      expect(payload.text).toBe('Test notification');
    });

    it('should support Telegram formatting options', async () => {
      const { execute } = require('../../../../services/workflows/nodes/telegramNotify');

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: {} }),
      });

      const config = {
        botToken: '123456:ABC-DEF1234',
        chatId: '987654321',
        message: '*Bold text*',
        parseMode: 'Markdown',
        disableWebPagePreview: true,
        disableNotification: true,
      };

      const result = await execute(config, {});

      expect(result.success).toBe(true);
      const callArgs = fetch.mock.calls[0][1];
      const payload = JSON.parse(callArgs.body);
      expect(payload.parse_mode).toBe('Markdown');
      expect(payload.disable_web_page_preview).toBe(true);
      expect(payload.disable_notification).toBe(true);
    });

    it('should handle Telegram API errors', async () => {
      const { execute } = require('../../../../services/workflows/nodes/telegramNotify');

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: false,
          description: 'Bad Request: chat not found',
        }),
      });

      const config = {
        botToken: '123456:ABC-DEF1234',
        chatId: 'INVALID',
        message: 'Test',
      };

      const result = await execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Telegram API error');
      expect(result.error).toContain('chat not found');
    });

    it('should require all required fields', async () => {
      const { execute } = require('../../../../services/workflows/nodes/telegramNotify');

      const config = {
        botToken: '123456:ABC',
        // Missing chatId and message
      };

      const result = await execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('Shared Base Class', () => {
    it('should validate webhookUrl in base class', async () => {
      const { execute } = require('../../../../services/workflows/nodes/slackNotify');

      const config = {
        // Missing webhookUrl
        message: 'Test',
      };

      const result = await execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('webhookUrl is required');
    });
  });
});
