import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { authFetch, clearSession } from '../services/auth';
import type { HealthProfile, UserProfile } from '../services/auth';

interface ProfilePageProps {
  onLogout: () => void;
  onProfileSaved: () => void;
}

const defaultHealthProfile: HealthProfile = {
  is_asthmatic: false,
  is_elderly: false,
  has_children: false,
  custom_threshold: null,
};

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as unknown;
  if (typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string') {
    return body.detail;
  }
  return `Request failed with HTTP ${response.status}`;
}

export default function ProfilePage({ onLogout, onProfileSaved }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [healthProfile, setHealthProfile] = useState<HealthProfile>(defaultHealthProfile);
  const [thresholdInput, setThresholdInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    authFetch('/users/me', { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          clearSession();
          onLogout();
          return;
        }
        if (!response.ok) throw new Error(await responseError(response));
        const user = await response.json() as UserProfile;
        setProfile(user);
        setHealthProfile(user.health_profile);
        setThresholdInput(user.health_profile.custom_threshold == null
          ? ''
          : String(user.health_profile.custom_threshold));
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setMessage(error instanceof Error ? error.message : 'Could not load your profile.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [onLogout]);

  const setFlag = (key: keyof Pick<HealthProfile, 'is_asthmatic' | 'is_elderly' | 'has_children'>, value: boolean) => {
    setHealthProfile((current) => ({ ...current, [key]: value }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (thresholdInput !== '' && (!/^\d+$/.test(thresholdInput)
      || Number(thresholdInput) < 0 || Number(thresholdInput) > 500)) {
      setMessage('The custom threshold must be a whole number from 0 to 500.');
      return;
    }

    const updatedHealthProfile = {
      ...healthProfile,
      custom_threshold: thresholdInput === '' ? null : Number(thresholdInput),
    };
    setSaving(true);
    setMessage(null);
    try {
      const response = await authFetch('/users/me/health-profile', {
        method: 'PUT',
        body: JSON.stringify(updatedHealthProfile),
      });
      if (response.status === 401) {
        clearSession();
        onLogout();
        return;
      }
      if (!response.ok) throw new Error(await responseError(response));
      const result = await response.json() as { personal_threshold: number };
      setHealthProfile(updatedHealthProfile);
      setProfile((current) => current
        ? { ...current, health_profile: updatedHealthProfile, personal_threshold: result.personal_threshold }
        : current);
      onProfileSaved();
      setMessage('Health profile saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearSession();
    onLogout();
  };

  return (
    <div className="profile-page">
      <section className="profile-summary panel" aria-labelledby="profile-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ACCOUNT</p>
            <h1 id="profile-title">Your profile</h1>
          </div>
          <button className="profile-logout" type="button" onClick={logout}>Log out</button>
        </div>
        {loading ? (
          <p className="profile-status">Loading your profile...</p>
        ) : profile ? (
          <dl className="profile-facts">
            <div><dt>Username</dt><dd>{profile.username}</dd></div>
            <div><dt>Email</dt><dd>{profile.email}</dd></div>
            <div><dt>Personal alert threshold</dt><dd>{profile.personal_threshold} AQI</dd></div>
          </dl>
        ) : (
          <p className="profile-status" role="status">{message ?? 'Profile information is unavailable.'}</p>
        )}
      </section>

      <section className="panel profile-health-panel" aria-labelledby="health-profile-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PERSONALIZATION</p>
            <h2 id="health-profile-title">Health sensitivity</h2>
          </div>
        </div>
        <p className="profile-description">
          Select the health factors that apply to your group. These settings personalize AQI alerts and do not replace medical advice.
        </p>
        <form className="profile-form" onSubmit={save}>
          <div className="profile-options">
            <label>
              <input type="checkbox" checked={healthProfile.is_asthmatic}
                onChange={(event) => setFlag('is_asthmatic', event.target.checked)} />
              Asthma sensitivity (threshold 50)
            </label>
            <label>
              <input type="checkbox" checked={healthProfile.is_elderly}
                onChange={(event) => setFlag('is_elderly', event.target.checked)} />
              Older adult in the group (threshold 75)
            </label>
            <label>
              <input type="checkbox" checked={healthProfile.has_children}
                onChange={(event) => setFlag('has_children', event.target.checked)} />
              Children in the group (threshold 75)
            </label>
          </div>
          <label className="threshold-field">
            Custom alert threshold
            <input type="number" min={0} max={500} step={1} inputMode="numeric"
              placeholder="Use sensitivity setting or default 100"
              value={thresholdInput} onChange={(event) => setThresholdInput(event.target.value)} />
          </label>
          <div className="profile-form-actions">
            <button type="submit" disabled={saving || loading || !profile}>
              {saving ? 'Saving' : 'Save health profile'}
            </button>
            {message && profile && <p role="status">{message}</p>}
          </div>
        </form>
      </section>

      <section className="panel exposure-placeholder">
        <p className="eyebrow">COMING LATER</p>
        <h2>Exposure history</h2>
        <p>Personal exposure summaries are planned for Weeks 5-6.</p>
      </section>
    </div>
  );
}
