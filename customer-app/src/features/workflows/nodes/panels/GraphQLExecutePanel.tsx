type Props = {
  data: any;
  onChange: (next: any) => void;
};

export default function GraphQLExecutePanel({ data, onChange }: Props) {
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
        <label>Operation Name (optional)</label>
        <input value={data.operationName || ''} onChange={handleChange('operationName')} />
      </div>

      <div className="form-group">
        <label>Query</label>
        <textarea
          rows={10}
          placeholder={'query GetCustomer($id: ID!) {\n  customer(id: $id) { id name }\n}'}
          value={data.query || ''}
          onChange={handleChange('query')}
        />
      </div>

      <div className="form-group">
        <label>Variables (JSON)</label>
        <textarea
          rows={6}
          placeholder='{"id": "123"}'
          value={data.variables || ''}
          onChange={handleChange('variables')}
        />
      </div>
    </div>
  );
}
