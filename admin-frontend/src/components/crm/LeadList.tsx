import { useCallback, useEffect, useState } from 'react'
import { Download, Filter, MoreVertical, Search, Plus, Check, X } from 'lucide-react'
import { exportTableToCSV } from '../../utils/exportUtils'
import LeadDetail from './LeadDetail'

interface Contact {
  id: string
  name?: string
  email?: string
  company?: string
  phone?: string
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
  (import.meta as unknown as { env?: { VITE_MAIN_API_URL?: string } }).env?.VITE_MAIN_API_URL ||
  'http://localhost:3001'
).trim()

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

  // Bulk selection and actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)

  // Advanced filtering
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [scoreRange, setScoreRange] = useState({ min: '', max: '' })
  const [source, setSource] = useState<string>('')

  // Export functionality
  const [exporting, setExporting] = useState(false)

  // Detail view
  const [viewingContact, setViewingContact] = useState<string | null>(null)

  const token = localStorage.getItem('admin_token')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      if (owner) params.set('owner', owner)
      if (source) params.set('source', source)
      if (dateRange.start) params.set('created_after', dateRange.start)
      if (dateRange.end) params.set('created_before', dateRange.end)
      if (scoreRange.min) params.set('score_min', scoreRange.min)
      if (scoreRange.max) params.set('score_max', scoreRange.max)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      const res = await fetch(`${API_BASE}/api/admin-backend/crm/contacts?` + params.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json()
      setItems(data?.data || [])
      setSelectedIds(new Set()) // Clear selection when reloading
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [q, status, owner, source, dateRange.start, dateRange.end, scoreRange.min, scoreRange.max, limit, offset, token])

  useEffect(() => { void load() }, [load])

  const startEdit = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin-backend/crm/contacts/${id}`, {
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
      // Determine if this is a new contact (empty id) or existing contact
      const isNewContact = !editing.id || editing.id === ''
      const url = isNewContact
        ? `${API_BASE}/api/admin-backend/crm/contacts`
        : `${API_BASE}/api/admin-backend/crm/contacts/${editing.id}`
      const method = isNewContact ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: editing.name,
          email: editing.email,
          company: editing.company,
          phone: editing.phone,
          leadScore: editing.lead_score,
          leadStatus: editing.lead_status,
          owner: editing.owner,
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

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
    }
  }

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Bulk actions
  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin-backend/crm/contacts/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: bulkAction,
          value: bulkAction === 'delete' ? undefined :
                 bulkAction === 'status' ? status :
                 bulkAction === 'owner' ? owner : undefined
        }),
      })
      if (res.ok) {
        await load()
        setBulkAction('')
        setSelectedIds(new Set())
      }
    } finally {
      setBulkLoading(false)
    }
  }

  // Export function
  const exportLeads = async () => {
    setExporting(true)
    try {
      const exportData = items.map(contact => ({
        Name: contact.name || '',
        Email: contact.email || '',
        Company: contact.company || '',
        Phone: contact.phone || '',
        Source: contact.source || '',
        'Lead Score': contact.lead_score || 0,
        'Lead Status': contact.lead_status || '',
        Owner: contact.owner || '',
        'Created Date': contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '',
        'Updated Date': contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : ''
      }))

      await exportTableToCSV(exportData, 'leads_export', {
        includeTimestamp: true
      })
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setQ('')
    setStatus('')
    setOwner('')
    setSource('')
    setDateRange({ start: '', end: '' })
    setScoreRange({ min: '', max: '' })
    setOffset(0)
  }

  // Show detail view if a contact is selected
  if (viewingContact) {
    return (
      <LeadDetail
        contactId={viewingContact}
        onBack={() => setViewingContact(null)}
        onUpdate={() => load()}
      />
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header with search and actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name, email, company"
              className="w-full pl-10 pr-3 py-2 border rounded-md"
            />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setOffset(0) }} className="px-3 py-2 border rounded-md">
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="CONVERTED">Converted</option>
            <option value="CLOSED">Lost</option>
          </select>
          <input value={owner} onChange={e => { setOwner(e.target.value); setOffset(0) }} placeholder="Owner" className="px-3 py-2 border rounded-md" />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-md flex items-center gap-1 ${showFilters ? 'bg-blue-50 border-blue-300' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button onClick={() => { setOffset(0); void load() }} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-1">
            <Search className="h-4 w-4" />
            Search
          </button>
          <button
            onClick={exportLeads}
            disabled={exporting || items.length === 0}
            className="px-3 py-2 border rounded-md flex items-center gap-1 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={() => setEditing({ id: '', name: '', email: '', company: '', phone: '', lead_score: 0, lead_status: 'NEW' })}
            className="ml-auto px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-gray-50 rounded-md p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  placeholder="e.g., website, referral"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created After</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created Before</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Score Range</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={scoreRange.min}
                    onChange={e => setScoreRange(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="Min"
                    className="w-full px-2 py-2 border rounded-md text-sm"
                  />
                  <input
                    type="number"
                    value={scoreRange.max}
                    onChange={e => setScoreRange(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="Max"
                    className="w-full px-2 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={clearFilters} className="px-3 py-1 text-sm border rounded-md">Clear All</button>
              <button onClick={() => { setOffset(0); void load() }} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">Apply Filters</button>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-3">
            <span className="text-sm text-blue-700 font-medium">{selectedIds.size} selected</span>
            <select
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}
              className="px-3 py-1 text-sm border rounded"
            >
              <option value="">Choose action...</option>
              <option value="status">Change Status</option>
              <option value="owner">Assign Owner</option>
              <option value="delete">Delete</option>
            </select>
            {bulkAction === 'status' && (
              <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-1 text-sm border rounded">
                <option value="NEW">New</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="NEGOTIATING">Negotiating</option>
                <option value="CONVERTED">Converted</option>
                <option value="CLOSED">Lost</option>
              </select>
            )}
            {bulkAction === 'owner' && (
              <input
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="Owner name"
                className="px-3 py-1 text-sm border rounded"
              />
            )}
            <button
              onClick={executeBulkAction}
              disabled={bulkLoading || !bulkAction}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {bulkLoading ? 'Processing...' : 'Apply'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1 text-sm border rounded">Cancel</button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 font-medium text-gray-900">Lead</th>
              <th className="px-4 py-3 font-medium text-gray-900">Contact</th>
              <th className="px-4 py-3 font-medium text-gray-900">Company</th>
              <th className="px-4 py-3 font-medium text-gray-900">Score</th>
              <th className="px-4 py-3 font-medium text-gray-900">Owner</th>
              <th className="px-4 py-3 font-medium text-gray-900">Updated</th>
              <th className="px-4 py-3 font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading leads...</span>
                  </div>
                </td>
              </tr>
            ) : items.length ? items.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelectItem(c.id)}
                    onClick={e => e.stopPropagation()}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div>
                      <div className="font-medium text-gray-900">{c.name || 'Unnamed Lead'}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          c.lead_status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                          c.lead_status === 'QUALIFIED' ? 'bg-green-100 text-green-800' :
                          c.lead_status === 'NEGOTIATING' ? 'bg-yellow-100 text-yellow-800' :
                          c.lead_status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-800' :
                          c.lead_status === 'CLOSED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {c.lead_status || 'NEW'}
                        </span>
                        {c.source && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {c.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{c.email || '—'}</div>
                  {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                </td>
                <td className="px-4 py-3 text-gray-900">{c.company || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <span className={`font-medium ${
                      (c.lead_score || 0) >= 80 ? 'text-red-600' :
                      (c.lead_score || 0) >= 60 ? 'text-yellow-600' :
                      (c.lead_score || 0) >= 40 ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {c.lead_score || 0}
                    </span>
                    <div className={`ml-2 w-2 h-2 rounded-full ${
                      (c.lead_score || 0) >= 80 ? 'bg-red-500' :
                      (c.lead_score || 0) >= 60 ? 'bg-yellow-500' :
                      (c.lead_score || 0) >= 40 ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-900">{c.owner || 'Unassigned'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(c.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <div className="relative group">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <button
                          onClick={() => setViewingContact(c.id)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {/* TODO: Add note */}}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Add Note
                        </button>
                        <button
                          onClick={() => {/* TODO: Delete */}}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                  No leads found. Try adjusting your filters or{' '}
                  <button
                    onClick={() => setEditing({ id: '', name: '', email: '', company: '', phone: '', lead_score: 0, lead_status: 'NEW' })}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    create a new lead
                  </button>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          {items.length > 0 ? (
            <span>
              Showing <span className="font-medium">{offset + 1}</span> to{' '}
              <span className="font-medium">{Math.min(offset + limit, offset + items.length)}</span> of{' '}
              <span className="font-medium">{offset + items.length}</span> leads
              {selectedIds.size > 0 && (
                <span className="ml-2 text-blue-600">
                  ({selectedIds.size} selected)
                </span>
              )}
            </span>
          ) : (
            <span>No leads found</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={offset === 0}
            onClick={() => { setOffset(Math.max(0, offset - limit)); void load() }}
          >
            Previous
          </button>
          <button
            className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={items.length < limit}
            onClick={() => { setOffset(offset + limit); void load() }}
          >
            Next
          </button>
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
                <select className="mt-1 w-full border rounded px-3 py-2" value={editing.lead_status || 'NEW'} onChange={e => setEditing({ ...editing, lead_status: e.target.value })}>
                  <option value="NEW">New</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="NEGOTIATING">Negotiating</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="CLOSED">Lost</option>
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
                  await fetch(`${API_BASE}/api/admin-backend/crm/contacts/${editing.id}/convert`, {
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
    const res = await fetch(`${API_BASE}/api/admin-backend/crm/contacts/${contactId}/notes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    setNotes(data?.data || [])
  }, [contactId, token])

  useEffect(() => { void loadNotes() }, [loadNotes])

  const addNote = async () => {
    if (!newNote.trim()) return
    const res = await fetch(`${API_BASE}/api/admin-backend/crm/contacts/${contactId}/notes`, {
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
    await fetch(`${API_BASE}/api/admin-backend/crm/contacts/${contactId}/notes/${id}`, {
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
