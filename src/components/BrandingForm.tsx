"use client";

import { useState } from "react";
import { updateAccentColor } from "@/lib/booking/actions";
import { Spinner } from "./Spinner";

export function BrandingForm({
  username,
  initialAccentColor,
  hasLogo,
}: {
  username: string;
  initialAccentColor: string;
  hasLogo: boolean;
}) {
  const [color, setColor] = useState(initialAccentColor);
  const [savingColor, setSavingColor] = useState(false);
  const [colorResult, setColorResult] = useState<{ ok: boolean; error?: string } | null>(
    null
  );

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; error?: string } | null>(
    null
  );
  const [logoVersion, setLogoVersion] = useState(0);

  async function handleColorSubmit(formData: FormData) {
    setSavingColor(true);
    setColorResult(null);
    try {
      setColorResult(await updateAccentColor(String(formData.get("accentColor") ?? "")));
    } finally {
      setSavingColor(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const body = new FormData();
      body.set("logo", file);
      const res = await fetch("/api/logos", { method: "POST", body });
      const json = (await res.json()) as { ok: boolean; error?: string };
      setUploadResult(json);
      if (json.ok) setLogoVersion((v) => v + 1);
    } catch {
      setUploadResult({ ok: false, error: "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="stack">
      <div>
        {hasLogo || logoVersion > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo lives in R2, not Next's image pipeline
          <img
            key={logoVersion}
            src={`/api/logo/${username}?v=${logoVersion}`}
            alt="Your logo"
            style={{ maxHeight: 60, display: "block", marginBottom: 8 }}
          />
        ) : null}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleLogoChange}
          disabled={uploading}
        />
        <p className="muted" style={{ fontSize: 12 }}>
          PNG, JPEG, WebP, or SVG, up to 2MB. Recommended: a wide logo under
          200px tall.
        </p>
        {uploading && (
          <span className="muted" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Spinner /> Uploading…
          </span>
        )}
        {uploadResult?.error && (
          <span className="error">{uploadResult.error}</span>
        )}
      </div>

      <form
        action={handleColorSubmit}
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <input
          type="color"
          name="accentColor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={savingColor}>
          {savingColor && <Spinner />}
          {savingColor ? "Saving…" : "Save color"}
        </button>
        {colorResult?.ok && <span className="success">Saved.</span>}
        {colorResult?.error && <span className="error">{colorResult.error}</span>}
      </form>
    </div>
  );
}
