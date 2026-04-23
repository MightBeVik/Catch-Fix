import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { updateProfileEmail, updateProfilePassword } from "../api/auth";

import { SecurityContent } from "./SecurityPage";

function AccountRecoveryContent({ user, onUserUpdate }) {
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
  );
}

function ChangePasswordContent() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      await updateProfilePassword(currentPassword, newPassword);
      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Could not change password.");
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 720 }}>
      <div className="section-row" style={{ alignItems: "flex-start" }}>
        <div>
          <h3 className="section-title">Change Password</h3>
          <p className="section-copy">Update your account password. Ensure it's at least 8 characters long.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 18 }}>
        <div className="form-group">
          <label className="field-label" htmlFor="current-password">Current Password</label>
          <input
            id="current-password"
            className="input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="field-label" htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="field-label" htmlFor="confirm-password">Confirm New Password</label>
          <input
            id="confirm-password"
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

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
          <button className="button button-primary" type="submit" disabled={!currentPassword || !newPassword || !confirmPassword}>
            Change password
          </button>
        </div>
      </form>
    </div>
  );
}

export function SettingsPage() {
  const { user, onUserUpdate } = useOutletContext();
  const [activeTab, setActiveTab] = useState(user?.role === "Admin" ? "user-access" : "account-recovery");

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-description">Manage your account details and recovery email.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", marginTop: "24px" }}>
        <div style={{ width: "240px", display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
          {user?.role === "Admin" && (
            <button
              className={activeTab === "user-access" ? "nav-link active" : "nav-link"}
              onClick={() => setActiveTab("user-access")}
              style={{ justifyContent: "flex-start", width: "100%", cursor: "pointer", textAlign: "left", appearance: "none", borderTop: "none", borderRight: "none", borderBottom: "none", background: activeTab === "user-access" ? "" : "transparent" }}
            >
              User Access Management
            </button>
          )}
          <button
            className={activeTab === "account-recovery" ? "nav-link active" : "nav-link"}
            onClick={() => setActiveTab("account-recovery")}
            style={{ justifyContent: "flex-start", width: "100%", cursor: "pointer", textAlign: "left", appearance: "none", borderTop: "none", borderRight: "none", borderBottom: "none", background: activeTab === "account-recovery" ? "" : "transparent" }}
          >
            Account Recovery
          </button>
          <button
            className={activeTab === "change-password" ? "nav-link active" : "nav-link"}
            onClick={() => setActiveTab("change-password")}
            style={{ justifyContent: "flex-start", width: "100%", cursor: "pointer", textAlign: "left", appearance: "none", borderTop: "none", borderRight: "none", borderBottom: "none", background: activeTab === "change-password" ? "" : "transparent" }}
          >
            Change Password
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === "user-access" && user?.role === "Admin" && (
            <div>
              <SecurityContent role={user.role} user={user} />
            </div>
          )}
          {activeTab === "account-recovery" && (
            <AccountRecoveryContent user={user} onUserUpdate={onUserUpdate} />
          )}
          {activeTab === "change-password" && (
            <ChangePasswordContent />
          )}
        </div>
      </div>
    </div>
  );
}
