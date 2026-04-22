import net from "node:net";
import os from "node:os";
import tls from "node:tls";

import { appConfig } from "../config.js";
import { createHttpError } from "../lib/httpError.js";

export async function sendPasswordResetEmail({ to, username, resetUrl, expiresAt }) {
  if (!appConfig.recoveryEmailEnabled) {
    throw createHttpError(503, "Recovery email is not configured on this server.");
  }

  const expiresLabel = new Date(expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const from = formatAddress(appConfig.smtpFromEmail, appConfig.smtpFromName);
  const subject = "OverWatch password reset";
  const text = [
    `Hi ${username},`,
    "",
    "We received a request to reset your OverWatch password.",
    `Use this link to choose a new password: ${resetUrl}`,
    "",
    `This link expires on ${expiresLabel}.`,
    "If you did not request this, you can ignore this email.",
  ].join("\r\n");

  await sendSmtpMessage({
    host: appConfig.smtpHost,
    port: appConfig.smtpPort,
    secure: appConfig.smtpSecure,
    username: appConfig.smtpUser,
    password: appConfig.smtpPass,
    from,
    to,
    subject,
    text,
  });
}

export async function sendInvitationEmail({ to, role, invitedBy, inviteUrl, expiresAt }) {
  if (!appConfig.recoveryEmailEnabled) {
    throw createHttpError(503, "Recovery email is not configured on this server.");
  }

  const expiresLabel = new Date(expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const from = formatAddress(appConfig.smtpFromEmail, appConfig.smtpFromName);
  const subject = "You’ve been invited to OverWatch";
  const text = [
    "Hello,",
    "",
    `${invitedBy} invited you to join OverWatch as a ${role}.`,
    `Open this link to accept the invitation and set up your username and password: ${inviteUrl}`,
    "",
    `This invitation expires on ${expiresLabel}.`,
    "If you were not expecting this invite, you can ignore this email.",
  ].join("\r\n");

  await sendSmtpMessage({
    host: appConfig.smtpHost,
    port: appConfig.smtpPort,
    secure: appConfig.smtpSecure,
    username: appConfig.smtpUser,
    password: appConfig.smtpPass,
    from,
    to,
    subject,
    text,
  });
}

async function sendSmtpMessage({ host, port, secure, username, password, from, to, subject, text }) {
  const session = await createSession({ host, port, secure });

  try {
    await session.expect(220);
    await session.command(`EHLO ${os.hostname() || "localhost"}`, 250);

    if (!secure) {
      const startedTls = await session.tryStartTls(host);
      if (startedTls) {
        await session.command(`EHLO ${os.hostname() || "localhost"}`, 250);
      }
    }

    if (username && password) {
      await session.command("AUTH LOGIN", 334);
      await session.command(Buffer.from(username, "utf8").toString("base64"), 334);
      await session.command(Buffer.from(password, "utf8").toString("base64"), 235);
    }

    await session.command(`MAIL FROM:<${extractEmail(from)}>`, 250);
    await session.command(`RCPT TO:<${to}>`, [250, 251]);
    await session.command("DATA", 354);
    await session.write(`${buildMimeMessage({ from, to, subject, text })}\r\n.\r\n`);
    await session.expect(250);
    await session.command("QUIT", 221);
  } catch (error) {
    throw createHttpError(502, error.status ? error.message : `Could not send recovery email: ${error.message}`);
  } finally {
    session.close();
  }
}

function createSession({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const handleError = (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.createConnection({ host, port });

    socket.setEncoding("utf8");
    socket.setTimeout(10000);
    socket.on("timeout", () => {
      socket.destroy(new Error("SMTP connection timed out."));
    });
    socket.once("error", handleError);
    const handleReady = () => {
      if (!settled) {
        settled = true;
        socket.removeListener("error", handleError);
        resolve(new SmtpSession(socket));
      }
    };

    if (secure) socket.once("secureConnect", handleReady);
    else socket.once("connect", handleReady);
  });
}

class SmtpSession {
  constructor(socket) {
    this.socket = socket;
    this.buffer = "";
    this.pending = [];

    socket.on("data", (chunk) => {
      this.buffer += chunk;
      this.flush();
    });
    socket.on("error", (error) => {
      while (this.pending.length) {
        this.pending.shift().reject(error);
      }
    });
    socket.on("close", () => {
      while (this.pending.length) {
        this.pending.shift().reject(new Error("SMTP connection closed unexpectedly."));
      }
    });
  }

  async command(commandText, expectedCode) {
    await this.write(`${commandText}\r\n`);
    return this.expect(expectedCode);
  }

  write(payload) {
    return new Promise((resolve, reject) => {
      this.socket.write(payload, (error) => (error ? reject(error) : resolve()));
    });
  }

  expect(expectedCode) {
    return new Promise((resolve, reject) => {
      this.pending.push({ expectedCode, resolve, reject });
      this.flush();
    });
  }

  async tryStartTls(host) {
    try {
      await this.command("STARTTLS", 220);
    } catch {
      return false;
    }

    this.socket = await upgradeToTls(this.socket, host);
    this.socket.setEncoding("utf8");
    this.buffer = "";
    this.pending = [];
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
      this.flush();
    });
    this.socket.on("error", (error) => {
      while (this.pending.length) {
        this.pending.shift().reject(error);
      }
    });
    this.socket.on("close", () => {
      while (this.pending.length) {
        this.pending.shift().reject(new Error("SMTP connection closed unexpectedly."));
      }
    });
    return true;
  }

  flush() {
    while (this.pending.length) {
      const parsed = parseSmtpResponse(this.buffer);
      if (!parsed) return;

      this.buffer = parsed.rest;
      const { expectedCode, resolve, reject } = this.pending.shift();
      const expected = Array.isArray(expectedCode) ? expectedCode : [expectedCode];
      if (expected.includes(parsed.code)) {
        resolve(parsed.message);
      } else {
        const error = new Error(parsed.message);
        error.status = parsed.code;
        reject(error);
      }
    }
  }

  close() {
    this.socket.destroy();
  }
}

function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    const upgraded = tls.connect({ socket, servername: host }, () => resolve(upgraded));
    upgraded.once("error", reject);
  });
}

function parseSmtpResponse(buffer) {
  const lines = buffer.split("\r\n");
  if (lines.length < 2) return null;

  const first = lines[0];
  if (!/^\d{3}[- ]/.test(first)) return null;

  const code = Number(first.slice(0, 3));
  const messageLines = [];
  let consumed = 0;

  for (const line of lines) {
    consumed += line.length + 2;
    if (!line) return null;
    messageLines.push(line.slice(4));
    if (line.startsWith(`${code} `)) {
      return {
        code,
        message: messageLines.join("\n"),
        rest: buffer.slice(consumed),
      };
    }
    if (!line.startsWith(`${code}-`)) {
      return null;
    }
  }

  return null;
}

function buildMimeMessage({ from, to, subject, text }) {
  const escapedText = text
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    escapedText,
  ].join("\r\n");
}

function formatAddress(email, name) {
  const safeName = String(name || "").replace(/"/g, "");
  return safeName ? `"${safeName}" <${email}>` : email;
}

function extractEmail(address) {
  const match = String(address).match(/<([^>]+)>/);
  return match ? match[1] : String(address);
}
