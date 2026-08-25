import { useState } from 'react';
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';

/**
 * Functional/UI copy of mybooki OnboardRestaurant.jsx.
 * Submits via BookiOps admin API (which calls phone create) — does not replace mybooki page.
 */
export default function OnboardRestaurant() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    restaurantId: '',
    name: '',
    phoneNumbers: '',
    email: '',
    depositAmount: '',
    totalCapacity: '',
    currency: '',
    timezone: '',
    venueType: '',
    voice: '',
    greetingMessage: '',
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = {
        restaurantId: formData.restaurantId,
        name: formData.name,
        email: formData.email,
        phoneNumbers: formData.phoneNumbers.split(',').map((n) => n.trim()).filter((n) => n),
        depositAmount: Number(formData.depositAmount),
        totalCapacity: Number(formData.totalCapacity),
      };
      if (formData.currency) payload.currency = formData.currency;
      if (formData.timezone) payload.timezone = formData.timezone;
      if (formData.venueType) payload.venueType = formData.venueType;
      if (formData.voice) payload.voice = formData.voice;
      if (formData.greetingMessage) payload.greetingMessage = formData.greetingMessage;

      await api.onboardRestaurant(token, payload);
      setSuccess(true);
      setFormData({
        restaurantId: '',
        name: '',
        phoneNumbers: '',
        email: '',
        depositAmount: '',
        totalCapacity: '',
        currency: '',
        timezone: '',
        venueType: '',
        voice: '',
        greetingMessage: '',
      });
      setShowAdvanced(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    'w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900';

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">
          Onboard Restaurant
        </h1>
        <p className="text-muted-foreground">
          Register a new restaurant system on the platform.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-sm p-6 md:p-8">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900">
                Restaurant onboarded successfully!
              </h4>
              <p className="text-sm text-green-700 mt-1">
                The system has been configured with default settings.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-900">Failed to create restaurant</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ['restaurantId', 'Restaurant ID *', 'text', 'e.g. 6'],
              ['name', 'Display Name *', 'text', "e.g. Billy's Steakhouse"],
              ['email', 'Notification Email *', 'email', 'owner@bistro.com'],
              ['phoneNumbers', 'Phone Numbers *', 'text', 'e.g. +27765551234 (comma separated)'],
              ['depositAmount', 'Deposit per person *', 'number', 'e.g. 150'],
              ['totalCapacity', 'Total Capacity *', 'number', 'e.g. 40'],
            ].map(([id, label, type, placeholder]) => (
              <div key={id} className="space-y-2">
                <label htmlFor={id} className="text-sm font-medium">
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  min={type === 'number' ? (id === 'totalCapacity' ? 1 : 0) : undefined}
                  value={formData[id]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  required
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 mr-1" />
              ) : (
                <ChevronDown className="w-4 h-4 mr-1" />
              )}
              Advanced Settings (Optional)
            </button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-md border border-border">
              {[
                ['currency', 'Currency', 'e.g. usd, gbp, aud (default: rand)'],
                ['timezone', 'Timezone', 'e.g. Europe/London (default: Africa/Johannesburg)'],
                ['venueType', 'Venue Type', 'e.g. steakhouse, cafe (default: restaurant)'],
                ['voice', 'AI Voice', 'e.g. alloy, nova (default: marin)'],
              ].map(([id, label, placeholder]) => (
                <div key={id} className="space-y-2">
                  <label htmlFor={id} className="text-sm font-medium">
                    {label}
                  </label>
                  <input
                    id={id}
                    value={formData[id]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="greetingMessage" className="text-sm font-medium">
                  Custom Greeting Message
                </label>
                <input
                  id="greetingMessage"
                  value={formData.greetingMessage}
                  onChange={handleChange}
                  placeholder="Leave blank for auto-generated"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-8 py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? 'Creating System...' : 'Onboard Restaurant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
