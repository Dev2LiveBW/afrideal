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
      <ol className="grid gap-8 md:grid-cols-5 md:gap-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;

          return (
            <li key={step.title} className="relative min-w-0 md:text-center">
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[calc(50%+2.25rem)] right-[calc(-50%+2.25rem)] top-7 hidden border-t border-dashed border-hairline-strong md:block"
                />
              )}

              <div className="flex items-center gap-4 md:flex-col md:gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
                    TONES[step.tone],
                  )}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </span>

                <div className="min-w-0">
                  <h3 className="text-[14.5px] font-semibold leading-5 text-ink">
                    <span className="font-mono text-[12px] tabular-nums text-muted">
                      {index + 1}.
                    </span>{' '}
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-5 text-muted md:mx-auto md:max-w-[22ch]">
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
