import Link from 'next/link';
import { ShoppingCart, Package, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PathChooser({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {/* Retail */}
      <div className="flex flex-col justify-between rounded-xl bg-[#FFF6EE] p-5 shadow-sm ring-1 ring-black/5">
        <div>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5B041]/20">
            <ShoppingCart size={20} className="text-[#D35400]" />
          </div>
          <h3 className="text-[20px] font-bold text-ink">Retail</h3>
          <p className="mt-1 text-[13px] font-semibold text-ink">Buy 1 – 4 items</p>
          <p className="mt-1 text-[13px] text-muted">Great prices for everyday needs</p>
        </div>
        <Link href="/browse" className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-[#F5B041] px-4 text-[13px] font-bold text-black hover:bg-[#F5B041]/90 transition-colors">
          Shop Retail
        </Link>
      </div>

      {/* Bulk */}
      <div className="flex flex-col justify-between rounded-xl bg-forest-wash p-5 shadow-sm ring-1 ring-black/5">
        <div>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-forest/10">
            <Package size={20} className="text-forest" />
          </div>
          <h3 className="text-[20px] font-bold text-ink">Bulk</h3>
          <p className="mt-1 text-[13px] font-semibold text-ink">Buy 5 – 49 items</p>
          <p className="mt-1 text-[13px] text-muted">Lower prices when you buy more</p>
        </div>
        <Link href="/browse?tier=BULK" className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-forest px-4 text-[13px] font-bold text-white hover:bg-forest-light transition-colors">
          Buy in Bulk
        </Link>
      </div>

      {/* Wholesale */}
      <div className="flex flex-col justify-between rounded-xl bg-royal-wash p-5 shadow-sm ring-1 ring-black/5">
        <div>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-royal/10">
            <Building2 size={20} className="text-royal" />
          </div>
          <h3 className="text-[20px] font-bold text-ink">Wholesale</h3>
          <p className="mt-1 text-[13px] font-semibold text-ink">Buy 50+ items</p>
          <p className="mt-1 text-[13px] text-muted">Best prices for business & resale</p>
        </div>
        <Link href="/browse?tier=WHOLESALE" className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-royal px-4 text-[13px] font-bold text-white hover:bg-royal-light transition-colors">
          Shop Wholesale
        </Link>
      </div>
    </div>
  );
}
