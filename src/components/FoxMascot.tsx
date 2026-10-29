import type { CSSProperties } from "react";

type FoxMascotProps = {
  size?: number;
  rotate?: number;
  /** "sticker" pins the fox to a corner of a positioned parent; "inline" flows in the layout. */
  corner?: "top-right" | "bottom-left" | "bottom-right" | "top-left" | "inline";
  message?: string;
};

const CORNER_STYLE: Record<
  Exclude<NonNullable<FoxMascotProps["corner"]>, "inline">,
  CSSProperties
> = {
  "top-right": { top: -18, right: -12 },
  "top-left": { top: -18, left: -12 },
  "bottom-right": { bottom: -14, right: -12 },
  "bottom-left": { bottom: -14, left: -12 },
};

const STROKE = 5;

export function FoxMascot({
  size = 56,
  rotate = -6,
  corner = "top-right",
  message = "calendars are dumb",
}: FoxMascotProps) {
  const height = Math.round(size * 1.16);
  const stroke = "var(--foreground)";

  return (
    <div
      className={corner === "inline" ? "fox-inline" : "fox-wrap"}
      style={corner === "inline" ? undefined : CORNER_STYLE[corner]}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={height}
        viewBox="0 0 120 140"
        style={{ transform: `rotate(${rotate}deg)` }}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* tail */}
        <path
          d="M86 114 Q116 106 110 76 Q104 64 94 80 Q98 98 82 108 Z"
          fill="var(--fox)"
          stroke={stroke}
          strokeWidth={STROKE}
        />
        <path d="M110 76 Q104 64 94 80 Q104 84 110 76 Z" fill="var(--muzzle)" />
        {/* body */}
        <ellipse cx="60" cy="112" rx="30" ry="22" fill="var(--fox)" stroke={stroke} strokeWidth={STROKE} />
        <ellipse cx="60" cy="118" rx="14" ry="13" fill="var(--muzzle)" />
        {/* ears */}
        <path d="M32 34 L16 2 L52 20 Z" fill="var(--fox)" stroke={stroke} strokeWidth={STROKE} />
        <path d="M88 34 L104 2 L68 20 Z" fill="var(--fox)" stroke={stroke} strokeWidth={STROKE} />
        <path d="M33 26 L25 11 L43 18 Z" fill="var(--fox-dark)" />
        <path d="M87 26 L95 11 L77 18 Z" fill="var(--fox-dark)" />
        {/* head */}
        <ellipse cx="60" cy="58" rx="34" ry="30" fill="var(--fox)" stroke={stroke} strokeWidth={STROKE} />
        {/* cheeks / muzzle */}
        <path d="M26 64 Q40 84 60 82 Q80 84 94 64 Q76 58 60 68 Q44 58 26 64 Z" fill="var(--muzzle)" />
        {/* eyes: flat, slightly smug */}
        <path d="M40 54 Q47 49 54 54" fill="none" stroke={stroke} strokeWidth="4.5" />
        <path d="M66 54 Q73 49 80 54" fill="none" stroke={stroke} strokeWidth="4.5" />
        <circle cx="47" cy="57" r="3.2" fill={stroke} />
        <circle cx="73" cy="57" r="3.2" fill={stroke} />
        {/* nose */}
        <path d="M55 70 L65 70 L60 76 Z" fill={stroke} stroke={stroke} strokeWidth="2" />
      </svg>
      {message && <span className="fox-speech">{message}</span>}
    </div>
  );
}
