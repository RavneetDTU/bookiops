import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';

export default function NumberChangeRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('pending');

  const load = () =>
    api
      .listNumberChanges(token, filter || undefined)
      .then((d) => setRequests(d.requests || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [token, filter]);

  const approve = async (id) => {
    setBusyId(id);
    setError(null);
    try {
      await api.approveNumberChange(token, id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    const reason = window.prompt('Rejection reason (optional)') || '';
    setBusyId(id);
    setError(null);
    try {
      await api.rejectNumberChange(token, id, reason);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-3xl mb-1">Number Change Requests</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Approve updates only the restaurant phone number in Firestore + phoneIndex
      </p>
      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'rejected', ''].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md border ${
              filter === s ? 'bg-slate-900 text-white border-slate-900' : 'border-border'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="bg-white border border-border rounded-lg p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  {r.restaurant_name_snapshot || 'Restaurant'}{' '}
                  <span className="text-muted-foreground font-normal">#{r.restaurant_id}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.status} · requested {new Date(r.requested_at).toLocaleString()}
                  {r.phone_update_status !== 'not_attempted' &&
                    ` · phone update: ${r.phone_update_status}`}
                </p>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => approve(r.id)}
                    className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md disabled:opacity-60"
                  >
                    {busyId === r.id ? 'Working…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => reject(r.id)}
                    className="text-sm border border-border px-3 py-1.5 rounded-md"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
            <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Current Number</dt>
                <dd className="font-mono">{r.current_number}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Requested Number</dt>
                <dd className="font-mono">{r.requested_number}</dd>
              </div>
              {r.phone_update_error && (
                <div className="sm:col-span-2 text-red-700 text-xs">{r.phone_update_error}</div>
              )}
              {r.rejection_reason && (
                <div className="sm:col-span-2 text-xs">Rejected: {r.rejection_reason}</div>
              )}
            </dl>
          </div>
        ))}
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground">No requests.</p>
        )}
      </div>
    </div>
  );
}
