type Props = {
  data: {
    label?: string;
    webhookUrl?: string;
    message?: string;
    username?: string;
    iconEmoji?: string;
    channel?: string;
  };
  onChange: (next: any) => void;
};

export default function SlackNotifyPanel({ data, onChange }: Props) {
  const update = (patch: any) => onChange({ ...data, ...patch });

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
          placeholder="https://hooks.slack.com/services/..."
          value={data.webhookUrl || ''}
          onChange={e => update({ webhookUrl: e.target.value })}
        />
        <small style={{ color: '#666', fontSize: '11px' }}>
          Create an Incoming Webhook in your Slack workspace settings
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
          Advanced Options
        </summary>

        <div className="form-group">
          <label>Custom Username</label>
          <input
            placeholder="Workflow Bot"
            value={data.username || ''}
            onChange={e => update({ username: e.target.value })}
          />
          <small style={{ color: '#666', fontSize: '11px' }}>Override the default bot name</small>
        </div>

        <div className="form-group">
          <label>Icon Emoji</label>
          <input
            placeholder=":robot_face:"
            value={data.iconEmoji || ''}
            onChange={e => update({ iconEmoji: e.target.value })}
          />
          <small style={{ color: '#666', fontSize: '11px' }}>
            Use Slack emoji notation (e.g., :rocket:)
          </small>
        </div>

        <div className="form-group">
          <label>Channel Override</label>
          <input
            placeholder="#general"
            value={data.channel || ''}
            onChange={e => update({ channel: e.target.value })}
          />
          <small style={{ color: '#666', fontSize: '11px' }}>
            Override the default webhook channel
          </small>
        </div>
      </details>
    </div>
  );
}
