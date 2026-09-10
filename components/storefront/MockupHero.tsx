import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, ShoppingBag, Truck, ShieldCheck, Users, RefreshCw, Headphones, Tag, CheckCircle2, Sparkles, Star, Briefcase, Palette } from 'lucide-react';
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
            
            {/* Phone Image */}
            <div 
              className="absolute right-0 bottom-0 top-0 w-[95%] z-0 pointer-events-none"
              style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 45%)' }}
            >
               <Image src="/images/hero/mockup.jpg" alt="App preview" fill className="object-cover object-right" />
            </div>
            {/* Gradient mask to fade image into black on the left for text readability */}
            <div className="absolute inset-y-0 right-0 w-[100%] bg-gradient-to-r from-[#0e0701] via-[#0e0701]/40 to-transparent pointer-events-none z-0"></div>
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
            <div className="absolute -right-12 bottom-0 w-[80%] h-[95%] z-0 pointer-events-none">
               <Image src="/images/hero/runner.jpg" alt="Runner" fill className="object-contain object-right-bottom" />
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
            { icon: Palette, title: 'Color Application', sub: 'Custom styles', color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { icon: Tag, title: 'Best Prices', sub: 'Compare & save', color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { icon: Truck, title: 'Fast Delivery', sub: 'Nationwide', color: 'text-teal-500', bg: 'bg-teal-500/10' },
          ].map((badge, i) => (
            <div key={i} className="flex flex-col items-center gap-1 text-center sm:gap-2">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-full sm:h-12 sm:w-12', badge.bg)}>
                <badge.icon className={cn('h-3.5 w-3.5 sm:h-[22px] sm:w-[22px]', badge.color)} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[8.5px] font-bold leading-tight text-ink sm:text-[13px]">{badge.title}</h4>
                <p className="hidden text-[11px] leading-tight text-muted sm:block">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
