'use client';

import { useState } from 'react';
import { Bell, Send, Users, Building2 } from 'lucide-react';

export default function NotificationsPage() {
  const [recipient, setRecipient] = useState<'users' | 'vendors'>('users');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please fill in both title and message');
      return;
    }

    setSending(true);

    try {
      // TODO: Implement actual notification sending via Firebase Cloud Functions
      // For now, just simulate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      alert(`Notification sent to all ${recipient}!`);
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-2 text-gray-600">
          Send bulk notifications to users or vendors
        </p>
      </div>

      {/* Notification Form */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <div className="space-y-6">
          {/* Recipient Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Send To
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setRecipient('users')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                  recipient === 'users'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`rounded-lg p-3 ${
                  recipient === 'users' ? 'bg-blue-600' : 'bg-gray-100'
                }`}>
                  <Users className={`h-6 w-6 ${
                    recipient === 'users' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">All Users</p>
                  <p className="text-sm text-gray-500">Send to all app users</p>
                </div>
              </button>

              <button
                onClick={() => setRecipient('vendors')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                  recipient === 'vendors'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`rounded-lg p-3 ${
                  recipient === 'vendors' ? 'bg-blue-600' : 'bg-gray-100'
                }`}>
                  <Building2 className={`h-6 w-6 ${
                    recipient === 'vendors' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">All Vendors</p>
                  <p className="text-sm text-gray-500">Send to all vendors</p>
                </div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., New Feature Update"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-500">{title.length}/50 characters</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your notification message here..."
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={200}
            />
            <p className="mt-1 text-xs text-gray-500">{message.length}/200 characters</p>
          </div>

          {/* Preview */}
          {(title || message) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-600 p-2">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{title || 'Title'}</p>
                    <p className="mt-1 text-sm text-gray-600">{message || 'Message'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSendNotification}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Send Notification to All {recipient === 'users' ? 'Users' : 'Vendors'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
        <div className="flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-medium text-yellow-900">Important</p>
            <p className="mt-1 text-sm text-yellow-700">
              This will send a push notification to ALL {recipient} immediately. Please double-check your message before sending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}