import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';

export default function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .dashboard(token)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-3xl mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-8">Operations overview</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pending Onboarding', value: data?.pendingOnboarding, to: '/onboarding-requests' },
          { label: 'Total Restaurants', value: data?.totalRestaurants, to: '/restaurants' },
          { label: 'Pending Number Changes', value: data?.pendingNumberChanges, to: '/number-changes' },
        ].map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white border border-border rounded-lg p-5 hover:border-slate-400 transition-colors"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{card.label}</p>
            <p className="text-3xl font-semibold mt-2">{card.value ?? '—'}</p>
          </Link>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-3">Recent onboarding</h2>
          <ul className="space-y-2 text-sm">
            {(data?.recentOnboarding || []).length === 0 && (
              <li className="text-muted-foreground">No requests yet</li>
            )}
            {(data?.recentOnboarding || []).map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span className="truncate">{r.restaurant_name}</span>
                <span className="text-muted-foreground shrink-0">{r.status}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="bg-white border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-3">Recent number changes</h2>
          <ul className="space-y-2 text-sm">
            {(data?.recentNumberChanges || []).length === 0 && (
              <li className="text-muted-foreground">No requests yet</li>
            )}
            {(data?.recentNumberChanges || []).map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {r.restaurant_name_snapshot || r.restaurant_id}
                </span>
                <span className="text-muted-foreground shrink-0">{r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {data?.lastDirectorySyncAt && (
        <p className="text-xs text-muted-foreground mt-6">
          Directory last synced: {new Date(data.lastDirectorySyncAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
