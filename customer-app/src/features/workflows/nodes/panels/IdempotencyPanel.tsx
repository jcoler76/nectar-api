type Props = {
  data: { label?: string; key?: string; ttlSeconds?: number };
  onChange: (next: any) => void;
};

export default function IdempotencyPanel({ data, onChange }: Props) {
  const update = (patch: any) => onChange({ ...data, ...patch });

  return (
    <div className="node-panel">
      <div className="form-group">
        <label>Label</label>
        <input value={data.label || ''} onChange={e => update({ label: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Idempotency Key</label>
        <input
          placeholder="e.g., {{trigger.orderId}}:{{input.hash}}"
          value={data.key || ''}
          onChange={e => update({ key: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>TTL (seconds)</label>
        <input
          type="number"
          min={60}
          step={60}
          value={data.ttlSeconds ?? 86400}
          onChange={e => update({ ttlSeconds: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
