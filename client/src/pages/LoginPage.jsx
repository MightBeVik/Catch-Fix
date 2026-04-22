import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { loginRequest } from "../api/auth";
import { ScissorBackground } from "../components/ScissorBackground";
import { setStoredAuth } from "../lib/roles";

export function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justInvited = searchParams.get("invited") === "1";
  const passwordResetComplete = searchParams.get("reset") === "1";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await loginRequest(username.trim(), password);
      setStoredAuth({ token, user });
      onLogin({ token, user });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <ScissorBackground />
      <div className="login-card">
        <div className="login-header login-header--centered">
          <img src="/logo.png" alt="OverWatch" className="login-logo" />
          <h1 className="login-title login-title--big">OverWatch</h1>
        </div>

        {justInvited && (
          <div style={{ padding: "10px 14px", background: "var(--status-green-bg)", border: "1px solid var(--status-green)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--status-green)" }}>
            Account created! Sign in to get started.
          </div>
        )}

        {passwordResetComplete && (
          <div style={{ padding: "10px 14px", background: "var(--status-green-bg)", border: "1px solid var(--status-green)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--status-green)" }}>
            Password updated. Sign in with your new password.
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="field-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="callout callout--danger" style={{ padding: "10px 14px" }}>
              {error}
            </div>
          )}

          <button
            className="button button-primary"
            type="submit"
            disabled={loading || !username || !password}
            style={{ width: "100%", marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="login-recovery">
          <div className="login-recovery-actions">
            <Link className="login-recovery-link" to="/forgot-username">Forgot username?</Link>
            <Link className="login-recovery-link" to="/forgot-password">Forgot password?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
