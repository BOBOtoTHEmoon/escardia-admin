'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const ADMIN_EMAILS = [
  'admin@escardia.com',
  'idowuoluwanifemi45@gmail.com', 
  'adeniyiadesina30@gmail.com',
  // Add more admin emails here
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // ✅ CHECK if email is in admin list
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      setError('Unauthorized: You do not have admin access');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-md">
        
        {/* Logo */}
      <div className="mb-8 text-center">
  <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center">
    <img 
      src="/logo.png" 
      alt="Escardia Logo" 
      className="h-16 w-16 object-contain"
      onError={(e) => {

        // Fallback if logo doesn't exist
        e.currentTarget.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = 'h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center';
        fallback.innerHTML = '<span class="text-2xl font-bold text-white">E</span>';
        e.currentTarget.parentElement?.appendChild(fallback);
      }}
    />
  </div>
  <h1 className="text-3xl font-bold text-gray-900">Escardia Admin</h1>
  <p className="mt-2 text-gray-600">Sign in to manage your platform</p>
</div>

        {/* Login Form */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@escardia.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}