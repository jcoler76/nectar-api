type Props = {
  data: any;
  onChange: (next: any) => void;
};

const actions = [
  'backupDatabase',
  'restoreDatabaseWithMove',
  'createDatabase',
  'dropDatabase',
  'createLogin',
  'mapUserToLogin',
  'setRecoveryModel',
  'executeSql',
  'configureMirroringPrereqs',
  'setMirrorPartner',
];

export default function SqlServerAdminPanel({ data, onChange }: Props) {
  const handle = (field: string) => (e: any) => {
    const value = e?.target ? e.target.value : e;
    onChange({ ...data, [field]: value });
  };

  const conn = data.connection || {};

  const setConn = (field: string) => (e: any) => {
    const value = e?.target ? e.target.value : e;
    onChange({ ...data, connection: { ...conn, [field]: value } });
  };

  const optionsPlaceholder = JSON.stringify({ backupPath: 'C\\backups\\db.bak' }, null, 2);

  return (
    <div className="node-panel">
      <div className="form-group">
        <label>Label</label>
        <input value={data.label || ''} onChange={handle('label')} />
      </div>

      <fieldset>
        <legend>Connection</legend>
        <div className="form-row">
          <div className="form-group">
            <label>Server</label>
            <input value={conn.server || ''} onChange={setConn('server')} />
          </div>
          <div className="form-group">
            <label>Database</label>
            <input value={conn.database || ''} onChange={setConn('database')} />
          </div>
          <div className="form-group">
            <label>Port</label>
            <input type="number" value={conn.port || 1433} onChange={setConn('port')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Username</label>
            <input value={conn.username || ''} onChange={setConn('username')} />
          </div>
          <div className="form-group">
            <label>Password (or encrypted)</label>
            <input
              type="password"
              value={conn.password || conn.encryptedPassword || ''}
              onChange={setConn('password')}
            />
          </div>
        </div>
      </fieldset>

      <div className="form-group">
        <label>Action</label>
        <select value={data.action || ''} onChange={handle('action')}>
          <option value="">Select action</option>
          {actions.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Options (JSON)</label>
        <textarea
          rows={8}
          placeholder={optionsPlaceholder}
          value={data.options || ''}
          onChange={handle('options')}
        />
      </div>
    </div>
  );
}
