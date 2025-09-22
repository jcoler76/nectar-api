import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Mail, Phone, Building, Calendar, TrendingUp, Tag, User, MessageSquare, FileText, Edit3, Save, X } from 'lucide-react'

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

interface Note {
  id: string
  body: string
  created_at: string
  created_by?: string
}

interface Conversation {
  id: string
  status: string
  created_at: string
  messages: Array<{
    id: string
    role: string
    content: string
    created_at: string
  }>
}

const API_BASE: string = (
  (import.meta as unknown as { env?: { VITE_ADMIN_API_URL?: string } }).env?.VITE_ADMIN_API_URL ||
  'http://localhost:4001'
)

interface LeadDetailProps {
  contactId: string
  onBack: () => void
  onUpdate?: () => void
}

export default function LeadDetail({ contactId, onBack, onUpdate }: LeadDetailProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'conversations' | 'activity'>('overview')

  // Editing states
  const [isEditing, setIsEditing] = useState(false)
  const [editedContact, setEditedContact] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)

  // New note state
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const token = localStorage.getItem('admin_token')

  const loadContact = useCallback(async () => {
    if (!contactId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contactId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.data) {
        setContact(data.data)
        setEditedContact(data.data)
        setNotes(data.data.notes || [])
        setConversations(data.data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to load contact:', error)
    } finally {
      setLoading(false)
    }
  }, [contactId, token])

  useEffect(() => {
    void loadContact()
  }, [loadContact])

  const saveChanges = async () => {
    if (!editedContact) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: editedContact.name,
          email: editedContact.email,
          company: editedContact.company,
          phone: editedContact.phone,
          lead_score: editedContact.lead_score,
          lead_status: editedContact.lead_status,
          owner: editedContact.owner,
        }),
      })

      if (res.ok) {
        setContact(editedContact)
        setIsEditing(false)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to save changes:', error)
    } finally {
      setSaving(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ body: newNote.trim() }),
      })

      if (res.ok) {
        setNewNote('')
        await loadContact() // Reload to get updated notes
      }
    } catch (error) {
      console.error('Failed to add note:', error)
    } finally {
      setAddingNote(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800'
      case 'QUALIFIED': return 'bg-green-100 text-green-800'
      case 'NEGOTIATING': return 'bg-yellow-100 text-yellow-800'
      case 'CONVERTED': return 'bg-emerald-100 text-emerald-800'
      case 'LOST': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-blue-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading lead details...</span>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Contact not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-800">
          ← Back to leads
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to leads
            </button>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditedContact(contact)
                    }}
                    className="px-3 py-2 text-sm border rounded-md flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md flex items-center gap-1 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 text-sm border rounded-md flex items-center gap-1"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Info */}
            <div className="lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      value={editedContact?.name || ''}
                      onChange={e => setEditedContact(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="text-2xl font-bold text-gray-900 border rounded px-2 py-1 w-full"
                      placeholder="Lead name"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-gray-900">{contact.name || 'Unnamed Lead'}</h1>
                  )}

                  <div className="flex items-center gap-4 mt-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(contact.lead_status || 'NEW')}`}>
                      {isEditing ? (
                        <select
                          value={editedContact?.lead_status || 'NEW'}
                          onChange={e => setEditedContact(prev => prev ? { ...prev, lead_status: e.target.value } : null)}
                          className="bg-transparent border-none outline-none"
                        >
                          <option value="NEW">New</option>
                          <option value="QUALIFIED">Qualified</option>
                          <option value="NEGOTIATING">Negotiating</option>
                          <option value="CONVERTED">Converted</option>
                          <option value="LOST">Lost</option>
                        </select>
                      ) : (
                        contact.lead_status || 'NEW'
                      )}
                    </span>
                    {contact.source && (
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {contact.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Score */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Lead Score</span>
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedContact?.lead_score || 0}
                    onChange={e => setEditedContact(prev => prev ? { ...prev, lead_score: Number(e.target.value) } : null)}
                    className="text-right border rounded px-2 py-1 w-20"
                  />
                ) : (
                  <span className={`text-2xl font-bold ${getScoreColor(contact.lead_score || 0)}`}>
                    {contact.lead_score || 0}
                  </span>
                )}
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (contact.lead_score || 0) >= 80 ? 'bg-red-500' :
                    (contact.lead_score || 0) >= 60 ? 'bg-yellow-500' :
                    (contact.lead_score || 0) >= 40 ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min(contact.lead_score || 0, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'notes', label: 'Notes', icon: FileText },
              { id: 'conversations', label: 'Conversations', icon: MessageSquare },
              { id: 'activity', label: 'Activity', icon: Calendar },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500">Email</span>
                      {isEditing ? (
                        <input
                          value={editedContact?.email || ''}
                          onChange={e => setEditedContact(prev => prev ? { ...prev, email: e.target.value } : null)}
                          className="block w-full border rounded px-2 py-1 mt-1"
                          placeholder="Email address"
                        />
                      ) : (
                        <p className="text-gray-900">{contact.email || '—'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500">Phone</span>
                      {isEditing ? (
                        <input
                          value={editedContact?.phone || ''}
                          onChange={e => setEditedContact(prev => prev ? { ...prev, phone: e.target.value } : null)}
                          className="block w-full border rounded px-2 py-1 mt-1"
                          placeholder="Phone number"
                        />
                      ) : (
                        <p className="text-gray-900">{contact.phone || '—'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500">Company</span>
                      {isEditing ? (
                        <input
                          value={editedContact?.company || ''}
                          onChange={e => setEditedContact(prev => prev ? { ...prev, company: e.target.value } : null)}
                          className="block w-full border rounded px-2 py-1 mt-1"
                          placeholder="Company name"
                        />
                      ) : (
                        <p className="text-gray-900">{contact.company || '—'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500">Owner</span>
                      {isEditing ? (
                        <input
                          value={editedContact?.owner || ''}
                          onChange={e => setEditedContact(prev => prev ? { ...prev, owner: e.target.value } : null)}
                          className="block w-full border rounded px-2 py-1 mt-1"
                          placeholder="Owner name"
                        />
                      ) : (
                        <p className="text-gray-900">{contact.owner || 'Unassigned'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Created</span>
                    <p className="text-gray-900">
                      {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Last Updated</span>
                    <p className="text-gray-900">
                      {contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Source URL</span>
                    <p className="text-gray-900 break-all">{contact.url || '—'}</p>
                  </div>
                  {contact.tags && contact.tags.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500">Tags</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {contact.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              </div>

              {/* Add Note */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note about this lead..."
                  className="w-full px-3 py-2 border rounded-md resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={addNote}
                    disabled={!newNote.trim() || addingNote}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                  >
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {notes.length > 0 ? notes.map(note => (
                  <div key={note.id} className="bg-white border rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{note.body}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                      {note.created_by && <span>by {note.created_by}</span>}
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-8">No notes yet. Add one above to get started.</p>
                )}
              </div>
            </div>
          )}

          {/* Conversations Tab */}
          {activeTab === 'conversations' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversations</h3>
              <div className="space-y-4">
                {conversations.length > 0 ? conversations.map(conversation => (
                  <div key={conversation.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900">Conversation</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        conversation.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {conversation.status}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {conversation.messages.map(message => (
                        <div key={message.id} className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            message.role === 'USER'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-8">No conversations yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-gray-900 font-medium">Lead created</p>
                      <p className="text-xs text-gray-500">
                        {contact.created_at ? new Date(contact.created_at).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-500 text-center py-8">More activity tracking coming soon.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}