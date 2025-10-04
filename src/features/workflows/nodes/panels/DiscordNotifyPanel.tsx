type Props = {
  data: {
    label?: string;
    webhookUrl?: string;
    content?: string;
    username?: string;
    avatarUrl?: string;
    embedTitle?: string;
    embedDescription?: string;
    embedColor?: string;
  };
  onChange: (next: any) => void;
};

export default function DiscordNotifyPanel({ data, onChange }: Props) {
  const update = (patch: any) => onChange({ ...data, ...patch });

  const handleColorChange = (hex: string) => {
    update({ embedColor: hex });
  };

  return (
    <div className="node-panel">
      <div className="form-group">
        <label>Label</label>
        <input value={data.label || ''} onChange={e => update({ label: e.target.value })} />
      </div>

      <div className="form-group">
        <label>
          Webhook URL <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="url"
          placeholder="https://discord.com/api/webhooks/..."
          value={data.webhookUrl || ''}
          onChange={e => update({ webhookUrl: e.target.value })}
        />
        <small style={{ color: '#666', fontSize: '11px' }}>
          Create a webhook in your Discord channel settings
        </small>
      </div>

      <div className="form-group">
        <label>Message Content</label>
        <textarea
          rows={4}
          placeholder="Your message text... (optional if using embeds)"
          value={data.content || ''}
          onChange={e => update({ content: e.target.value })}
        />
        <small style={{ color: '#666', fontSize: '11px' }}>
          Use {'{{'} variableName {'}}'} for dynamic content
        </small>
      </div>

      <details style={{ marginBottom: '15px' }} open>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
          Rich Embed
        </summary>

        <div className="form-group">
          <label>Embed Title</label>
          <input
            placeholder="Notification Title"
            value={data.embedTitle || ''}
            onChange={e => update({ embedTitle: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Embed Description</label>
          <textarea
            rows={4}
            placeholder="Detailed description..."
            value={data.embedDescription || ''}
            onChange={e => update({ embedDescription: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Embed Color</label>
          <input
            type="color"
            value={data.embedColor || '#5865F2'}
            onChange={e => handleColorChange(e.target.value)}
          />
          <small style={{ color: '#666', fontSize: '11px', marginLeft: '10px' }}>
            {data.embedColor || '#5865F2'}
          </small>
        </div>
      </details>

      <details style={{ marginBottom: '15px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
          Advanced Options
        </summary>

        <div className="form-group">
          <label>Custom Username</label>
          <input
            placeholder="Workflow Bot"
            value={data.username || ''}
            onChange={e => update({ username: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Avatar URL</label>
          <input
            type="url"
            placeholder="https://example.com/avatar.png"
            value={data.avatarUrl || ''}
            onChange={e => update({ avatarUrl: e.target.value })}
          />
        </div>
      </details>
    </div>
  );
}
