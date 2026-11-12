import { useState } from 'react';
import type { FormEvent } from 'react';

import { authFetch, setSession } from '../services/auth';
import type { AuthResponse } from '../services/auth';

interface AuthPageProps {
  onAuthenticated: (username: string) => void;
}

type AuthMode = 'login' | 'register';

async function getErrorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as unknown;
  if (typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string') {
    return body.detail;
  }
  return `Request failed with HTTP ${response.status}`;
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const path = mode === 'register' ? '/auth/register' : '/auth/login';
      const payload = mode === 'register'
        ? { username: username.trim(), email: email.trim(), password }
        : { username: username.trim(), password };
      const response = await authFetch(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError(await getErrorMessage(response));
        return;
      }
      const result = await response.json() as AuthResponse;
      setSession(result.token, result.username);
      onAuthenticated(result.username);
    } catch {
      setError('Could not reach the server. Check that the backend is running and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="wordmark auth-wordmark" href="/" aria-label="AI-AQI home">
          <span className="wordmark-mark" aria-hidden="true">A</span>
          <span><strong>AI-AQI</strong><small>Air near you</small></span>
        </a>
        <p className="eyebrow">PERSONAL AIR QUALITY</p>
        <h1 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-description">
          Sign in to view your dashboard and saved health profile.
        </p>
        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => changeMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => changeMode('register')}
          >
            Register
          </button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Username
            <input
              autoComplete="username"
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_.-]+"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          {mode === 'register' && (
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 8 : 1}
              maxLength={256}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}
