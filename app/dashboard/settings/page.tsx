'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Save, DollarSign, Percent } from 'lucide-react';

export default function SettingsPage() {
  const [commissionRate, setCommissionRate] = useState('15');
  const [currency, setCurrency] = useState('NGN');
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      // TODO: Save to Firebase or backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage platform settings and configurations
        </p>
      </div>

      {/* Platform Settings */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <SettingsIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Platform Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Commission Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission Rate (%)
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                min="0"
                max="100"
                step="0.1"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Platform commission charged on each booking
            </p>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NGN">Nigerian Naira (₦)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="GBP">British Pound (£)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Payment Gateway Settings */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Payment Gateway</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold">
                P
              </div>
              <div>
                <p className="font-semibold text-gray-900">Paystack</p>
                <p className="text-sm text-gray-500">Payment processor</p>
              </div>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Active
            </span>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Configure payment gateway keys in your environment variables for security.
            </p>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">App Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Version</span>
            <span className="font-medium text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Platform</span>
            <span className="font-medium text-gray-900">Escardia Admin</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last Updated</span>
            <span className="font-medium text-gray-900">Nov 10, 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
}