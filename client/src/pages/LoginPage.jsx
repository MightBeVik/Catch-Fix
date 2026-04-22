import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginRequest } from "../api/auth";
import { ScissorBackground } from "../components/ScissorBackground";
import { setStoredAuth } from "../lib/roles";

export function LoginPage({ onLogin }) {
  const navigate = useNavigate();
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
      navigate("/registry", { replace: true });
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
        <div className="login-header">
          <img src="/logo.png" alt="Overwatch" className="login-logo" />
          <h1 className="login-title">Overwatch</h1>
          <p className="login-subtitle">ARTI-409-A &mdash; AI Systems &amp; Governance</p>
        </div>

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
      </div>
    </div>
  );
}
