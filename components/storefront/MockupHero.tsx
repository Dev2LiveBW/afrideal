import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, ShoppingBag, Truck, ShieldCheck, Users, RefreshCw, Headphones, Tag, CheckCircle2, Sparkles, Star, Briefcase, Palette } from 'lucide-react';
import { ActionButton } from '@/components/brand/ActionButton';

export function MockupHero() {
  return (
    <section className="${badge.bg}-raised pt-6 pb-12">
      <div className="mx-auto max-w-market px-3 sm:px-6">
        
        {/*
          Two cards, one row, at every width — the two ways into the platform
          are a choice, and a choice reads as one when both options are in
          view together. On a 390px phone that leaves roughly 179px a card, so
          everything inside scales with it: padding, both type ramps, the
          bullet icons, the CTA and the photographs.
        */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-6">
          
          {/* Left Card: Marketplace */}
          <div className="relative isolate flex min-h-[310px] flex-col justify-between overflow-hidden rounded-[16px] bg-[#0e0701] p-3 text-white shadow-lg sm:min-h-[420px] sm:rounded-[24px] sm:p-8 lg:min-h-[460px] lg:p-10">
            <div className="relative z-10 max-w-full sm:max-w-[280px] lg:max-w-[320px]">
              <div className="mb-2.5 inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 sm:mb-6 sm:gap-1.5 sm:px-3 sm:py-1">
                <ShoppingBag className="h-2.5 w-2.5 text-white/80 sm:h-3.5 sm:w-3.5" />
                <span className="text-[7.5px] font-bold leading-tight tracking-wider text-white/90 sm:text-[11px]">SHOP THE MARKETPLACE</span>
              </div>
              
              <h1 className="mb-2 font-display text-[19px] font-bold leading-[1.1] sm:mb-4 sm:text-[32px] lg:text-[40px]">
                Compare. Buy.<br/>Save more.
              </h1>
              
              <p className="mb-2.5 text-[9.5px] leading-snug text-white/70 sm:mb-6 sm:text-[14px] sm:leading-relaxed">
                Compare prices from trusted local and international suppliers. Retail, bulk or wholesale - you choose.
              </p>
              
              <ul className="mb-3 space-y-1 sm:mb-8 sm:space-y-2.5">
                {['Best prices', 'Verified suppliers', 'Secure payments', 'Fast delivery'].map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-[9.5px] font-medium text-white/90 sm:gap-2.5 sm:text-[14px]">
                    <CheckCircle2 className="h-3 w-3 shrink-0 fill-[#E67E22] text-[#0e0701] sm:h-[18px] sm:w-[18px]" />
                    {item}
                  </li>
                ))}
              </ul>
              
              <Link href="/browse" className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-gold px-3 text-[10px] font-bold text-black transition-colors hover:bg-gold-light sm:h-12 sm:gap-2 sm:px-8 sm:text-[15px]">
                Browse products
                <ArrowRight className="h-3 w-3 shrink-0 sm:h-[18px] sm:w-[18px]" />
              </Link>
            </div>
            
            {/* Phone Image */}
            {/*
              `object-cover` in a full-height box cropped a 4:3 photograph into
              a tall narrow window, which threw away most of the composition —
              on a phone it showed cardboard and no phone. Contained and
              anchored bottom-right, the whole frame survives at every width;
              the box is a percentage of the card so it shrinks with it rather
              than being cropped to fit.
            */}
            <div
              className="pointer-events-none absolute bottom-0 right-0 z-0 h-[62%] w-full sm:h-[80%] sm:w-[92%] lg:h-[85%] lg:w-[95%]"
              style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 45%)' }}
            >
               {/*
                 Contained, a 4:3 photograph in a 179px-wide card paints at most
                 179×134 whatever the box height — so on a phone it could only
                 ever be half the share of the card it holds on desktop. Below
                 `sm` it covers the card instead and crops, which is the only
                 way a landscape frame fills a portrait one. The scrims below
                 carry the copy over it.
               */}
               <Image
                 src="/images/hero/mockup.jpg"
                 alt="App preview"
                 fill
                 className="object-contain object-bottom sm:object-right-bottom"
               />
            </div>
            {/* Gradient mask to fade image into black on the left for text readability */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-[#0e0701] via-[#0e0701]/45 to-transparent"></div>
          </div>

          {/* Right Card: Runner Service */}
          <div className="relative isolate flex min-h-[310px] flex-col justify-between overflow-hidden rounded-[16px] bg-[#F6EDE4] p-3 shadow-lg sm:min-h-[420px] sm:rounded-[24px] sm:p-8 lg:p-10">
            <div className="relative z-10 max-w-full sm:max-w-[280px] lg:max-w-[300px]">
              <div className="mb-2.5 inline-flex items-center gap-1 rounded-md bg-orange-100 px-1.5 py-0.5 sm:mb-6 sm:gap-1.5 sm:px-3 sm:py-1">
                <Truck className="h-2.5 w-2.5 text-[#D35400] sm:h-3.5 sm:w-3.5" />
                <span className="text-[7.5px] font-bold leading-tight tracking-wider text-[#D35400] sm:text-[11px]">RUNNER SERVICE</span>
              </div>
              
              <h1 className="mb-1.5 font-display text-[19px] font-bold leading-[1.1] text-ink sm:mb-2 sm:text-[32px] lg:text-[40px]">
                Can&apos;t find it listed?
              </h1>
              
              <p className="mb-2.5 text-[11px] font-semibold leading-snug text-[#D35400] sm:mb-6 sm:text-[16px] lg:text-[20px]">
                Our verified runners will source it for you.
              </p>
              
              <ul className="mb-3 space-y-1 sm:mb-8 sm:space-y-3">
                {['Find anything', 'Inspect & negotiate', 'Buy on your behalf', 'Personal tasks'].map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-[9.5px] font-medium text-ink sm:gap-2.5 sm:text-[15px]">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-[#27AE60] sm:h-5 sm:w-5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Runner Image */}
            {/*
              `-right-12` pushed 48px of the runner past the card, and the card
              clips — so a fixed slice of him was cut off at every width, worst
              on a phone where 48px is a sixth of the image. Anchored inside the
              card instead, and scaled by percentage so he shrinks with it.
            */}
            <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-[66%] w-[96%] sm:h-[88%] sm:w-[78%] lg:h-[95%] lg:w-[80%]">
               <Image
                 src="/images/hero/runner.jpg"
                 alt="Runner"
                 fill
                 className="object-contain object-right-bottom mix-blend-multiply"
               />
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-0 w-[70%] bg-gradient-to-r from-[#F6EDE4] via-[#F6EDE4]/70 to-transparent sm:w-[60%]" />
            
            <Link href="/request-a-runner" className="relative z-10 mt-auto flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-[#E67E22] px-2 text-[10px] font-bold text-white transition-colors hover:bg-[#D35400] sm:h-14 sm:gap-2 sm:rounded-xl sm:px-8 sm:text-[16px] lg:w-[80%]">
              Request a runner
              <ArrowRight className="h-3 w-3 shrink-0 sm:h-[18px] sm:w-[18px]" />
            </Link>
          </div>

        </div>

        {/* 6 Badges Strip */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-hairline pb-8">
          {[
            { icon: Sparkles, title: 'New Arrivals', sub: 'Latest trends', color: 'text-[#E67E22]', bg: 'bg-[#E67E22]/10' },
            { icon: Star, title: 'Top Rated', sub: 'Best sellers', color: 'text-[#27AE60]', bg: 'bg-[#27AE60]/10' },
            { icon: Briefcase, title: 'Become a Supplier', sub: 'Sell with us', color: 'text-[#7C3AED]', bg: 'bg-[#7C3AED]/10' },
            { icon: Palette, title: 'Color Application', sub: 'Custom styles', color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { icon: Tag, title: 'Best Prices', sub: 'Compare & save', color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { icon: Truck, title: 'Fast Delivery', sub: 'Nationwide', color: 'text-teal-500', bg: 'bg-teal-500/10' },
          ].map((badge, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full ${badge.bg}">
                <badge.icon size={22} className={badge.color} />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-ink leading-tight">{badge.title}</h4>
                <p className="text-[11px] text-muted leading-tight">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
