import { useState } from 'react'
import api, { APIError } from '../../services/api'

export default function ApplicationKeyManager() {
  const [applicationId, setApplicationId] = useState('')
  const [newKey, setNewKey] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setKey = async () => {
    setLoading(true)
    setStatus(null)
    setError(null)
    try {
      await api.post(`/applications/${encodeURIComponent(applicationId)}/set-key`, { apiKey: newKey })
      setStatus('API key set successfully')
      setNewKey('')
    } catch (e) {
      setError(e instanceof APIError ? e.message : 'Failed to set key')
    } finally {
      setLoading(false)
    }
  }

  const regenerate = async () => {
    setLoading(true)
    setStatus(null)
    setError(null)
    try {
      await api.post(`/applications/${encodeURIComponent(applicationId)}/regenerate-key`)
      setStatus('API key regenerated (copy from reveal if needed)')
    } catch (e) {
      setError(e instanceof APIError ? e.message : 'Failed to regenerate key')
    } finally {
      setLoading(false)
    }
  }

  const reveal = async () => {
    setLoading(true)
    setStatus(null)
    setError(null)
    try {
      const res = await api.get<{ success: boolean; apiKey?: string; message?: string }>(`/applications/${encodeURIComponent(applicationId)}/reveal-key`)
      if (res?.apiKey) {
        setStatus(`API key: ${res.apiKey}`)
      } else {
        setStatus(res?.message || 'Key not available; regenerate if needed')
      }
    } catch (e) {
      setError(e instanceof APIError ? e.message : 'Failed to reveal key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Application Key Management</h2>
        <p className="text-sm text-gray-600">Regenerate or set a specific API key for an application.</p>
      </div>
      <div className="p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}
        {status && <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded break-all">{status}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700">Application ID</label>
          <input
            type="text"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            placeholder="app_..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Set Specific API Key (BYO)</label>
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Provide a strong key (>=32 chars, mixed case, number, symbol)"
          />
          <div className="flex gap-3 mt-3">
            <button onClick={setKey} disabled={loading || !applicationId || !newKey} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">Set Key</button>
            <button onClick={regenerate} disabled={loading || !applicationId} className="px-4 py-2 bg-yellow-600 text-white rounded disabled:opacity-50">Regenerate</button>
            <button onClick={reveal} disabled={loading || !applicationId} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Reveal</button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Keys are stored as a bcrypt hash and encrypted value; raw keys are not persisted. Reveal may only show recently cached keys.</p>
        </div>
      </div>
    </div>
  )
}

