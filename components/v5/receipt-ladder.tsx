"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const TIERS = [
  { volume: "1 - 9 units", price: "BWP 1,200", discount: "0%" },
  { volume: "10 - 49 units", price: "BWP 1,150", discount: "4%" },
  { volume: "50 - 99 units", price: "BWP 1,050", discount: "12%" },
  { volume: "100+ units", price: "BWP 980", discount: "18%" },
];

export function ReceiptLadder() {
  const [activeTier, setActiveTier] = useState(0);

  return (
    <div className="border border-[#111111] bg-[#F4F4F5] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#111111] max-w-2xl font-mono">
      <div className="flex justify-between items-end border-b-2 border-[#111111] pb-4 mb-6">
        <div>
          <h3 className="text-xl font-black uppercase text-[#111111]">Volume Pricing</h3>
          <p className="text-xs text-[#71717A] mt-1">Terminal Printout // SEC-09</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#71717A] uppercase">Current Market Rate</div>
          <div className="text-lg font-bold text-[#111111]">BWP 1,200/u</div>
        </div>
      </div>

      <div className="space-y-2">
        {TIERS.map((tier, idx) => {
          const isActive = activeTier === idx;
          return (
            <div 
              key={idx}
              onMouseEnter={() => setActiveTier(idx)}
              className={`relative cursor-pointer flex items-center p-3 transition-colors ${
                isActive ? "bg-[#111111] text-[#F4F4F5]" : "hover:bg-[#F4F4F5] text-[#111111]"
              }`}
            >
              <div className="w-8 flex-shrink-0">
                {isActive ? <ChevronRight size={16} /> : <span className="opacity-0">-</span>}
              </div>
              <div className="flex-grow flex items-baseline">
                <span className="font-bold">{tier.volume}</span>
                <span className={`flex-grow mx-4 overflow-hidden whitespace-nowrap opacity-20 ${isActive ? "text-[#F4F4F5]" : "text-[#111111]"}`}>
                  ...................................................................................
                </span>
                <span className="flex flex-col items-end">
                   <span className="font-black text-lg">{tier.price}</span>
                   <span className={`text-[10px] uppercase ${isActive ? "text-[#0044FF]" : "text-[#71717A]"}`}>
                     Save {tier.discount}
                   </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-dashed border-[#111111] flex justify-between items-center">
        <span className="text-xs text-[#71717A]">END OF TRANSMISSION</span>
        <button className="bg-[#0044FF] text-white px-4 py-2 text-xs font-bold uppercase hover:bg-[#111111] transition-colors">
          Lock Price
        </button>
      </div>
    </div>
  );
}
