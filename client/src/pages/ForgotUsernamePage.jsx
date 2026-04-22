import { useState } from "react";
import { Link } from "react-router-dom";

import { recoverUsername } from "../api/auth";
import { ScissorBackground } from "../components/ScissorBackground";

export function ForgotUsernamePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setUsername("");

    try {
      const result = await recoverUsername(email.trim());
      setUsername(result.username);
    } catch (submitError) {
      setError(submitError.message || "Could not find that username.");
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
          <h1 className="login-title">Forgot Username</h1>
          <p className="login-subtitle">Enter your account email and we’ll look up your username.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="field-label" htmlFor="recovery-email">Account email</label>
            <input
              id="recovery-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your account email"
              autoFocus
            />
          </div>

          {error && (
            <div className="callout callout--danger" style={{ padding: "10px 14px" }}>
              {error}
            </div>
          )}

          {username && (
            <div className="callout" style={{ padding: "10px 14px", background: "var(--status-info-bg)", color: "var(--status-info-text)", border: "1px solid var(--border-focus)" }}>
              Your username is <strong>{username}</strong>.
            </div>
          )}

          <button
            className="button button-primary"
            type="submit"
            disabled={loading || !email}
            style={{ width: "100%", marginTop: 4 }}
          >
            {loading ? "Looking up…" : "Find username"}
          </button>
        </form>

        <div className="login-recovery-footer">
          <Link className="login-recovery-link" to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
