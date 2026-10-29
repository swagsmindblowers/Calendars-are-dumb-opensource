"use client";

import { useEffect, useState } from "react";
import { createBooking } from "@/lib/booking/actions";
import { Spinner } from "@/components/Spinner";

type Slot = { start: string; end: string };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingForm({
  username,
  slug,
}: {
  username: string;
  slug: string;
  durationMinutes: number;
}) {
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(
    null
  );

  useEffect(() => {
    loadSlots(todayISO());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSlots(nextDate: string) {
    setDate(nextDate);
    setSelected(null);
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/book/${username}/${slug}/slots?date=${encodeURIComponent(nextDate)}`
      );
      const data = (await res.json()) as Slot[] | { error: string };
      setSlots(Array.isArray(data) ? data : []);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    if (!selected) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await createBooking({
        username,
        eventTypeSlug: slug,
        start: selected.start,
        bookerName: String(formData.get("bookerName") ?? ""),
        bookerEmail: String(formData.get("bookerEmail") ?? ""),
        bookerTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: String(formData.get("notes") ?? ""),
      });
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="stack">
        <h2 style={{ fontSize: "var(--t-xl)", letterSpacing: "-0.04em" }}>Booked!</h2>
        <p className="muted">
          Check your email for the confirmation and the meeting link.
        </p>
      </div>
    );
  }

  if (selected) {
    return (
      <form action={handleSubmit} className="stack">
        <p>
          <strong>
            {new Date(selected.start).toLocaleString(undefined, {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </strong>
        </p>
        <label className="field">
          Your name
          <input type="text" name="bookerName" required />
        </label>
        <label className="field">
          Your email
          <input type="email" name="bookerEmail" required />
        </label>
        <label className="field">
          Anything to share? (optional)
          <textarea name="notes" />
        </label>
        {result?.error && <p className="error">{result.error}</p>}
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting && <Spinner />}
            {submitting ? "Booking…" : "Confirm booking"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setSelected(null)}
          >
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="stack">
      <label className="field">
        Pick a day
      <input
        type="date"
        value={date}
        min={todayISO()}
        onChange={(e) => loadSlots(e.target.value)}
      />
      </label>
      {loadingSlots && (
        <p className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Spinner /> Loading times…
        </p>
      )}
      {!loadingSlots && slots && slots.length === 0 && (
        <p className="muted">No times available that day.</p>
      )}
      {!loadingSlots && slots && slots.length > 0 && (
        <div className="slots">
          {slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              className="btn"
              onClick={() => setSelected(slot)}
            >
              {new Date(slot.start).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
