import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { updateProfileEmail } from "../api/auth";

export function SettingsPage() {
  const { user, onUserUpdate } = useOutletContext();
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await updateProfileEmail(email.trim());
      onUserUpdate?.(result.user);
      setEmail(result.user.email);
      setSuccess("Recovery email updated.");
    } catch (submitError) {
      setError(submitError.message || "Could not update email.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-description">Manage your account details and recovery email.</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 720 }}>
        <div className="section-row" style={{ alignItems: "flex-start" }}>
          <div>
            <h3 className="section-title">Account Recovery</h3>
            <p className="section-copy">Keep a real email on your account so password recovery works when you need it.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 18 }}>
          <div className="form-group">
            <label className="field-label" htmlFor="settings-username">Username</label>
            <input
              id="settings-username"
              className="input"
              type="text"
              value={user?.username ?? ""}
              disabled
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="settings-email">Recovery email</label>
            <input
              id="settings-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </div>

          {user?.role === "Admin" && user?.email === "admin@catchfix.local" && (
            <div className="callout callout--warning">
              <div>
                <div className="field-label">Default Admin Email</div>
                <div className="section-copy" style={{ marginTop: 4 }}>
                  This account is still using the local placeholder email `admin@catchfix.local`. Replace it with a real inbox before relying on account recovery.
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="callout callout--danger">
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="callout" style={{ background: "var(--status-info-bg)", borderLeftColor: "var(--accent-blue)", color: "var(--status-info-text)" }}>
              <div>{success}</div>
            </div>
          )}

          <div className="action-row" style={{ justifyContent: "flex-start" }}>
            <button className="button button-primary" type="submit" disabled={saving || !email.trim()}>
              {saving ? "Saving…" : "Save recovery email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
