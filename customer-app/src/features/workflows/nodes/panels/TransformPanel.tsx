type Mapping = { to: string; from: string };

type Props = {
  data: { label?: string; mappings?: Mapping[]; requireFields?: string[] };
  onChange: (next: any) => void;
};

export default function TransformPanel({ data, onChange }: Props) {
  const mappings = data.mappings || [];

  const update = (patch: any) => onChange({ ...data, ...patch });
  const updateMapping = (idx: number, field: keyof Mapping, value: string) => {
    const next = [...mappings];
    next[idx] = { ...next[idx], [field]: value } as Mapping;
    update({ mappings: next });
  };
  const addMapping = () => update({ mappings: [...mappings, { to: '', from: '' }] });
  const removeMapping = (idx: number) => update({ mappings: mappings.filter((_, i) => i !== idx) });

  return (
    <div className="node-panel">
      <div className="form-group">
        <label>Label</label>
        <input value={data.label || ''} onChange={e => update({ label: e.target.value })} />
      </div>

      <div className="form-group">
        <label>Mappings</label>
        {mappings.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              placeholder="to path (e.g., result.customer.id)"
              value={m.to}
              onChange={e => updateMapping(i, 'to', e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              placeholder="from path (e.g., trigger.customer.id)"
              value={m.from}
              onChange={e => updateMapping(i, 'from', e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => removeMapping(i)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addMapping}>
          Add Mapping
        </button>
      </div>

      <div className="form-group">
        <label>Required Fields (comma-separated)</label>
        <input
          placeholder="result.customer.id,result.order.total"
          value={(data.requireFields || []).join(',')}
          onChange={e =>
            update({
              requireFields: e.target.value
                .split(',')
                .map(s => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </div>
  );
}
