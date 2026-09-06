import Image from 'next/image';
import Link from 'next/link';
import { Users, Package, ShieldCheck, Truck, CreditCard, MapPin } from 'lucide-react';

export function StatsBanner() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="flex flex-wrap items-center justify-around gap-6 rounded-2xl bg-[#111111] px-8 py-6">
        {[
          { icon: Users, stat: '100+', label: 'Verified Suppliers' },
          { icon: Package, stat: '10,000+', label: 'Products' },
          { icon: ShieldCheck, stat: 'Secure', label: 'Payments' },
          { icon: Truck, stat: 'Fast', label: 'Reliable Delivery' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E67E22]/10">
              <item.icon size={20} className="text-[#E67E22]" />
            </div>
            <div>
              <p className="text-[22px] font-bold leading-none text-white">{item.stat}</p>
              <p className="text-[12px] text-white/60">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PromoCards() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="relative z-10 max-w-[55%]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#27AE60]">New Arrivals</p>
            <p className="mt-1 text-[22px] font-bold leading-tight text-gray-900">Fresh products added daily.</p>
            <Link href="/browse" className="mt-4 inline-flex items-center rounded-full bg-[#27AE60] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#219150] transition-colors">Explore now &#8594;</Link>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-[48%]">
            <Image src="https://images.unsplash.com/photo-1638803782506-d975a6809f43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80" alt="New arrivals" fill className="object-contain object-bottom pr-2" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-[#F0EEFF] p-6 shadow-sm ring-1 ring-black/5">
          <div className="relative z-10 max-w-[55%]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C3AED]">Top Rated</p>
            <p className="mt-1 text-[22px] font-bold leading-tight text-gray-900">Shop from the most loved products.</p>
            <Link href="/browse" className="mt-4 inline-flex items-center rounded-full bg-[#7C3AED] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#6D28D9] transition-colors">Shop now &#8594;</Link>
          </div>
          <div className="absolute right-2 bottom-0 top-0 flex w-[45%] items-center justify-center">
            <div className="relative h-32 w-32">
              <Image src="https://images.unsplash.com/photo-1560343776-97e7d202f6a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=300&q=80" alt="Top rated" fill className="object-contain" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-[#FFF6EE] p-6 shadow-sm ring-1 ring-black/5">
          <div className="relative z-10 max-w-[55%]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#E67E22]">Become a Supplier</p>
            <p className="mt-1 text-[22px] font-bold leading-tight text-gray-900">Grow your business with thousands of buyers.</p>
            <Link href="/signup" className="mt-4 inline-flex items-center rounded-full bg-[#E67E22] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#D35400] transition-colors">Join AfriDeal &#8594;</Link>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-[45%]">
            <Image src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80" alt="Become a supplier" fill className="object-contain object-bottom" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustPaymentStrip() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 pb-8">
      <div className="flex flex-wrap items-center justify-around gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
        {[
          { icon: CreditCard, title: 'Multiple Payment Options', sub: 'Pay how you like' },
          { icon: ShieldCheck, title: 'Buyer Protection', sub: "We've got you covered" },
          { icon: MapPin, title: 'Easy Order Tracking', sub: 'Track every step' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <item.icon size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-900">{item.title}</p>
              <p className="text-[12px] text-gray-500">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
