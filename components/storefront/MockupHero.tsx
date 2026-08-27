import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, ShoppingBag, Truck, ShieldCheck, Users, RefreshCw, Headphones, Tag, CheckCircle2 } from 'lucide-react';
import { ActionButton } from '@/components/brand/ActionButton';

export function MockupHero() {
  return (
    <section className="bg-surface-raised pt-6 pb-12">
      <div className="mx-auto max-w-market px-6">
        
        {/* Two Big Cards */}
        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Left Card: Marketplace */}
          <div className="relative overflow-hidden rounded-[24px] bg-[#111111] text-white p-8 sm:p-10 shadow-lg min-h-[460px] flex flex-col justify-between isolate">
            <div className="relative z-10 max-w-[280px] sm:max-w-[320px]">
              <div className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1 mb-6">
                <ShoppingBag size={14} className="text-white/80" />
                <span className="text-[11px] font-bold tracking-wider text-white/90">SHOP THE MARKETPLACE</span>
              </div>
              
              <h1 className="font-display text-[40px] leading-[1.1] font-bold mb-4">
                Compare. Buy.<br/>Save more.
              </h1>
              
              <p className="text-[14px] text-white/70 leading-relaxed mb-6">
                Compare prices from trusted local and international suppliers. Retail, bulk or wholesale - you choose.
              </p>
              
              <ul className="space-y-2.5 mb-8">
                {['Best prices', 'Verified suppliers', 'Secure payments', 'Fast delivery'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-[14px] font-medium text-white/90">
                    <CheckCircle2 size={18} className="text-gold fill-gold text-[#111111]" />
                    {item}
                  </li>
                ))}
              </ul>
              
              <Link href="/browse" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold px-8 text-[15px] font-bold text-black hover:bg-gold-light transition-colors">
                Browse products
                <ArrowRight size={18} />
              </Link>
            </div>
            
            {/* Phone Image */}
            <div className="absolute right-0 bottom-0 top-0 w-[45%] opacity-90 sm:opacity-100 mix-blend-screen overflow-hidden z-0">
               <Image src="/images/home/phone-mockup.jpg" alt="App preview" fill className="object-cover object-left" />
            </div>
            {/* Gradient mask to fade image into black on the left */}
            <div className="absolute inset-y-0 right-0 w-[60%] bg-gradient-to-r from-[#111111] via-[#111111]/80 to-transparent pointer-events-none z-0"></div>
          </div>

          {/* Right Card: Runner Service */}
          <div className="relative overflow-hidden rounded-[24px] bg-[#FFF6EE] p-8 sm:p-10 shadow-lg min-h-[460px] flex flex-col justify-between isolate">
            <div className="relative z-10 max-w-[280px] sm:max-w-[300px]">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-orange-100 px-3 py-1 mb-6">
                <Truck size={14} className="text-[#D35400]" />
                <span className="text-[11px] font-bold tracking-wider text-[#D35400]">RUNNER SERVICE</span>
              </div>
              
              <h1 className="font-display text-[40px] leading-[1.1] font-bold text-ink mb-2">
                Can&apos;t find it listed?
              </h1>
              
              <p className="text-[20px] font-semibold text-[#D35400] leading-snug mb-6">
                Our verified runners will source it for you.
              </p>
              
              <ul className="space-y-3 mb-8">
                {['Find anything', 'Inspect & negotiate', 'Buy on your behalf', 'Personal tasks'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-[15px] font-medium text-ink">
                    <CheckCircle2 size={20} className="text-[#27AE60]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Runner Image */}
            <div className="absolute -right-8 -bottom-0 w-[60%] h-[80%] z-0">
               <Image src="/images/home/procure-runner.jpg" alt="Runner" fill className="object-contain object-bottom" />
            </div>
            
            <Link href="/request-a-runner" className="relative z-10 flex h-14 w-full sm:w-[80%] items-center justify-center gap-2 rounded-xl bg-[#E67E22] px-8 text-[16px] font-bold text-white hover:bg-[#D35400] transition-colors mt-auto">
              Request a runner
              <ArrowRight size={18} />
            </Link>
          </div>

        </div>

        {/* 6 Badges Strip */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-hairline pb-8">
          {[
            { icon: Tag, title: 'Best Prices', sub: 'Compare & save', color: 'text-gold' },
            { icon: ShieldCheck, title: 'Verified Suppliers', sub: 'Trusted & reliable', color: 'text-[#27AE60]' },
            { icon: Truck, title: 'Fast Delivery', sub: 'Across Botswana', color: 'text-blue-500' },
            { icon: Users, title: 'Verified Partners', sub: 'Background checked', color: 'text-purple-500' },
            { icon: RefreshCw, title: 'Easy Returns', sub: 'Hassle-free refunds', color: 'text-[#E67E22]' },
            { icon: Headphones, title: '24/7 Support', sub: "We're here to help", color: 'text-[#27AE60]' },
          ].map((badge, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
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
