// The small mark that says which service a player is. Phase 31.
//
// Drawn by hand rather than from a brand-icon package: the icon library the
// app uses carries no brand marks, and a whole second package for four
// glyphs is a dependency for nothing. Each is the service's shape at a
// glance — a play triangle in a rounded box, a disc with three arcs, a
// cloud — rather than its logo, so nothing here is anyone's trademark
// drawn exactly.
import type { MediaService } from "../../services/media-service";

export function ServiceMark({ service, size = 12 }: { service: MediaService; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true, className: "media-service-mark" } as const;
  switch (service) {
    case "youtube":
    case "youtube-music":
      return (
        <svg {...common} fill="currentColor">
          <path d="M22.4 7.2a2.8 2.8 0 0 0-2-2C18.7 4.8 12 4.8 12 4.8s-6.7 0-8.4.4a2.8 2.8 0 0 0-2 2C1.2 8.9 1.2 12 1.2 12s0 3.1.4 4.8a2.8 2.8 0 0 0 2 2c1.7.4 8.4.4 8.4.4s6.7 0 8.4-.4a2.8 2.8 0 0 0 2-2c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM9.8 15.1V8.9l5.6 3.1-5.6 3.1Z" />
        </svg>
      );
    case "spotify":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
          <path d="M7 9.5c3.5-1 7.5-.7 10.5 1M7.5 12.6c3-.8 6.2-.5 8.6.8M8 15.5c2.3-.6 4.8-.4 6.7.6" stroke="var(--color-panel, #000)" />
        </svg>
      );
    case "soundcloud":
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.5 10a4.5 4.5 0 0 0-4.3-3.2 4.3 4.3 0 0 0-3.2 1.4v9.3h8.2a3.8 3.8 0 0 0-.7-7.5ZM8.6 9.2v8.3h1.2V9.2H8.6Zm-2.2 2v6.3h1.2v-6.3H6.4Zm-2.2 1.6v4.7h1.2v-4.7H4.2Zm-2.2 1.3v3.4h1.2v-3.4H2Z" />
        </svg>
      );
  }
}
