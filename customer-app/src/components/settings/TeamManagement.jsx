import axios from 'axios';
import { User, UserPlus, Trash2, Clock, XCircle } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useNotification } from '../../context/NotificationContext';
import InviteUserModal from '../invitations/InviteUserModal';
import PendingInvitationsList from '../invitations/PendingInvitationsList';

const TeamManagement = () => {
  const { organizationId } = useParams();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const fetchTeamData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch organization details which includes memberships
      const orgResponse = await axios.get(`/api/organizations/${organizationId}`);

      // Transform memberships into members format
      const members =
        orgResponse.data.memberships?.map(membership => ({
          id: membership.id,
          userId: membership.userId,
          email: membership.user.email,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          role: membership.role,
        })) || [];

      setMembers(members);

      // Get current user's role
      const currentUserId = localStorage.getItem('userId');
      const currentMember = members.find(m => m.userId === currentUserId);
      setUserRole(currentMember?.role);

      // Fetch pending invitations if user is admin/owner
      if (currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN') {
        const invitationsResponse = await axios.get('/api/invitations', {
          params: { organizationId },
        });
        setInvitations(invitationsResponse.data.invitations);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      showNotification('Failed to load team information', 'error');
    } finally {
      setLoading(false);
    }
  }, [organizationId, showNotification]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleInviteSent = () => {
    setShowInviteModal(false);
    fetchTeamData();
    showNotification('Invitation sent successfully', 'success');
  };

  const handleRevokeInvitation = async invitationId => {
    try {
      await axios.delete(`/api/invitations/${invitationId}`);
      showNotification('Invitation revoked', 'success');
      fetchTeamData();
    } catch (error) {
      showNotification('Failed to revoke invitation', 'error');
    }
  };

  const handleResendInvitation = async invitationId => {
    try {
      await axios.post(`/api/invitations/${invitationId}/resend`);
      showNotification('Invitation resent', 'success');
      fetchTeamData();
    } catch (error) {
      showNotification('Failed to resend invitation', 'error');
    }
  };

  const handleRemoveMember = async memberId => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      await axios.delete(`/api/organizations/${organizationId}/members/${memberId}`);
      showNotification('Team member removed', 'success');
      fetchTeamData();
    } catch (error) {
      showNotification('Failed to remove team member', 'error');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await axios.patch(`/api/organizations/${organizationId}/members/${memberId}`, {
        role: newRole,
      });
      showNotification('Role updated successfully', 'success');
      fetchTeamData();
    } catch (error) {
      showNotification('Failed to update role', 'error');
    }
  };

  const getRoleBadgeColor = role => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-700';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-700';
      case 'MEMBER':
        return 'bg-green-100 text-green-700';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = status => {
    switch (status) {
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
            <XCircle size={12} />
            Expired
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
            <Clock size={12} />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const canInvite = userRole === 'OWNER' || userRole === 'ADMIN';
  const canManageMembers = userRole === 'OWNER' || userRole === 'ADMIN';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your team members and invitations</p>
            </div>
            {canInvite && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <UserPlus size={20} className="mr-2" />
                Invite Team Member
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Team Members ({members.length})
            </button>
            {canInvite && (
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'invitations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Invitations ({invitations.length})
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'members' ? (
            <div className="space-y-4">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <User size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}
                    >
                      {member.role}
                    </span>
                  </div>

                  {canManageMembers && member.role !== 'OWNER' && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member.id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {userRole === 'OWNER' && <option value="ADMIN">Admin</option>}
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {members.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No team members yet. Start by inviting someone!
                </div>
              )}
            </div>
          ) : (
            <PendingInvitationsList
              invitations={invitations}
              onRevoke={handleRevokeInvitation}
              onResend={handleResendInvitation}
              getStatusBadge={getStatusBadge}
              getRoleBadgeColor={getRoleBadgeColor}
            />
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          organizationId={organizationId}
          userRole={userRole}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSent}
        />
      )}
    </div>
  );
};

export default TeamManagement;
