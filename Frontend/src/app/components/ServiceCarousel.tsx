// ─── ServiceCarousel ──────────────────────────────────────────────────────────
// Smooth infinite auto-running carousel.
// • Zero new dependencies — uses requestAnimationFrame + pointer events
// • Pauses on hover, resumes on leave
// • Arrow buttons scroll by one card width
// • Touch / mouse drag support
// • Edge gradient fade included
// • Fully responsive via CSS (card width adapts per breakpoint)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ServiceItem {
  icon: ReactNode;
  title: string;
  description: string;
  link: string;
  cta: string;
  /** Optional — if set, the card links to /services#slug instead of link */
  slug?: string;
}

interface ServiceCarouselProps {
  services: ServiceItem[];
  /** Pixels moved per animation frame (~60fps). Default 0.55 ≈ 33px/s */
  speed?: number;
  /** Extra className on the outer wrapper */
  className?: string;
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ServiceCard({ icon, title, description, link, cta, slug }: ServiceItem) {
  // If a slug is provided, link to /services#slug (deep-links to that card)
  // Insurance is a special case → keep its direct /insurance link
  const href = slug && link !== "/insurance" ? `/services#${slug}` : link;
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`
        relative group overflow-hidden
        rounded-3xl border border-white/25
        bg-white/70 backdrop-blur-xl
        p-7 h-full
        shadow-[0_8px_30px_rgba(15,23,42,0.07)]
        hover:shadow-[0_20px_60px_rgba(26,95,61,0.14)]
        hover:border-[#d8f46b]/50
        transition-shadow duration-500
      `}
    >
      {/* Hover sheen */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#1A5F3D]/8 via-transparent to-[#B8E986]/15 pointer-events-none" />
      <div className="absolute -top-16 -left-16 w-52 h-52 bg-white/20 blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white mb-5 shadow-[0_8px_20px_rgba(26,95,61,0.22)] group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
          {icon}
        </div>

        {/* Text */}
        <h3 className="text-lg font-bold text-gray-900 mb-2.5 leading-tight">
          {title}
        </h3>
        <p className="text-sm text-gray-500 leading-6 flex-1 mb-5">
          {description}
        </p>

        {/* CTA */}
        <Link
          to={href}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#eef8f2] px-4 py-2 text-sm font-semibold text-[#1A5F3D] transition-all duration-300 group-hover:bg-[#1A5F3D] group-hover:text-white w-fit"
          onClick={(e) => e.stopPropagation()}
        >
          {cta}
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

// ── Arrow Button ──────────────────────────────────────────────────────────────

function ArrowBtn({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={`
        absolute top-1/2 -translate-y-1/2 z-20
        ${direction === "left" ? "left-2 md:left-4" : "right-2 md:right-4"}
        w-9 h-9 md:w-11 md:h-11
        flex items-center justify-center
        rounded-full
        bg-white/90 backdrop-blur
        border border-gray-200/80
        shadow-[0_4px_16px_rgba(0,0,0,0.10)]
        text-gray-700
        hover:bg-[#1A5F3D] hover:text-white hover:border-[#1A5F3D]
        active:scale-95
        transition-all duration-200
      `}
    >
      {direction === "left" ? (
        <ChevronLeft className="w-5 h-5" />
      ) : (
        <ChevronRight className="w-5 h-5" />
      )}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const CARD_W_PX = 308; // matches CSS width below
const GAP_PX    = 24;  // gap-6
const STRIDE    = CARD_W_PX + GAP_PX; // pixels per card slot

export function ServiceCarousel({
  services,
  speed = 0.55,
  className = "",
}: ServiceCarouselProps) {
  // Double the array so the seamless loop works:
  // when pos reaches -N*STRIDE (N = services.length), we snap back to 0
  const items = [...services, ...services];

  const trackRef   = useRef<HTMLDivElement>(null);
  const posRef     = useRef(0);          // current translateX (negative = left)
  const rafRef     = useRef<number>(0);
  const pausedRef  = useRef(false);      // is animation manually paused?
  const dragging   = useRef(false);
  const dragStart  = useRef({ x: 0, pos: 0 });
  const [arrowHint, setArrowHint] = useState(false); // show arrows on hover

  // Total width of ONE full set of original items
  const loopWidth = services.length * STRIDE;

  // ── RAF loop ────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!trackRef.current) return;

    if (!pausedRef.current && !dragging.current) {
      posRef.current -= speed;
      // Seamless reset: when the first copy scrolls off, jump back
      if (posRef.current <= -loopWidth) {
        posRef.current += loopWidth;
      }
      trackRef.current.style.transform = `translateX(${posRef.current}px)`;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [speed, loopWidth]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // ── Arrow scroll (one card at a time) ────────────────────────────────────
  function scrollByCards(delta: number) {
    if (!trackRef.current) return;
    pausedRef.current = true;

    const target = posRef.current + delta * STRIDE;
    const start  = posRef.current;
    const dur    = 380; // ms
    let   t0     = 0;

    function ease(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function step(ts: number) {
      if (!t0) t0 = ts;
      const progress = Math.min((ts - t0) / dur, 1);
      posRef.current = start + (target - start) * ease(progress);

      // Wrap within loop bounds
      if (posRef.current <= -loopWidth) posRef.current += loopWidth;
      if (posRef.current > 0)           posRef.current -= loopWidth;

      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${posRef.current}px)`;
      }
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        pausedRef.current = false;
      }
    }

    requestAnimationFrame(step);
  }

  // ── Pointer / touch drag ─────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    dragStart.current = { x: e.clientX, pos: posRef.current };
    trackRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !trackRef.current) return;
    const delta = e.clientX - dragStart.current.x;
    let  newPos = dragStart.current.pos + delta;

    // Wrap
    if (newPos <= -loopWidth) newPos += loopWidth;
    if (newPos >  0)          newPos -= loopWidth;

    posRef.current = newPos;
    trackRef.current.style.transform = `translateX(${newPos}px)`;
  }

  function onPointerUp() {
    dragging.current = false;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative select-none ${className}`}
      onMouseEnter={() => { pausedRef.current = true;  setArrowHint(true);  }}
      onMouseLeave={() => { pausedRef.current = false; setArrowHint(false); }}
    >
      {/* ── Edge fade overlays ── */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-[#f8fbf9] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#f8fbf9] to-transparent z-10" />

      {/* ── Arrow buttons (visible on hover) ── */}
      <div
        className={`transition-opacity duration-300 ${arrowHint ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ArrowBtn direction="left"  onClick={() => scrollByCards(1)}  />
        <ArrowBtn direction="right" onClick={() => scrollByCards(-1)} />
      </div>

      {/* ── Scroll track ── */}
      <div className="overflow-hidden py-4">
        <div
          ref={trackRef}
          className="flex gap-6 will-change-transform cursor-grab active:cursor-grabbing"
          style={{ width: `${items.length * STRIDE}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {items.map((service, i) => (
            <div
              key={`${service.title}-${i}`}
              className="flex-shrink-0"
              style={{ width: `${CARD_W_PX}px` }}
            >
              <ServiceCard {...service} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}