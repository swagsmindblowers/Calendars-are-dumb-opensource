"use client";

import { useEffect, useState } from "react";
import { rescheduleBooking } from "@/lib/booking/actions";
import { Spinner } from "@/components/Spinner";

type Slot = { start: string; end: string };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RescheduleForm({
  username,
  slug,
  bookingId,
}: {
  username: string;
  slug: string;
  bookingId: string;
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
        `/api/book/${username}/${slug}/slots?date=${encodeURIComponent(nextDate)}&excludeBookingId=${encodeURIComponent(bookingId)}`
      );
      const data = (await res.json()) as Slot[] | { error: string };
      setSlots(Array.isArray(data) ? data : []);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await rescheduleBooking(bookingId, selected.start);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="stack">
        <h2 style={{ fontSize: "var(--t-xl)", letterSpacing: "-0.04em" }}>Rescheduled!</h2>
        <p className="muted">Check your email for the updated confirmation.</p>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="stack">
        <p>
          New time:{" "}
          <strong>
            {new Date(selected.start).toLocaleString(undefined, {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </strong>
        </p>
        {result?.error && <p className="error">{result.error}</p>}
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting && <Spinner />}
            {submitting ? "Rescheduling…" : "Confirm new time"}
          </button>
          <button type="button" className="btn" onClick={() => setSelected(null)}>
            Back
          </button>
        </div>
      </div>
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
