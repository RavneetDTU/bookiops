import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';

export default function Restaurants() {
  const { token } = useAuth();
  const [data, setData] = useState({ restaurants: [], stale: false, lastSyncedAt: null });
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = () =>
    api
      .listRestaurants(token)
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [token]);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await api.syncRestaurants(token);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl mb-1">Restaurants</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot from phone API — Firestore tenants remain source of truth
          </p>
        </div>
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md disabled:opacity-60"
        >
          {syncing ? 'Syncing…' : 'Refresh from phone API'}
        </button>
      </div>
      {data.stale && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
          Directory snapshot may be stale
          {data.lastSyncedAt ? ` (last sync ${new Date(data.lastSyncedAt).toLocaleString()})` : ''}.
        </p>
      )}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {(data.restaurants || []).map((r) => (
              <tr key={r.restaurant_id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{r.restaurant_id}</td>
                <td className="px-4 py-3">{r.name || '—'}</td>
                <td className="px-4 py-3">{r.email || '—'}</td>
                <td className="px-4 py-3">
                  {Array.isArray(r.phone_numbers) ? r.phone_numbers.join(', ') : '—'}
                </td>
                <td className="px-4 py-3">{r.is_active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.restaurants || []).length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No snapshot yet — run sync.</p>
        )}
      </div>
    </div>
  );
}
