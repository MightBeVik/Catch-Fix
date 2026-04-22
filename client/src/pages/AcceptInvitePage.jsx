import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ScissorBackground } from "../components/ScissorBackground";

function roleBadgeClass(role) {
  return { Admin: "role-badge--admin", Maintainer: "role-badge--maintainer", Viewer: "role-badge--viewer" }[role] ?? "role-badge--viewer";
}

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoadError("Invalid invitation link — no token found.");
      return;
    }
    fetch(`/api/invitations/validate/${token}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) setLoadError(data.error || "Invalid or expired invitation.");
        else setInvite(data);
      })
      .catch(() => setLoadError("Could not validate invitation."));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not create account.");
      navigate("/login?invited=1", { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <ScissorBackground />
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.png" alt="Overwatch" className="login-logo" />
          <h1 className="login-title">You've been invited</h1>
          <p className="login-subtitle">Create your Overwatch account</p>
        </div>

        {loadError ? (
          <div className="callout callout--danger" style={{ padding: "12px 14px" }}>{loadError}</div>
        ) : !invite ? (
          <div className="status-message">Validating invitation…</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
              <div style={{ flex: 1 }}>
                <p className="field-label">Invited as</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-primary)" }}>{invite.email}</p>
              </div>
              <span className={`role-badge ${roleBadgeClass(invite.role)}`}>{invite.role}</span>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="field-label" htmlFor="username">Choose a username</label>
                <input
                  id="username"
                  className="input"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  placeholder="lowercase letters, numbers, _ - ."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="field-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="field-label" htmlFor="confirm">Confirm password</label>
                <input
                  id="confirm"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {formError && (
                <div className="callout callout--danger" style={{ padding: "10px 14px" }}>{formError}</div>
              )}

              <button
                className="button button-primary"
                type="submit"
                disabled={submitting || !username || !password || !confirm}
                style={{ width: "100%", marginTop: 4 }}
              >
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
