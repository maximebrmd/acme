// Peal's mark, as src/app/icon.svg draws it, at any size, in the theme's
// colours of the mark (DESIGN.md).
export const PealMark = ({
  className,
  label,
}: {
  readonly className?: string;
  /** Its name for screen readers; without one it is decoration. */
  readonly label?: string;
}) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    {...(label === undefined
      ? { "aria-hidden": true }
      : { "aria-label": label, role: "img" })}
  >
    <path d="M32 8L52.78 20L32 32Z" fill="var(--sun)" />
    <path d="M32 8L32 32L11.22 20Z" fill="var(--sun)" fillOpacity="0.85" />
    <path
      d="M52.78 20L52.78 44L32 32Z"
      fill="var(--lavender)"
      fillOpacity="0.85"
    />
    <path d="M52.78 44L32 56L32 32Z" fill="var(--lavender)" />
    <path d="M32 32L32 56L11.22 44Z" fill="var(--brand)" />
    <path
      d="M32 32L11.22 44L11.22 20Z"
      fill="var(--brand)"
      fillOpacity="0.85"
    />
  </svg>
);
