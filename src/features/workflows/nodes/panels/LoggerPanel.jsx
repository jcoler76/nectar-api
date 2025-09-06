const levels = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
];

export default function LoggerPanel({ data, onChange }) {
  const handleChange = field => e => {
    const value = e?.target ? e.target.value : e;
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="node-panel">
      <div className="form-group">
        <label>Label</label>
        <input value={data.label || ''} onChange={handleChange('label')} />
      </div>

      <div className="form-group">
        <label>Level</label>
        <select value={data.logLevel || 'info'} onChange={handleChange('logLevel')}>
          {levels.map(lvl => (
            <option key={lvl.value} value={lvl.value}>
              {lvl.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Message</label>
        <textarea
          rows={4}
          placeholder="Message to log. You can use template variables like {{input}}"
          value={data.message || ''}
          onChange={handleChange('message')}
        />
      </div>
    </div>
  );
}
