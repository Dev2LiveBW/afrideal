'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * The promo slot. Benchmark §3a: the first cell of the catalogue grid is not
 * a product but a 179×301 slideshow at 8px radius - a card-sized poster that
 * turns over on its own, with a dot row at its foot.
 *
 * This carries what the three `PromoCards` used to say on their own row: new
 * arrivals, best rated, become a supplier. Same copy, same routes, one slot.
 *
 * Measured behaviour (§4b): the dots ease over .3s; the poster image has a
 * .3s transform transition that is switched off while a finger is on it;
 * pressing a slide drops it to 90% opacity. The turn-over is a scroll-snap
 * so a swipe works without any code, and the timer just scrolls.
 */

export interface Promo {
  key: string;
  eyebrow: string;
  headline: string;
  cta: string;
  href: string;
  image: string;
  /** Ground, eyebrow and button colours. */
  surface: string;
  accent: string;
  button: string;
}

const DWELL_MS = 4000;

export function PromoCarousel({ promos, className }: { promos: Promo[]; className?: string }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [touching, setTouching] = useState(false);

  // Which slide is showing, read off the scroll position.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setIndex(Math.round(track.scrollLeft / track.clientWidth));
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  // The timer. Paused under a finger; the dwell is the benchmark's.
  useEffect(() => {
    if (touching || promos.length < 2) return;
    const id = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const next = (Math.round(track.scrollLeft / track.clientWidth) + 1) % promos.length;
      track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    }, DWELL_MS);
    return () => window.clearInterval(id);
  }, [touching, promos.length]);

  return (
    <div className={cn('relative overflow-hidden rounded-[8px]', className)}>
      <ul
        ref={trackRef}
        onTouchStart={() => setTouching(true)}
        onTouchEnd={() => setTouching(false)}
        onTouchCancel={() => setTouching(false)}
        className="no-scrollbar flex aspect-[179/301] w-full snap-x snap-mandatory overflow-x-auto"
        aria-roledescription="carousel"
      >
        {promos.map((promo) => (
          <li key={promo.key} className="relative h-full w-full shrink-0 snap-start">
            <Link
              href={promo.href}
              className={cn('press-soft relative flex h-full flex-col p-3 outline-none', promo.surface)}
            >
              <p className={cn('text-[10px] font-bold uppercase tracking-[0.12em]', promo.accent)}>
                {promo.eyebrow}
              </p>
              <p className="mt-1 text-[15px] font-bold leading-[1.2] text-[#222]">{promo.headline}</p>
              <span
                className={cn(
                  'mt-2.5 inline-flex h-7 w-fit items-center rounded-full px-3 text-[11px] font-bold',
                  promo.button,
                )}
              >
                {promo.cta} →
              </span>

              {/* The poster's picture, in the lower half, under the .3s transform the benchmark gives it. */}
              <div
                className={cn(
                  'relative mt-auto h-[46%] w-full transition-transform duration-300 ease-out',
                  !touching && 'hover:scale-[1.03]',
                )}
                style={touching ? { transition: 'none' } : undefined}
              >
                <Image
                  src={promo.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, 220px"
                  className="object-contain object-bottom"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* The dots. Benchmark: `transition: all .3s ease`. */}
      {promos.length > 1 && (
        <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {promos.map((promo, i) => (
            <span
              key={promo.key}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 ease-in-out',
                i === index ? 'w-4 bg-[#222]' : 'w-1.5 bg-[#222]/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
