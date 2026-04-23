import nodemailer from "nodemailer";

import { appConfig } from "../config.js";
import { createHttpError } from "../lib/httpError.js";

function createTransporter() {
  return nodemailer.createTransport({
    host: appConfig.smtpHost,
    port: appConfig.smtpPort,
    secure: appConfig.smtpSecure,
    auth: {
      user: appConfig.smtpUser,
      pass: appConfig.smtpPass,
    },
  });
}

async function sendMail({ to, subject, text }) {
  if (!appConfig.recoveryEmailEnabled) {
    throw createHttpError(503, "Recovery email is not configured on this server.");
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"${appConfig.smtpFromName}" <${appConfig.smtpFromEmail}>`,
      to,
      subject,
      text,
    });
  } catch (error) {
    throw createHttpError(502, `Could not send email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail({ to, username, resetUrl, expiresAt }) {
  const expiresLabel = new Date(expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await sendMail({
    to,
    subject: "OverWatch password reset",
    text: [
      `Hi ${username},`,
      "",
      "We received a request to reset your OverWatch password.",
      `Use this link to choose a new password: ${resetUrl}`,
      "",
      `This link expires on ${expiresLabel}.`,
      "If you did not request this, you can ignore this email.",
    ].join("\r\n"),
  });
}

export async function sendInvitationEmail({ to, role, invitedBy, inviteUrl, expiresAt }) {
  const expiresLabel = new Date(expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await sendMail({
    to,
    subject: "You've been invited to OverWatch",
    text: [
      "Hello,",
      "",
      `${invitedBy} invited you to join OverWatch as a ${role}.`,
      `Open this link to accept the invitation and set up your username and password: ${inviteUrl}`,
      "",
      `This invitation expires on ${expiresLabel}.`,
      "If you were not expecting this invite, you can ignore this email.",
    ].join("\r\n"),
  });
}
