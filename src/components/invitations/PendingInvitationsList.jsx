import { Mail, RefreshCw, Trash2, Clock, User } from 'lucide-react';
import React from 'react';

const PendingInvitationsList = ({
  invitations,
  onRevoke,
  onResend,
  getStatusBadge,
  getRoleBadgeColor,
}) => {
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysUntilExpiration = expiresAt => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No pending invitations</p>
        <p className="text-sm text-gray-400 mt-1">
          Invited team members will appear here until they accept
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map(invitation => {
        const daysUntilExpiration = getDaysUntilExpiration(invitation.expiresAt);
        const isExpired = invitation.status === 'expired';

        return (
          <div
            key={invitation.id}
            className={`p-4 border rounded-lg ${
              isExpired ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User size={20} className="text-gray-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{invitation.email}</span>
                      {getStatusBadge(invitation.status)}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}
                      >
                        {invitation.role}
                      </span>
                      <span>Invited by {invitation.invitedBy}</span>
                      <span>•</span>
                      <span>{formatDate(invitation.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {!isExpired && daysUntilExpiration <= 2 && (
                  <div className="mt-2 ml-13 flex items-center text-sm text-yellow-600">
                    <Clock size={14} className="mr-1" />
                    Expires in {daysUntilExpiration} {daysUntilExpiration === 1 ? 'day' : 'days'}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onResend(invitation.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title={isExpired ? 'Resend and extend expiration' : 'Resend invitation'}
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => onRevoke(invitation.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Revoke invitation"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PendingInvitationsList;
