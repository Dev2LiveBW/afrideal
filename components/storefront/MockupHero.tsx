import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, ShoppingBag, Truck, ShieldCheck, Users, RefreshCw, Headphones, Tag, CheckCircle2, Sparkles, Star, Briefcase, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MockupHero() {
  return (
    <section className="bg-surface-raised pt-4 pb-8 sm:pt-6 sm:pb-12">
      <div className="mx-auto max-w-market px-6">
        
        {/* Two Big Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:gap-6">
          
          {/* Left Card: Marketplace */}
          <div className="relative overflow-hidden rounded-2xl bg-[#0e0701] text-white p-3.5 sm:p-8 lg:p-10 shadow-lg min-h-[300px] sm:min-h-[400px] lg:min-h-[460px] flex flex-col justify-between isolate sm:rounded-[24px]">
            <div className="relative z-10 max-w-full sm:max-w-[280px] lg:max-w-[320px]">
              <div className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 mb-2.5 sm:gap-1.5 sm:px-3 sm:py-1 sm:mb-6">
                <ShoppingBag className="h-2.5 w-2.5 shrink-0 text-white/80 sm:h-3.5 sm:w-3.5" />
                <span className="text-[7.5px] font-bold tracking-wide text-white/90 sm:text-[11px] sm:tracking-wider">SHOP THE MARKETPLACE</span>
              </div>
              
              <h1 className="font-display text-[19px] leading-[1.08] font-bold mb-1.5 sm:text-[30px] sm:mb-4 lg:text-[40px] lg:leading-[1.1]">
                Compare. Buy.<br/>Save more.
              </h1>
              
              <p className="hidden text-[14px] text-white/70 leading-relaxed mb-6 sm:block">
                Compare prices from trusted local and international suppliers. Retail, bulk or wholesale - you choose.
              </p>
              
              <ul className="space-y-1 mb-3 sm:space-y-2.5 sm:mb-8">
                {['Best prices', 'Verified suppliers', 'Secure payments', 'Fast delivery'].map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-[10px] font-medium text-white/90 sm:gap-2.5 sm:text-[14px]">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-[#0e0701] fill-[#E67E22] sm:h-[18px] sm:w-[18px]" />
                    {item}
                  </li>
                ))}
              </ul>
              
              <Link href="/browse" className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-gold px-3 text-[10.5px] font-bold text-black hover:bg-gold-light transition-colors sm:h-12 sm:gap-2 sm:px-8 sm:text-[15px]">
                Browse products
                <ArrowRight className="h-3 w-3 sm:h-[18px] sm:w-[18px]" />
              </Link>
            </div>
            
            {/*
              Narrow: the product shot in flow, whole.

              As a full-bleed cover background it was cropped to a vertical
              slice of a 4:3 photograph - on a 290px card that meant one
              cardboard box blown up past its own resolution, which is what
              the product owner was looking at. Contained at the photograph's
              own 4:3 it stays legible and the phone, blender, headphones,
              bag and boxes are all still in it.
            */}
            <div className="relative z-0 mt-2 aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg lg:hidden">
              <Image
                src="/images/hero/mockup.jpg"
                alt=""
                fill
                sizes="45vw"
                className="object-contain object-bottom"
              />
            </div>

            {/*
              Wide: the original full-bleed treatment, masked into the card's
              black on its left edge so the copy keeps its contrast. Only
              from `lg`, where the card is 664px and the crop is gentle.
            */}
            <div
              className="pointer-events-none absolute bottom-0 right-0 top-0 z-0 hidden w-[95%] lg:block"
              style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 45%)' }}
            >
              <Image src="/images/hero/mockup.jpg" alt="" fill sizes="640px" className="object-cover object-right" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-full bg-gradient-to-r from-[#0e0701] via-[#0e0701]/40 to-transparent lg:block" />
          </div>

          {/* Right Card: Runner Service */}
          <div className="relative overflow-hidden rounded-2xl bg-[#F6EDE4] p-3.5 sm:p-8 lg:p-10 shadow-lg min-h-[300px] sm:min-h-[400px] lg:min-h-[460px] flex flex-col justify-between isolate sm:rounded-[24px]">
            <div className="relative z-10 max-w-full sm:max-w-[280px] lg:max-w-[300px]">
              <div className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-1.5 py-0.5 mb-2.5 sm:gap-1.5 sm:px-3 sm:py-1 sm:mb-6">
                <Truck className="h-2.5 w-2.5 shrink-0 text-[#D35400] sm:h-3.5 sm:w-3.5" />
                <span className="text-[7.5px] font-bold tracking-wide text-[#D35400] sm:text-[11px] sm:tracking-wider">RUNNER SERVICE</span>
              </div>
              
              <h1 className="font-display text-[19px] leading-[1.08] font-bold text-ink mb-1 sm:text-[30px] sm:mb-2 lg:text-[40px] lg:leading-[1.1]">
                Can&apos;t find it listed?
              </h1>
              
              <p className="text-[11px] font-semibold text-[#D35400] leading-snug mb-2.5 sm:text-[16px] sm:mb-6 lg:text-[20px]">
                Our verified runners will source it for you.
              </p>
              
              <ul className="space-y-1 mb-3 sm:space-y-3 sm:mb-8">
                {['Find anything', 'Inspect & negotiate', 'Buy on your behalf', 'Personal tasks'].map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-[10px] font-medium text-ink sm:gap-2.5 sm:text-[15px]">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-[#27AE60] sm:h-5 sm:w-5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Runner Image */}
            {/*
              The runner sits in the flow on a narrow card, and only becomes
              a corner element once there is room for one.

              Three attempts got here. Held at h-[95%] the box was a tall
              narrow slot and object-contain left it two-thirds empty. The
              photograph also carried its own empty ground - 20% left, 11%
              right - so it is trimmed to the subject, 1024x819 landscape
              becoming 730x817. Sized to fill, though, it then covered the
              bullet list: dark figure, dark text, nothing readable.

              The card is about 290px wide below `lg` because the two cards
              are side by side from the narrowest width. That is not enough
              for a text column beside a photograph, so nothing is layered -
              copy, then runner, then the call to action, in that order. At
              `lg` the card is 664px and the original bottom-right treatment
              takes over, where the overlap was always intentional.

              Below `lg` it takes the full content width. Nothing sits under
              it any more, so size only costs card height, and the note from
              the product owner twice over was that it read too small.

              shrink-0 matters: as a flex item in a column the box was being
              compressed on the main axis, and with an aspect ratio set the
              width followed it down - 61% of the card at 390px against 78%
              at 640px, for the same rule.
            */}
            <div className="relative z-0 mt-2 aspect-[730/817] w-full shrink-0 self-end lg:pointer-events-none lg:absolute lg:bottom-0 lg:-right-12 lg:mt-0 lg:aspect-auto lg:h-[95%] lg:w-[80%] lg:self-auto">
               <Image
                 src="/images/hero/runner.jpg"
                 alt=""
                 fill
                 sizes="(max-width: 1024px) 45vw, 560px"
                 className="object-contain object-bottom lg:object-right-bottom"
               />
            </div>
            
            <Link href="/request-a-runner" className="relative z-10 mt-auto flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-[#E67E22] px-2 text-[10.5px] font-bold text-white hover:bg-[#D35400] transition-colors sm:h-12 sm:gap-2 sm:rounded-xl sm:px-8 sm:text-[15px] lg:h-14 lg:w-[80%] lg:text-[16px]">
              Request a runner
              <ArrowRight className="h-3 w-3 sm:h-[18px] sm:w-[18px]" />
            </Link>
          </div>

        </div>

        {/* 6 Badges Strip */}
        <div className="mt-4 grid grid-cols-6 gap-1 border-b border-hairline pb-4 sm:mt-8 sm:gap-4 sm:pb-8">
          {[
            { icon: Sparkles, title: 'New Arrivals', sub: 'Latest trends', color: 'text-[#E67E22]', bg: 'bg-[#E67E22]/10' },
            { icon: Star, title: 'Top Rated', sub: 'Best sellers', color: 'text-[#27AE60]', bg: 'bg-[#27AE60]/10' },
            { icon: Briefcase, title: 'Become a Supplier', sub: 'Sell with us', color: 'text-[#7C3AED]', bg: 'bg-[#7C3AED]/10' },
            { icon: FileText, title: 'Request a Quote', sub: 'Listed or not', color: 'text-royal', bg: 'bg-royal/10', href: '/rfq' },
            { icon: Tag, title: 'Best Prices', sub: 'Compare & save', color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { icon: Truck, title: 'Fast Delivery', sub: 'Nationwide', color: 'text-teal-500', bg: 'bg-teal-500/10' },
          ].map((badge, i) => {
            const body = (
              <>
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-full sm:h-12 sm:w-12', badge.bg)}>
                  <badge.icon className={cn('h-3.5 w-3.5 sm:h-[22px] sm:w-[22px]', badge.color)} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[8.5px] font-bold leading-tight text-ink sm:text-[13px]">{badge.title}</h4>
                  <p className="hidden text-[11px] leading-tight text-muted sm:block">{badge.sub}</p>
                </div>
              </>
            );
            const cls = 'flex flex-col items-center gap-1 text-center sm:gap-2';
            // A badge with somewhere to go is a link; the rest are labels.
            return 'href' in badge && badge.href ? (
              <Link key={i} href={badge.href} className={cn(cls, 'group outline-none')}>
                {body}
              </Link>
            ) : (
              <div key={i} className={cls}>
                {body}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
