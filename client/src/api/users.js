import { apiRequest } from "./client";

export const fetchUsers = () => apiRequest("/users");

export const createUser = (payload) =>
  apiRequest("/users", { method: "POST", body: JSON.stringify(payload) });

export const deleteUser = (id) =>
  apiRequest(`/users/${id}`, { method: "DELETE" });

export const fetchInvitations = () => apiRequest("/invitations");

export const createInvitation = (payload) =>
  apiRequest("/invitations", { method: "POST", body: JSON.stringify(payload) });

export const cancelInvitation = (id) =>
  apiRequest(`/invitations/${id}`, { method: "DELETE" });
