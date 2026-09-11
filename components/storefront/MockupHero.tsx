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
            </div>
            
            {/*
              Below `lg`: the band.

              A row of fixed proportion under the copy, 16:9 of the card's
              width. The photograph sits in its bottom-right corner and bleeds
              past the padding to the card's edge; the button sits in its
              bottom-left corner, over the photograph's foot. Because the band
              is its own row, the copy above can never run into either of
              them - the layered look of the earlier build without the runner
              landing on the bullet list, which is what the free-floating
              version did.

              Both cards use the same band, so both buttons sit on one line.
            */}
            <div className="relative mt-2 aspect-[16/9] w-full shrink-0 lg:hidden">
              <div className="pointer-events-none absolute -bottom-3.5 -right-3.5 top-0 w-[70%] sm:-bottom-8 sm:-right-8">
                <Image
                  src="/images/hero/mockup.jpg"
                  alt=""
                  fill
                  sizes="45vw"
                  className="object-contain object-right-bottom"
                />
              </div>
              <Link
                href="/browse"
                className="absolute bottom-0 left-0 z-10 flex h-8 w-[90%] items-center justify-center gap-1 whitespace-nowrap rounded-full bg-gold px-1.5 text-[10px] font-bold text-black transition-colors hover:bg-gold-light sm:h-12 sm:w-[76%] sm:gap-2 sm:px-4 sm:text-[15px]"
              >
                Browse products
                <ArrowRight className="hidden h-[18px] w-[18px] shrink-0 sm:block" />
              </Link>
            </div>

            {/*
              From `lg`: the original full-bleed treatment, masked into the
              card's black on its left edge so the copy keeps its contrast,
              and the button pinned to the card's foot.
            */}
            <div
              className="pointer-events-none absolute bottom-0 right-0 top-0 z-0 hidden w-[95%] lg:block"
              style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 45%)' }}
            >
              <Image src="/images/hero/mockup.jpg" alt="" fill sizes="640px" className="object-cover object-right" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-full bg-gradient-to-r from-[#0e0701] via-[#0e0701]/40 to-transparent lg:block" />
            <Link
              href="/browse"
              className="relative z-10 mt-auto hidden h-14 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full bg-gold px-8 text-[16px] font-bold text-black transition-colors hover:bg-gold-light lg:inline-flex"
            >
              Browse products
              <ArrowRight className="h-[18px] w-[18px] shrink-0" />
            </Link>
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
            
            {/*
              Below `lg`: the same band as the left card - the runner in its
              bottom-right corner, bleeding to the card's edge; the button in
              its bottom-left, over his feet. The band is the guarantee that
              he does not land on the bullet list.

              The runner photograph is trimmed to the subject (730x817, from a
              1024x819 frame that was a fifth empty ground), which is why it
              fills its corner rather than sitting small in it.

              The button carries `whitespace-nowrap` and light padding: with
              px-8 it wrapped "Request a runner" onto two lines at 620px.
            */}
            <div className="relative mt-2 aspect-[16/9] w-full shrink-0 lg:hidden">
              <div className="pointer-events-none absolute -bottom-3.5 -right-3.5 top-0 w-[58%] sm:-bottom-8 sm:-right-8">
                <Image
                  src="/images/hero/runner.jpg"
                  alt=""
                  fill
                  sizes="40vw"
                  className="object-contain object-right-bottom"
                />
              </div>
              <Link
                href="/request-a-runner"
                className="absolute bottom-0 left-0 z-10 flex h-8 w-[90%] items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#E67E22] px-1.5 text-[10px] font-bold text-white transition-colors hover:bg-[#D35400] sm:h-12 sm:w-[76%] sm:gap-2 sm:px-4 sm:text-[15px]"
              >
                Request a runner
                <ArrowRight className="hidden h-[18px] w-[18px] shrink-0 sm:block" />
              </Link>
            </div>

            {/* From `lg`: the original bottom-right runner and the button at the card's foot. */}
            <div className="pointer-events-none absolute -right-12 bottom-0 z-0 hidden h-[95%] w-[80%] lg:block">
              <Image
                src="/images/hero/runner.jpg"
                alt=""
                fill
                sizes="560px"
                className="object-contain object-right-bottom"
              />
            </div>
            <Link
              href="/request-a-runner"
              className="relative z-10 mt-auto hidden h-14 w-[80%] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#E67E22] px-8 text-[16px] font-bold text-white transition-colors hover:bg-[#D35400] lg:flex"
            >
              Request a runner
              <ArrowRight className="h-[18px] w-[18px] shrink-0" />
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
