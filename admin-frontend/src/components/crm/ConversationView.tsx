import { useCallback, useEffect, useState } from 'react'

interface Conversation {
  id: string
  contact_id: string
  status: string
  email?: string
  name?: string
  company?: string
  updated_at?: string
}

interface Message { id: string; role: string; content: string; created_at: string }

const API_BASE: string = (
  (import.meta as unknown as { env?: { VITE_ADMIN_API_URL?: string } }).env?.VITE_ADMIN_API_URL ||
  'http://localhost:4001'
)

export default function ConversationView() {
  const [items, setItems] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('open')
  const [active, setActive] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const token = localStorage.getItem('admin_token')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const res = await fetch(`${API_BASE}/api/crm/conversations?` + params.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      setItems(data?.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [status, token])

  const loadMessages = async (id: string) => {
    setActive(id)
    try {
      const res = await fetch(`${API_BASE}/api/crm/conversations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      setMessages(data?.data?.messages || [])
    } catch {
      setMessages([])
    }
  }

  const setConvoStatus = async (id: string, next: string) => {
    await fetch(`${API_BASE}/api/crm/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: next })
    })
    if (id === active) await loadMessages(id)
    await load()
  }

  useEffect(() => { void load() }, [load])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-3 flex items-center gap-2">
          <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="qualified">Qualified</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="divide-y max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading…</div>
          ) : items.length ? items.map(c => (
            <button key={c.id} onClick={() => loadMessages(c.id)} className={`w-full text-left p-3 hover:bg-gray-50 ${active===c.id?'bg-blue-50':''}`}>
              <div className="font-medium">{c.name || c.email || 'Unknown'}</div>
              <div className="text-xs text-gray-600">{c.company || '—'} • {c.status}</div>
              <div className="text-xs text-gray-400">Updated {c.updated_at ? new Date(c.updated_at).toLocaleString() : ''}</div>
            </button>
          )) : (
            <div className="p-4 text-sm text-gray-500">No conversations</div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 min-h-[70vh] flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <div className="text-sm">Conversation</div>
          {active && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <button onClick={() => setConvoStatus(active!, 'qualified')} className="px-2 py-1 rounded bg-green-600 text-white">Mark Qualified</button>
              <button onClick={() => setConvoStatus(active!, 'closed')} className="px-2 py-1 rounded bg-gray-700 text-white">Close</button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {active ? messages.map(m => (
            <div key={m.id} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
              <div className={`${m.role==='user'?'bg-blue-600 text-white':'bg-gray-100 text-gray-800'} px-3 py-2 rounded-xl max-w-[80%] text-sm`}>
                {m.content}
              </div>
            </div>
          )) : (
            <div className="text-sm text-gray-500">Select a conversation</div>
          )}
        </div>
      </div>
    </div>
  )
}
