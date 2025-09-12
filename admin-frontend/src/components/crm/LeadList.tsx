import { useCallback, useEffect, useState } from 'react'

interface Contact {
  id: string
  name?: string
  email?: string
  company?: string
  source?: string
  url?: string
  lead_score?: number
  lead_status?: string
  owner?: string
  tags?: string[]
  created_at?: string
  updated_at?: string
}

const API_BASE: string = (
  (import.meta as unknown as { env?: { VITE_ADMIN_API_URL?: string } }).env?.VITE_ADMIN_API_URL ||
  'http://localhost:4001'
)

export default function LeadList() {
  const [items, setItems] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('')
  const [owner, setOwner] = useState<string>('')
  const [limit] = useState<number>(25)
  const [offset, setOffset] = useState<number>(0)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('admin_token')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      if (owner) params.set('owner', owner)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      const res = await fetch(`${API_BASE}/api/crm/contacts?` + params.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json()
      setItems(data?.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [q, status, owner, limit, offset, token])

  useEffect(() => { void load() }, [load])

  const startEdit = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.data) setEditing(data.data as Contact)
    } catch {
      setEditing(null)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: editing.name,
          email: editing.email,
          company: editing.company,
          phone: editing.phone,
          lead_score: editing.lead_score,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        setEditing(null)
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 flex items-center gap-2 flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, company" className="flex-1 min-w-[200px] px-3 py-2 border rounded" />
        <select value={status} onChange={e => { setStatus(e.target.value); setOffset(0) }} className="px-3 py-2 border rounded">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="qualified">Qualified</option>
          <option value="closed">Closed</option>
        </select>
        <input value={owner} onChange={e => { setOwner(e.target.value); setOffset(0) }} placeholder="Owner" className="px-3 py-2 border rounded" />
        <button onClick={() => { setOffset(0); void load() }} className="px-4 py-2 bg-blue-600 text-white rounded">Search</button>
        <button onClick={() => setEditing({ id: '', name: '', email: '', company: '', phone: '', lead_score: 0, lead_status: 'new' })} className="ml-auto px-4 py-2 bg-green-600 text-white rounded">New Lead</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>Loading…</td></tr>
            ) : items.length ? items.map(c => (
              <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => startEdit(c.id)}>
                <td className="px-4 py-2">
                  <div className="font-medium">{c.name || '—'}</div>
                  <div className="text-xs text-gray-500">{c.lead_status || 'new'}</div>
                </td>
                <td className="px-4 py-2">{c.email || '—'}</td>
                <td className="px-4 py-2">{c.company || '—'}</td>
                <td className="px-4 py-2">{c.owner || '—'}</td>
                <td className="px-4 py-2">{c.updated_at ? new Date(c.updated_at).toLocaleString() : '—'}</td>
              </tr>
            )) : (
              <tr><td className="px-4 py-6" colSpan={5}>No contacts found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">Showing up to {limit} leads</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={offset===0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</button>
          <button className="px-3 py-1 border rounded" onClick={() => setOffset(offset + limit)}>Next</button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Lead</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="text-sm text-gray-600">Name</label>
                <input className="mt-1 w-full border rounded px-3 py-2" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="text-sm text-gray-600">Email</label>
                <input className="mt-1 w-full border rounded px-3 py-2" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="text-sm text-gray-600">Company</label>
                <input className="mt-1 w-full border rounded px-3 py-2" value={editing.company || ''} onChange={e => setEditing({ ...editing, company: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="text-sm text-gray-600">Phone</label>
                <input className="mt-1 w-full border rounded px-3 py-2" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="text-sm text-gray-600">Lead Score</label>
                <input type="number" className="mt-1 w-full border rounded px-3 py-2" value={editing.lead_score || 0} onChange={e => setEditing({ ...editing, lead_score: Number(e.target.value) })} />
              </div>
              <div className="col-span-1">
                <label className="text-sm text-gray-600">Status</label>
                <select className="mt-1 w-full border rounded px-3 py-2" value={editing.lead_status || 'new'} onChange={e => setEditing({ ...editing, lead_status: e.target.value })}>
                  <option value="new">New</option>
                  <option value="qualified">Qualified</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-sm text-gray-600">Owner</label>
                <input className="mt-1 w-full border rounded px-3 py-2" value={editing.owner || ''} onChange={e => setEditing({ ...editing, owner: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Notes */}
              <LeadNotes contactId={editing.id} token={token || ''} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="px-4 py-2 rounded border" onClick={() => setEditing(null)}>Cancel</button>
              {editing.id && (
                <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={async () => {
                  await fetch(`${API_BASE}/api/crm/contacts/${editing.id}/convert`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                  })
                  await load()
                  setEditing(null)
                }}>Convert to Customer</button>
              )}
              <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LeadNotes({ contactId, token }: { contactId: string; token: string }) {
  const [notes, setNotes] = useState<{ id: string; body: string; created_at: string }[]>([])
  const [newNote, setNewNote] = useState('')

  const loadNotes = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/crm/contacts/${contactId}/notes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    setNotes(data?.data || [])
  }, [contactId, token])

  useEffect(() => { void loadNotes() }, [loadNotes])

  const addNote = async () => {
    if (!newNote.trim()) return
    const res = await fetch(`${API_BASE}/api/crm/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ body: newNote.trim() }),
    })
    const data = await res.json()
    if (data?.success) {
      setNewNote('')
      await loadNotes()
    }
  }

  const removeNote = async (id: string) => {
    await fetch(`${API_BASE}/api/crm/contacts/${contactId}/notes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    await loadNotes()
  }

  return (
    <div className="col-span-2">
      <h4 className="font-semibold mb-2">Notes</h4>
      <div className="space-y-3 max-h-64 overflow-y-auto border rounded p-3">
        {notes.length ? notes.map(n => (
          <div key={n.id} className="border-b pb-2">
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{n.body}</div>
            <div className="text-xs text-gray-500 flex items-center justify-between">
              <span>{new Date(n.created_at).toLocaleString()}</span>
              <button className="text-red-600" onClick={() => removeNote(n.id)}>Delete</button>
            </div>
          </div>
        )) : <div className="text-sm text-gray-500">No notes yet.</div>}
      </div>
      <div className="flex gap-2 mt-2">
        <input className="flex-1 border rounded px-3 py-2" placeholder="Add a note" value={newNote} onChange={e => setNewNote(e.target.value)} />
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={addNote}>Add</button>
      </div>
    </div>
  )
}
