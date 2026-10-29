// Plain fetch to Resend's HTTP API — no SDK, to avoid any Workers-runtime
// compatibility surprises. Requires RESEND_API_KEY. If it's unset, emails
// are silently skipped (logged) rather than failing the booking itself.

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; skipping email send to", input.to);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    console.error("Failed to send email:", await res.text());
  }
}

export function bookingConfirmationEmail(args: {
  eventTypeName: string;
  start: Date;
  end: Date;
  joinUrl: string | null;
  cancelUrl: string;
  rescheduleUrl: string;
}): { subject: string; html: string } {
  const when = `${args.start.toUTCString()} – ${args.end.toUTCString()}`;
  return {
    subject: `Confirmed: ${args.eventTypeName}`,
    html: `
      <p>Your meeting is confirmed.</p>
      <p><strong>${args.eventTypeName}</strong><br/>${when}</p>
      ${args.joinUrl ? `<p><a href="${args.joinUrl}">Join the Teams meeting</a></p>` : ""}
      <p><a href="${args.rescheduleUrl}">Reschedule</a> &middot; <a href="${args.cancelUrl}">Cancel this booking</a></p>
    `,
  };
}

/**
 * Schedules an email via Resend's `scheduled_at`, returning the created
 * email's id (to later reschedule/cancel it) or null if skipped/failed.
 */
export async function scheduleReminderEmail(input: {
  to: string;
  subject: string;
  html: string;
  scheduledAt: Date;
}): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; skipping reminder email to", input.to);
    return null;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      scheduled_at: input.scheduledAt.toISOString(),
    }),
  });

  if (!res.ok) {
    console.error("Failed to schedule reminder email:", await res.text());
    return null;
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

/** Moves a previously scheduled reminder email to a new send time. */
export async function rescheduleReminderEmail(
  emailId: string,
  scheduledAt: Date
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scheduled_at: scheduledAt.toISOString() }),
  });
  return res.ok;
}

/** Cancels a previously scheduled reminder email (no-op if already sent). */
export async function cancelReminderEmail(emailId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  await fetch(`https://api.resend.com/emails/${emailId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function reminderBookingEmail(args: {
  eventTypeName: string;
  start: Date;
  end: Date;
  joinUrl: string | null;
  cancelUrl: string;
  rescheduleUrl: string;
}): { subject: string; html: string } {
  const when = `${args.start.toUTCString()} – ${args.end.toUTCString()}`;
  return {
    subject: `Reminder: ${args.eventTypeName} starts soon`,
    html: `
      <p>Your meeting is starting soon.</p>
      <p><strong>${args.eventTypeName}</strong><br/>${when}</p>
      ${args.joinUrl ? `<p><a href="${args.joinUrl}">Join the Teams meeting</a></p>` : ""}
      <p><a href="${args.rescheduleUrl}">Reschedule</a> &middot; <a href="${args.cancelUrl}">Cancel this booking</a></p>
    `,
  };
}

export function rescheduledBookingEmail(args: {
  eventTypeName: string;
  start: Date;
  end: Date;
  joinUrl: string | null;
  cancelUrl: string;
  rescheduleUrl: string;
}): { subject: string; html: string } {
  const when = `${args.start.toUTCString()} – ${args.end.toUTCString()}`;
  return {
    subject: `Rescheduled: ${args.eventTypeName}`,
    html: `
      <p>Your meeting has been rescheduled.</p>
      <p><strong>${args.eventTypeName}</strong><br/>${when}</p>
      ${args.joinUrl ? `<p><a href="${args.joinUrl}">Join the Teams meeting</a></p>` : ""}
      <p><a href="${args.rescheduleUrl}">Reschedule again</a> &middot; <a href="${args.cancelUrl}">Cancel this booking</a></p>
    `,
  };
}
