"use client";

import { useState } from "react";
import { updateUsername } from "@/lib/booking/actions";
import { Spinner } from "./Spinner";

export function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const [value, setValue] = useState(initialUsername);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(
    null
  );

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setResult(null);
    try {
      const res = await updateUsername(String(formData.get("username") ?? ""));
      setResult(res);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      action={handleSubmit}
      style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
    >
      <input
        type="text"
        name="username"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        style={{ flex: "1 1 200px" }}
      />
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving && <Spinner />}
        {saving ? "Saving…" : "Save"}
      </button>
      {result?.ok && <span className="success">Saved.</span>}
      {result?.error && <span className="error">{result.error}</span>}
    </form>
  );
}
