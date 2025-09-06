type Props = {
  data: any;
  onChange: (next: any) => void;
};

export default function Template20ProcedurePanel({ data, onChange }: Props) {
  const handleChange = (field: string) => (e: any) => {
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
        <label>Entity Type</label>
        <input
          placeholder="customer | invoice | contract | opportunity | payment"
          value={data.entityType || ''}
          onChange={handleChange('entityType')}
        />
      </div>

      <div className="form-group">
        <label>Service Name</label>
        <input
          placeholder="Name of database service to execute against"
          value={data.serviceName || ''}
          onChange={handleChange('serviceName')}
        />
      </div>

      <div className="form-group">
        <label>Min Confidence</label>
        <input
          type="number"
          step="0.01"
          min={0}
          max={1}
          value={data.minConfidence ?? 0.8}
          onChange={handleChange('minConfidence')}
        />
      </div>

      <div className="form-group">
        <label>Parameters (JSON)</label>
        <textarea
          rows={6}
          placeholder='{"CustomerID": 123, "ActiveOnly": true}'
          value={data.parameters || ''}
          onChange={handleChange('parameters')}
        />
        <small>Optional JSON object passed to the stored procedure.</small>
      </div>
    </div>
  );
}
