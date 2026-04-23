import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";

import { formatMDT } from "../lib/time";

import {
  cancelInvitation,
  createInvitation,
  deleteUser,
  fetchInvitations,
  fetchUsers,
  updateUser,
} from "../api/users";

const ROLE_OPTIONS = ["Viewer", "Maintainer", "Admin"];

function roleBadgeClass(role) {
  return { Admin: "role-badge--admin", Maintainer: "role-badge--maintainer", Viewer: "role-badge--viewer" }[role] ?? "role-badge--viewer";
}

function isExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

export function SecurityContent({ role, user }) {
  // We can skip the Navigate check here because it's handled by the wrapper or the parent


  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [inviteLink, setInviteLink] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [inviteAction, setInviteAction] = useState("");

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState("Viewer");

  async function handleUpdateUserRole(id) {
    try {
      await updateUser(id, { role: editingUserRole });
      setStatus("User role updated.");
      setEditingUserId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function load() {
    const [u, i] = await Promise.all([fetchUsers(), fetchInvitations()]);
    setUsers(u.items || []);
    setInvitations(i.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function handleInvite(delivery) {
    setError("");
    setStatus("");
    setInviteLink(null);
    setInviteAction(delivery);
    try {
      const result = await createInvitation({ email: inviteEmail, role: inviteRole, delivery });
      if (result.delivery === "link") {
        const link = `${window.location.origin}/accept-invite?token=${result.token}`;
        setInviteLink(link);
        setStatus("Invite link generated.");
      } else {
        setStatus(result.message || `Invitation sent to ${inviteEmail}.`);
      }
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviteAction("");
    }
  }

  async function handleCancelInvite(id) {
    try {
      await cancelInvitation(id);
      setStatus("Invitation cancelled.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(id) {
    if (!confirm("Remove this user? They will be signed out on their next request.")) return;
    try {
      await deleteUser(id);
      setStatus("User removed.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setStatus("Link copied to clipboard.");
  }

  const pendingInvites = invitations.filter((i) => !i.used_at && !isExpired(i.expires_at));
  const usedOrExpired = invitations.filter((i) => i.used_at || isExpired(i.expires_at));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin only</p>
          <h2 className="page-title">User Access Management</h2>
          <p className="page-description">Manage users, roles, and invitations.</p>
        </div>
      </div>

      {error && <div className="callout callout--danger" style={{ padding: "10px 14px" }}>{error}</div>}
      {status && !error && <div className="status-message">{status}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>

        {/* Add User */}
        <div className="panel" style={{ flex: "1 1 340px", maxWidth: "420px", display: "grid", gap: 16 }}>
          <div>
            <h3 className="section-title">Add User</h3>
            <p className="section-copy">Enter their email and role. Generate a shareable invite link or send the invitation directly by email. They’ll validate the invite, then choose a username and password.</p>
          </div>

          <form style={{ display: "grid", gap: 12 }} onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label className="field-label" htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                className="input"
                type="email"
                required
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="field-label" htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                className="select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                {inviteRole === "Admin" && "Full access — can manage users and all data."}
                {inviteRole === "Maintainer" && "Can create and edit records but not manage users."}
                {inviteRole === "Viewer" && "Read-only access. Cannot save changes."}
              </p>
            </div>
            <div className="button-row">
              <button
                className="button button-primary"
                type="button"
                disabled={Boolean(inviteAction) || !inviteEmail}
                onClick={() => handleInvite("link")}
              >
                {inviteAction === "link" ? "Generating…" : "Generate Invite Link"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                disabled={Boolean(inviteAction) || !inviteEmail}
                onClick={() => handleInvite("email")}
              >
                {inviteAction === "email" ? "Sending…" : "Send Invite Email"}
              </button>
            </div>
          </form>

          {inviteLink && (
            <div style={{ display: "grid", gap: 8, padding: "14px 16px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "3px solid var(--status-green)", borderRadius: "var(--radius-md)" }}>
              <p className="field-label" style={{ color: "var(--status-green)" }}>Invite link ready — share this</p>
              <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", wordBreak: "break-all" }}>{inviteLink}</p>
              <button className="button button-secondary" style={{ justifySelf: "start" }} onClick={copyLink} type="button">
                Copy link
              </button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: "2 1 500px", minWidth: 0, display: "grid", gap: 24 }}>

          {/* Active Users */}
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 className="section-title" style={{ fontSize: 15 }}>Active Users</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", whiteSpace: "nowrap" }}>
                <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{u.username}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{u.email}</td>
                    <td>
                      {editingUserId === u.id ? (
                        <select
                          className="select"
                          style={{ padding: "4px 8px", fontSize: 12, minHeight: 0 }}
                          value={editingUserRole}
                          onChange={(e) => setEditingUserRole(e.target.value)}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`role-badge ${roleBadgeClass(u.role)}`}>{u.role}</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{formatMDT(u.created_at)}</td>
                    <td>
                      {editingUserId === u.id ? (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            className="button button-primary"
                            style={{ padding: "4px 10px", minHeight: "unset", fontSize: 12 }}
                            onClick={() => handleUpdateUserRole(u.id)}
                            type="button"
                          >
                            Save
                          </button>
                          <button
                            className="button button-secondary"
                            style={{ padding: "4px 10px", minHeight: "unset", fontSize: 12 }}
                            onClick={() => setEditingUserId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          {u.id !== user?.id && (
                            <>
                              <button
                                className="button button-secondary"
                                style={{ padding: "4px 10px", minHeight: "unset", fontSize: 12 }}
                                onClick={() => {
                                  setEditingUserId(u.id);
                                  setEditingUserRole(u.role);
                                }}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="button button-danger"
                                style={{ padding: "4px 10px", minHeight: "unset", fontSize: 12 }}
                                onClick={() => handleDeleteUser(u.id)}
                                type="button"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {u.id === user?.id && (
                            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: "4px" }}>you</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>

          {/* Pending invitations */}
          {pendingInvites.length > 0 && (
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <h3 className="section-title" style={{ fontSize: 15 }}>Pending Invitations</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", whiteSpace: "nowrap" }}>
                  <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Invited by</th>
                    <th>Expires</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pendingInvites.map((inv) => (
                    <tr key={inv.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{inv.email}</td>
                      <td><span className={`role-badge ${roleBadgeClass(inv.role)}`}>{inv.role}</span></td>
                      <td style={{ fontSize: 12 }}>{inv.invited_by}</td>
                      <td style={{ fontSize: 12 }}>{new Date(inv.expires_at).toLocaleString()}</td>
                      <td>
                        <button
                          className="button button-secondary"
                          style={{ padding: "4px 10px", minHeight: "unset", fontSize: 12 }}
                          onClick={() => handleCancelInvite(inv.id)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Used / expired */}
          {usedOrExpired.length > 0 && (
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <h3 className="section-title" style={{ fontSize: 15 }}>Invite History</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", whiteSpace: "nowrap" }}>
                  <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {usedOrExpired.map((inv) => (
                    <tr key={inv.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{inv.email}</td>
                      <td><span className={`role-badge ${roleBadgeClass(inv.role)}`}>{inv.role}</span></td>
                      <td>
                        <span className={`status-badge ${inv.used_at ? "status-badge--healthy" : "status-badge--neutral"}`}>
                          {inv.used_at ? "accepted" : "expired"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{new Date(inv.used_at || inv.expires_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SecurityPage() {
  const { role, user } = useOutletContext();

  if (role !== "Admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <SecurityContent role={role} user={user} />;
}
