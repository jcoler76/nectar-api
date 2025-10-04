type Props = {
  data: {
    label?: string;
    botToken?: string;
    chatId?: string;
    message?: string;
    parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
    disableWebPagePreview?: boolean;
    disableNotification?: boolean;
  };
  onChange: (next: any) => void;
};

export default function TelegramNotifyPanel({ data, onChange }: Props) {
  const update = (patch: any) => onChange({ ...data, ...patch });

  return (
    <div className="node-panel">
      <div className="form-group">
        <label>Label</label>
        <input value={data.label || ''} onChange={e => update({ label: e.target.value })} />
      </div>

      <div className="form-group">
        <label>
          Bot Token <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="password"
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          value={data.botToken || ''}
          onChange={e => update({ botToken: e.target.value })}
        />
        <small style={{ color: '#666', fontSize: '11px' }}>
          Create a bot with @BotFather on Telegram to get a token
        </small>
      </div>

      <div className="form-group">
        <label>
          Chat ID <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          placeholder="-1001234567890 or @channelname"
          value={data.chatId || ''}
          onChange={e => update({ chatId: e.target.value })}
        />
        <small style={{ color: '#666', fontSize: '11px' }}>
          Use @userinfobot to find your chat ID, or use @channelname for public channels
        </small>
      </div>

      <div className="form-group">
        <label>
          Message <span style={{ color: 'red' }}>*</span>
        </label>
        <textarea
          rows={6}
          placeholder="Your message here... Use {{ variableName }} for dynamic content"
          value={data.message || ''}
          onChange={e => update({ message: e.target.value })}
        />
      </div>

      <details style={{ marginBottom: '15px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
          Formatting Options
        </summary>

        <div className="form-group">
          <label>Parse Mode</label>
          <select
            value={data.parseMode || ''}
            onChange={e =>
              update({
                parseMode: e.target.value || undefined,
              })
            }
          >
            <option value="">None (Plain Text)</option>
            <option value="Markdown">Markdown</option>
            <option value="HTML">HTML</option>
            <option value="MarkdownV2">MarkdownV2</option>
          </select>
          <small style={{ color: '#666', fontSize: '11px' }}>
            Format your message with Markdown or HTML
          </small>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={data.disableWebPagePreview || false}
              onChange={e => update({ disableWebPagePreview: e.target.checked })}
            />
            <span style={{ marginLeft: '8px' }}>Disable Web Page Preview</span>
          </label>
          <small style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '5px' }}>
            Don't show link previews in the message
          </small>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={data.disableNotification || false}
              onChange={e => update({ disableNotification: e.target.checked })}
            />
            <span style={{ marginLeft: '8px' }}>Silent Notification</span>
          </label>
          <small style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '5px' }}>
            Send notification without sound
          </small>
        </div>
      </details>

      <div
        style={{
          background: '#f0f7ff',
          border: '1px solid #bdd7f0',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        <strong>Setup Guide:</strong>
        <ol style={{ marginTop: '5px', marginBottom: '0', paddingLeft: '20px' }}>
          <li>Open Telegram and search for @BotFather</li>
          <li>Send /newbot and follow the prompts</li>
          <li>Copy the bot token provided</li>
          <li>Add your bot to a channel/group or start a private chat</li>
          <li>Use @userinfobot to find the chat ID, or use the channel username</li>
        </ol>
      </div>
    </div>
  );
}
