import { useEffect, useState } from 'react'
import api, { APIError } from '../../services/api'

type SecuritySettings = {
  apiAuthHeader: string
  apiHeaderAliases: string[]
  corsAllowedOrigins: string[]
}

export default function SecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await api.get<SecuritySettings>('/admin/settings/security')
        if (!mounted) return
        setSettings(data)
      } catch (e) {
        setError(e instanceof APIError ? e.message : 'Failed to load settings')
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.put('/admin/settings/security', {
        apiAuthHeader: settings.apiAuthHeader,
        apiHeaderAliases: settings.apiHeaderAliases,
      })
      setSuccess('Settings updated')
    } catch (e) {
      setError(e instanceof APIError ? e.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="bg-white rounded-lg shadow p-6">Loading security settings...</div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
        <p className="text-sm text-gray-600">Configure API key header and aliases used by clients.</p>
      </div>
      <div className="p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">{success}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700">Primary API Key Header</label>
          <input
            type="text"
            value={settings.apiAuthHeader}
            onChange={(e) => setSettings({ ...settings, apiAuthHeader: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            placeholder="x-nectarstudio-api-key"
          />
          <p className="text-xs text-gray-500 mt-1">Recommended: keep canonical header and map vanity headers at gateway.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Header Aliases (comma-separated)</label>
          <input
            type="text"
            value={settings.apiHeaderAliases.join(',')}
            onChange={(e) => setSettings({ ...settings, apiHeaderAliases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            placeholder="x-theirco-api-key,x-legacy-api-key"
          />
          <p className="text-xs text-gray-500 mt-1">Clients sending any of these headers will be accepted.</p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

