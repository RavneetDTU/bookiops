import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';

export default function OnboardingRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [approveForm, setApproveForm] = useState(null);

  const load = () =>
    api
      .listOnboarding(token)
      .then((d) => setRequests(d.requests || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [token]);

  const openApprove = (r) => {
    setApproveForm({
      id: r.id,
      restaurantId: '',
      name: r.restaurant_name || '',
      email: r.restaurant_email || '',
      phoneNumbers: r.restaurant_phone || '',
      depositAmount: '150',
      totalCapacity: '40',
    });
  };

  const submitApprove = async (e) => {
    e.preventDefault();
    setBusyId(approveForm.id);
    setError(null);
    try {
      const createPayload = {
        restaurantId: approveForm.restaurantId,
        name: approveForm.name,
        email: approveForm.email,
        phoneNumbers: approveForm.phoneNumbers.split(',').map((n) => n.trim()).filter(Boolean),
        depositAmount: Number(approveForm.depositAmount),
        totalCapacity: Number(approveForm.totalCapacity),
      };
      await api.approveOnboarding(token, approveForm.id, createPayload);
      setApproveForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    const reason = window.prompt('Rejection reason (optional)') || '';
    setBusyId(id);
    try {
      await api.rejectOnboarding(token, id, reason);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-3xl mb-1">Onboarding Requests</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Public signup submissions waiting for review
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {approveForm && (
        <form
          onSubmit={submitApprove}
          className="mb-6 bg-white border border-border rounded-lg p-5 space-y-3 max-w-2xl"
        >
          <h2 className="font-semibold text-sm">Approve & create tenant</h2>
          <p className="text-xs text-muted-foreground">
            Assign a restaurant ID and confirm create fields (same as onboard API).
          </p>
          {['restaurantId', 'name', 'email', 'phoneNumbers', 'depositAmount', 'totalCapacity'].map(
            (key) => (
              <div key={key}>
                <label className="text-xs font-medium block mb-1">{key}</label>
                <input
                  required
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                  value={approveForm[key]}
                  onChange={(e) => setApproveForm({ ...approveForm, [key]: e.target.value })}
                />
              </div>
            )
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busyId === approveForm.id}
              className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md"
            >
              Create & onboard
            </button>
            <button
              type="button"
              className="text-sm px-4 py-2 border border-border rounded-md"
              onClick={() => setApproveForm(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="bg-white border border-border rounded-lg p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{r.restaurant_name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.status} · {new Date(r.submitted_at).toLocaleString()} · register:{' '}
                  {r.register_sync_status}
                </p>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md"
                    disabled={busyId === r.id}
                    onClick={() => openApprove(r)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="text-sm border border-border px-3 py-1.5 rounded-md"
                    disabled={busyId === r.id}
                    onClick={() => reject(r.id)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
            <dl className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Applicant</dt><dd>{r.applicant_name} · {r.applicant_email}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Restaurant email</dt><dd>{r.restaurant_email}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{r.restaurant_phone}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Address</dt><dd>{r.restaurant_address}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Contact</dt><dd>{r.contact_name} · {r.contact_phone} · {r.contact_email}</dd></div>
              {r.rejection_reason && (
                <div><dt className="text-xs text-muted-foreground">Rejection</dt><dd>{r.rejection_reason}</dd></div>
              )}
            </dl>
          </div>
        ))}
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground">No onboarding requests.</p>
        )}
      </div>
    </div>
  );
}
