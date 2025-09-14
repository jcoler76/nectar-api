type Props = {
  data: any;
  onChange: (next: any) => void;
};

export default function CsvParsePanel({ data, onChange }: Props) {
  const handle = (field: string) => (e: any) => {
    const value = e?.target ? e.target.value : e;
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="node-panel">
      <div className="form-group">
        <label>Label</label>
        <input value={data.label || ''} onChange={handle('label')} />
      </div>

      <div className="form-group">
        <label>Mode</label>
        <select value={data.mode || 'context'} onChange={handle('mode')}>
          <option value="context">Context/Inline Text</option>
          <option value="url">Fetch From URL</option>
          <option value="inline">Inline Text</option>
        </select>
      </div>

      {(data.mode === 'context' || data.mode === 'inline' || !data.mode) && (
        <div className="form-group">
          <label>CSV Text</label>
          <textarea
            rows={8}
            placeholder="Paste CSV or bind via {{...}}"
            value={data.text || ''}
            onChange={handle('text')}
          />
        </div>
      )}

      {data.mode === 'url' && (
        <div className="form-group">
          <label>URL</label>
          <input
            placeholder="https://... (presigned allowed)"
            value={data.url || ''}
            onChange={handle('url')}
          />
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Delimiter</label>
          <input value={data.delimiter ?? ','} onChange={handle('delimiter')} />
        </div>
        <div className="form-group">
          <label>Has Header</label>
          <select
            value={String(data.hasHeader ?? true)}
            onChange={e => onChange({ ...data, hasHeader: e.target.value === 'true' })}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
        <div className="form-group">
          <label>Trim</label>
          <select
            value={String(data.trim ?? true)}
            onChange={e => onChange({ ...data, trim: e.target.value === 'true' })}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
        <div className="form-group">
          <label>Skip Empty</label>
          <select
            value={String(data.skipEmpty ?? true)}
            onChange={e => onChange({ ...data, skipEmpty: e.target.value === 'true' })}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Explicit Columns (comma-separated)</label>
        <input
          placeholder="col1,col2,col3"
          value={data.columns || ''}
          onChange={handle('columns')}
        />
        <small>Leave blank to infer from header; when no header, objects will be col1..colN</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Output Mode</label>
          <select value={data.outputMode || 'objects'} onChange={handle('outputMode')}>
            <option value="objects">Objects</option>
            <option value="rows">Rows (arrays)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Preview Rows</label>
          <input type="number" value={data.previewRows ?? 10} onChange={handle('previewRows')} />
        </div>
      </div>
    </div>
  );
}
