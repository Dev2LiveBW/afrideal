import { ClipboardList, CreditCard, FileText, PackageSearch, Truck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * How the platform is used, in five steps, on one line.
 *
 * This is the shortest true account of the whole service - the version a
 * visitor reads before they have decided to care. It sits above the detailed
 * flows rather than replacing them: a reader who wants the state machine can
 * scroll to it, and a reader who wants to know what they are signing up for
 * gets it in five phrases.
 *
 * The connectors are dotted and horizontal on wide screens and disappear
 * entirely below `md`, where the steps stack. A dotted rule drawn vertically
 * through a stack of cards reads as a timeline of things that have already
 * happened, which is not what this is.
 */

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Tell us what you need',
    body: 'Shop the catalogue, or describe something it does not carry.',
    tone: 'forest',
  },
  {
    icon: FileText,
    title: 'Get a price',
    body: 'A published rung on a listing, or a quote from a runner or our desk.',
    tone: 'gold',
  },
  {
    icon: CreditCard,
    title: 'Pay AfriDeal',
    body: 'Through a licensed payment provider. You are buying from us, not the supplier.',
    tone: 'royal',
  },
  {
    icon: PackageSearch,
    title: 'We procure',
    body: 'We buy from a verified supplier, or a runner finds and checks it.',
    tone: 'forest',
  },
  {
    icon: Truck,
    title: 'We deliver',
    body: 'A tracked courier brings it to you, and you confirm it arrived.',
    tone: 'gold',
  },
] as const;

const TONES = {
  forest: 'bg-[#E67E22]-wash text-forest ring-forest/20',
  gold: 'bg-orange-50 text-[#E67E22] ring-[#E67E22]/20',
  royal: 'bg-purple-50 text-purple-600 ring-purple-600/20',
} as const;

export function HowItWorks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ol className="grid grid-cols-5 gap-1 sm:gap-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isLastOdd = index === STEPS.length - 1;

          return (
            <li
              key={step.title}
              className={cn(
                'relative min-w-0 rounded-xl border border-hairline/60 bg-surface-raised/70 p-2.5 text-center sm:border-0 sm:bg-transparent sm:p-0 md:text-center',
                isLastOdd && 'col-span-2 sm:col-span-1 max-w-[260px] mx-auto w-full',
              )}
            >
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[calc(50%+2.25rem)] right-[calc(-50%+2.25rem)] top-7 hidden border-t border-dashed border-hairline-strong md:block"
                />
              )}

              <div className="flex flex-col items-center gap-1 text-center md:gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset sm:h-14 sm:w-14',
                    TONES[step.tone],
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
                </span>

                <div className="min-w-0">
                  <h3 className="text-[9px] font-semibold leading-tight text-ink sm:text-[14.5px] sm:leading-5">
                    <span className="font-mono text-[7.5px] tabular-nums text-muted sm:text-[12px]">
                      {index + 1}.
                    </span>{' '}
                    {step.title}
                  </h3>
                  <p className="hidden mt-0.5 text-[5.5px] leading-snug text-muted line-clamp-3 sm:block sm:mt-1.5 sm:line-clamp-none sm:text-[12.5px] sm:leading-5 md:mx-auto md:max-w-[22ch]">
                    {step.body}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
