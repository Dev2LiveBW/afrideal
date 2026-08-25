import React from "react";

export function V5Footer() {
  return (
    <footer className="border-t border-[#111111] bg-[#F4F4F5] pt-24 pb-12 px-4 sm:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-[#111111] pb-16">
        
        <div className="md:col-span-2">
          <h2 className="font-serif text-4xl sm:text-6xl text-[#111111] leading-[0.9] tracking-[-0.02em] mb-6">
            AfriDeal
          </h2>
          <p className="font-sans text-[#71717A] max-w-sm text-sm">
            The definitive institutional procurement network for the African continent. Uncompromising reliability, brutal transparency.
          </p>
        </div>

        <div>
          <h4 className="font-mono text-[10px] text-[#71717A] uppercase mb-4">Operations</h4>
          <ul className="space-y-2 font-mono text-xs uppercase font-bold text-[#111111]">
            <li><a href="#" className="hover:text-[#0044FF] transition-colors">Runner Network</a></li>
            <li><a href="#" className="hover:text-[#0044FF] transition-colors">Supplier Index</a></li>
            <li><a href="#" className="hover:text-[#0044FF] transition-colors">Escrow Protocol</a></li>
            <li><a href="#" className="hover:text-[#0044FF] transition-colors">Logistics API</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-mono text-[10px] text-[#71717A] uppercase mb-4">Corporate</h4>
          <ul className="space-y-2 font-mono text-xs uppercase font-bold text-[#111111]">
            <li><a href="#" className="hover:text-[#0044FF] transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-[#0044FF] transition-colors">Legal & SEC</a></li>
            <li><a href="#" className="hover:text-[#0044FF] transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-[#0044FF] transition-colors">Contact</a></li>
          </ul>
        </div>

      </div>

      <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[10px] text-[#71717A] uppercase tracking-widest">
        <div>&copy; {new Date().getFullYear()} AfriDeal Group Ltd.</div>
        <div className="flex gap-4">
          <span>Sys: v5.0.0</span>
          <span>Node: GBE-01</span>
        </div>
      </div>
    </footer>
  );
}
