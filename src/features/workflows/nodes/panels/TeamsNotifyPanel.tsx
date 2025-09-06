type Props = {
  data: { label?: string; webhookUrl?: string; title?: string; message?: string; color?: string };
  onChange: (next: any) => void;
};

export default function TeamsNotifyPanel({ data, onChange }: Props) {
  const update = (patch: any) => onChange({ ...data, ...patch });

  return (
    <div className="node-panel">
      <div className="form-group">
        <label>Label</label>
        <input value={data.label || ''} onChange={e => update({ label: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Incoming Webhook URL</label>
        <input
          value={data.webhookUrl || ''}
          onChange={e => update({ webhookUrl: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Title</label>
        <input value={data.title || ''} onChange={e => update({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Message</label>
        <textarea
          rows={6}
          value={data.message || ''}
          onChange={e => update({ message: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Theme Color</label>
        <input
          placeholder="#0078D4"
          value={data.color || ''}
          onChange={e => update({ color: e.target.value })}
        />
      </div>
    </div>
  );
}
