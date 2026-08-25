import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function Login() {
  const { login, isAuthenticated, booting } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!booting && isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(ellipse_at_top,_#e0f2f1_0%,_#f7f6f3_55%)] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-white border border-border rounded-xl p-8 shadow-sm"
      >
        <h1 className="font-heading text-3xl text-foreground">BookiOps</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Admin sign-in for Booki.ai operations
        </p>
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}
        <label className="block text-xs font-medium mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <label className="block text-xs font-medium mb-1.5">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
