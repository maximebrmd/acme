import type { SimpleIcon } from "simple-icons";

/**
 * A brand's own mark, from simple-icons (CC0), in the brand's colour. A
 * brand that asked to be left out of that set (LinkedIn, OpenAI) is drawn
 * by its caller as a lettered tile instead: never draw a logo from memory
 * (DESIGN.md, "Icons").
 */
export const BrandMark = ({
  className,
  icon,
}: {
  readonly className?: string;
  readonly icon: SimpleIcon;
}) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className={className}
    fill={`#${icon.hex}`}
  >
    <path d={icon.path} />
  </svg>
);
