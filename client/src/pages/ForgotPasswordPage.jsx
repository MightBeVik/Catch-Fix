import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { requestPasswordReset } from "../api/auth";
import { ScissorBackground } from "../components/ScissorBackground";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await requestPasswordReset(username.trim(), email.trim());
      if (result.delivery === "email") {
        setSuccess(result.message || "Check your inbox for a password reset link.");
      } else {
        setSuccess("Reset link ready. Opening it now…");
        navigate(result.resetPath);
      }
    } catch (submitError) {
      setError(submitError.message || "Could not start password reset.");
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
          <h1 className="login-title">Forgot Password</h1>
          <p className="login-subtitle">Enter your username and recovery email to reset your password.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="field-label" htmlFor="recovery-username">Username</label>
            <input
              id="recovery-username"
              className="input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="recovery-password-email">Account email</label>
            <input
              id="recovery-password-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your account email"
            />
          </div>

          {error && (
            <div className="callout callout--danger" style={{ padding: "10px 14px" }}>
              {error}
            </div>
          )}

          {success && (
            <div className="callout" style={{ padding: "10px 14px", background: "var(--status-info-bg)", color: "var(--status-info-text)", border: "1px solid var(--border-focus)" }}>
              {success}
            </div>
          )}

          <button
            className="button button-primary"
            type="submit"
            disabled={loading || !username || !email}
            style={{ width: "100%", marginTop: 4 }}
          >
            {loading ? "Preparing reset…" : "Reset password"}
          </button>
        </form>

        <div className="login-recovery-footer">
          <Link className="login-recovery-link" to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
