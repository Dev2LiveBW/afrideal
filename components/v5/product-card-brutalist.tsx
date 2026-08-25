"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Package } from "lucide-react";

interface BrutalistProductCardProps {
  id: string;
  name: string;
  category: string;
  price: string;
  moq: number;
}

export function BrutalistProductCard({ id, name, category, price, moq }: BrutalistProductCardProps) {
  return (
    <motion.div 
      whileHover={{ x: 2, y: 2, boxShadow: "2px 2px 0px 0px #111111" }}
      className="group flex flex-col border border-[#111111] bg-[#F4F4F5] shadow-[6px_6px_0px_0px_#111111] transition-all cursor-pointer overflow-hidden"
    >
      {/* Image / Graphic Area */}
      <div className="aspect-[4/3] border-b border-[#111111] bg-[#F4F4F5] relative p-6 flex flex-col items-center justify-center">
        <Package size={48} className="text-[#111111] opacity-20 group-hover:opacity-100 transition-opacity" strokeWidth={1} />
        
        {/* Abstract overlay graphics */}
        <div className="absolute top-2 left-2 font-mono text-[9px] text-[#111111] uppercase tracking-widest border border-[#111111] px-1 bg-[#F4F4F5]">
          {category}
        </div>
        <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[#111111] opacity-50">
          ID:{id.substring(0,8)}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-serif text-2xl font-medium text-[#111111] leading-tight mb-4 group-hover:text-[#0044FF] transition-colors">
          {name}
        </h3>
        
        <div className="mt-auto pt-4 border-t border-dashed border-[#111111]/50 grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[10px] text-[#71717A] uppercase mb-1">Target Price</div>
            <div className="font-mono text-sm font-bold text-[#111111]">BWP {price}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#71717A] uppercase mb-1">Min. Order</div>
            <div className="font-mono text-sm font-bold text-[#111111]">{moq} Units</div>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="bg-[#111111] text-[#F4F4F5] p-3 flex justify-between items-center group-hover:bg-[#0044FF] transition-colors">
        <span className="font-mono text-xs uppercase font-bold tracking-widest">Trade Issue</span>
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
}
