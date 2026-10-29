"use client";

import { useState } from "react";
import { setAvailability } from "@/lib/booking/actions";
import { Spinner } from "./Spinner";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type Block = { startTime: string; endTime: string };
type BlocksByDay = Record<number, Block[]>;

export function AvailabilityForm({
  initialTimezone,
  initialBlocksByDay,
}: {
  initialTimezone: string;
  initialBlocksByDay: BlocksByDay;
}) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [blocksByDay, setBlocksByDay] = useState<BlocksByDay>(initialBlocksByDay);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function addBlock(day: number) {
    setBlocksByDay((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), { startTime: "09:00", endTime: "17:00" }],
    }));
  }

  function removeBlock(day: number, index: number) {
    setBlocksByDay((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).filter((_, i) => i !== index),
    }));
  }

  function updateBlock(day: number, index: number, field: keyof Block, value: string) {
    setBlocksByDay((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    setResult(null);
    try {
      for (const blocks of Object.values(blocksByDay)) {
        for (const b of blocks) {
          if (b.startTime >= b.endTime) {
            setResult({ ok: false, error: "Each block's start time must be before its end time." });
            setSaving(false);
            return;
          }
        }
      }

      const windows = Object.entries(blocksByDay).flatMap(([day, blocks]) =>
        blocks.map((b) => ({
          dayOfWeek: Number(day),
          startTime: b.startTime,
          endTime: b.endTime,
        }))
      );
      await setAvailability(timezone, windows);
      setResult({ ok: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 28 }}>
      <label className="field" style={{ maxWidth: 320 }}>
        Timezone
        <input
          type="text"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
      </label>

      <div className="panel flush">
        {DAYS.map((d) => {
          const blocks = blocksByDay[d.value] ?? [];
          return (
            <div key={d.value} className="week-day">
              <div className={`week-day-name${blocks.length === 0 ? " off" : ""}`}>
                {d.label}
              </div>
              <div>
                {blocks.length === 0 && (
                  <p className="muted" style={{ margin: "0 0 8px", paddingTop: 8 }}>
                    Unavailable
                  </p>
                )}
                {blocks.map((b, i) => (
                  <div key={i} className="block-row">
                    <input
                      type="time"
                      aria-label={`${d.label} start`}
                      value={b.startTime}
                      onChange={(e) => updateBlock(d.value, i, "startTime", e.target.value)}
                    />
                    <span className="muted">to</span>
                    <input
                      type="time"
                      aria-label={`${d.label} end`}
                      value={b.endTime}
                      onChange={(e) => updateBlock(d.value, i, "endTime", e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => removeBlock(d.value, i)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => addBlock(d.value)}
                >
                  + Add hours
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="row">
        <button type="button" className="btn btn-primary btn-lg" disabled={saving} onClick={handleSubmit}>
          {saving && <Spinner />}
          {saving ? "Saving…" : "Save availability"}
        </button>
        {result?.ok && <span className="success">Saved.</span>}
        {result?.error && <span className="error">{result.error}</span>}
      </div>
    </div>
  );
}
