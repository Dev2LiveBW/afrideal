"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Activity } from "lucide-react";

export function HeroEditorial() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-8 border-b border-[#111111] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 relative">
      
      {/* Left Col: Massive Typographic Statement */}
      <div className="lg:col-span-8 lg:pr-12 lg:border-r border-[#111111] flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#0044FF] mb-6 flex items-center gap-2"
        >
          <Activity size={14} /> Live Trade Network
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[100px] leading-[0.9] tracking-[-0.04em] text-[#111111]"
        >
          Trade <span className="italic font-light">Without</span> <br/>
          Compromise.
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 max-w-md"
        >
          <p className="font-sans text-[#71717A] text-lg leading-relaxed mb-8">
            Access Africa&apos;s most reliable supply chains. Institutional-grade procurement, radically transparent pricing.
          </p>
          <button className="group relative inline-flex items-center gap-3 bg-[#111111] text-[#F4F4F5] px-6 py-4 font-mono font-bold text-sm uppercase tracking-wider overflow-hidden hover:bg-[#0044FF] transition-colors shadow-[4px_4px_0px_0px_#111111] hover:shadow-[2px_2px_0px_0px_#111111] hover:translate-x-[2px] hover:translate-y-[2px]">
            <span className="relative z-10">Start Sourcing</span>
            <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>

      {/* Right Col: Terminal / Status Board */}
      <div className="lg:col-span-4 lg:pl-12 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="border border-[#111111] p-4 bg-[#F4F4F5] shadow-[4px_4px_0px_0px_#111111]">
            <div className="font-mono text-[10px] text-[#71717A] uppercase mb-1">Index</div>
            <div className="font-mono text-3xl font-black text-[#111111] flex items-baseline gap-2">
              BWP 42,901 <span className="text-sm font-normal text-green-600">↑ 2.4%</span>
            </div>
            <div className="font-mono text-xs text-[#111111] mt-2 pt-2 border-t border-[#111111]/20">
              Total Managed Volume
            </div>
          </div>

          <div className="border border-[#111111] p-4 bg-[#F4F4F5] shadow-[4px_4px_0px_0px_#111111]">
            <div className="font-mono text-[10px] text-[#71717A] uppercase mb-1">Active Runners</div>
            <div className="font-mono text-3xl font-black text-[#111111]">1,204</div>
            <div className="font-mono text-xs text-[#111111] mt-2 pt-2 border-t border-[#111111]/20">
              Across 14 regions
            </div>
          </div>
        </div>

        <div className="mt-12 lg:mt-0 pt-8 border-t border-[#111111]">
           <div className="font-mono text-[10px] text-[#71717A] uppercase mb-2">Network Status</div>
           <div className="flex items-center gap-2 font-mono text-sm font-bold text-[#111111]">
             <span className="w-2 h-2 bg-green-500 animate-pulse" /> Systems Operational
           </div>
        </div>
      </div>
    </section>
  );
}
