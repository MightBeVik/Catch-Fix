import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { getPasswordResetStatus, confirmPasswordReset } from "../api/auth";
import { ScissorBackground } from "../components/ScissorBackground";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [recovery, setRecovery] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("Invalid password reset link.");
      return;
    }

    getPasswordResetStatus(token)
      .then(setRecovery)
      .catch((error) => setLoadError(error.message || "Could not validate reset link."));
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      navigate("/login?reset=1", { replace: true });
    } catch (error) {
      setFormError(error.message || "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <ScissorBackground />
      <div className="login-card">
        <div className="login-header login-header--centered">
          <img src="/logo.png" alt="OverWatch" className="login-logo" />
          <h1 className="login-title">Reset password</h1>
          <p className="login-subtitle">Set a new password for your OverWatch account.</p>
        </div>

        {loadError ? (
          <div className="callout callout--danger" style={{ padding: "12px 14px" }}>{loadError}</div>
        ) : !recovery ? (
          <div className="status-message">Validating reset link…</div>
        ) : (
          <>
            <div className="recovery-panel recovery-panel--static">
              <div>
                <p className="field-label">Resetting account</p>
                <p className="recovery-panel__value">{recovery.username}</p>
              </div>
              <div>
                <p className="field-label">Email</p>
                <p className="recovery-panel__value">{recovery.email}</p>
              </div>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="field-label" htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repeat new password"
                />
              </div>

              {formError && (
                <div className="callout callout--danger" style={{ padding: "10px 14px" }}>
                  {formError}
                </div>
              )}

              <button
                className="button button-primary"
                type="submit"
                disabled={submitting || !password || !confirm}
                style={{ width: "100%", marginTop: 4 }}
              >
                {submitting ? "Updating password…" : "Update password"}
              </button>
            </form>
          </>
        )}

        <div className="login-recovery-footer">
          <Link className="login-recovery-link" to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
