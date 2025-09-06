export default function ApprovalPanel({ data, onChange }) {
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
        <label>Instructions</label>
        <textarea
          rows={4}
          placeholder="Provide guidance to approvers"
          value={data.instructions || ''}
          onChange={handleChange('instructions')}
        />
      </div>

      <div className="form-group">
        <label>Approvers (emails, comma-separated)</label>
        <input
          placeholder="user1@example.com, user2@example.com"
          value={data.approvers || ''}
          onChange={handleChange('approvers')}
        />
      </div>

      <div className="form-group">
        <label>Auto Decision (for testing)</label>
        <select value={data.autoDecision || ''} onChange={handleChange('autoDecision')}>
          <option value="">None</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>
      </div>
    </div>
  );
}
