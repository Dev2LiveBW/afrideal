"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  TrendingDown, 
  Package, 
  Truck, 
  Sliders,
  CheckCircle2,
  ChevronDown
} from "lucide-react";

export function HeroAntigravity() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tilt animation physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), {
    stiffness: 150,
    damping: 20,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = (e.clientX - rect.left) / width - 0.5;
    const mouseYPos = (e.clientY - rect.top) / height - 0.5;
    mouseX.set(mouseXPos);
    mouseY.set(mouseYPos);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[92vh] pt-28 pb-16 px-4 sm:px-6 flex items-center overflow-hidden bg-[#18181B]"
    >
      {/* Ambient background glow fields */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#E5A00D]/5 via-emerald-600/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute -bottom-32 left-10 w-96 h-96 bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Grid Container */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Asymmetric Copywriting + Inline Image Typography */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-6 text-left">
          
          {/* Live Status Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-xs shadow-inner"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Open Trade Board • Gaborone & Johannesburg Direct</span>
          </motion.div>

          {/* Signature Headline with Inline Typography Photos */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]"
          >
            Direct trade{" "}
            <span className="inline-flex items-center align-middle mx-1.5 px-2 py-0.5 rounded-2xl bg-white/10 border border-white/20 shadow-lg transform hover:scale-110 transition-transform">
              <span className="w-8 h-8 relative rounded-xl overflow-hidden inline-block bg-neutral-800">
                <Image 
                  src="/unsplash/assets/p014-frontal.jpg" 
                  alt="Virgin Hair Bundle" 
                  fill 
                  sizes="32px"
                  className="object-cover" 
                />
              </span>
            </span>{" "}
            hair extensions & goods.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5A00D] via-amber-200 to-emerald-400">
              One ladder price.
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-300 max-w-2xl font-sans leading-relaxed"
          >
            Buy 1 unit or 100 units from verified suppliers in Botswana and South Africa. 
            No hidden quotes, no secret accounts. Your price drops automatically as your quantity steps up.
          </motion.p>

          {/* Key Value Pill Indicators */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4 text-xs font-mono text-gray-300"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Merchant of Record (AfriDeal)</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>7-Day Buyer Returns</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>5 Verified Suppliers</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 pt-2"
          >
            <Link
              href="#ladder-simulator"
              className="group relative inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#E5A00D] via-amber-500 to-amber-600 text-black font-semibold text-sm shadow-xl shadow-[#E5A00D]/5 hover:shadow-[#E5A00D]/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Explore Interactive Price Ladder</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="#runner-sourcing"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/15 text-white text-sm font-medium transition-all backdrop-blur-md"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Runner Custom Request</span>
            </Link>
          </motion.div>

        </div>

        {/* Right Column: Antigravity 3D Floating Interactive Card Stack */}
        <div className="lg:col-span-5 flex justify-center items-center relative perspective-[1200px]">
          
          <motion.div
            style={{ rotateX, rotateY }}
            className="relative w-full max-w-md aspect-[4/5] rounded-3xl p-6 bg-gradient-to-b from-[#141b16]/90 via-[#0d130f]/80 to-[#18181B]/90 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-emerald-950/80 transition-shadow duration-500 group"
          >
            {/* Top Glass Refraction Shine */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-3xl pointer-events-none" />

            {/* Floating Product Badge Overlay */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#E5A00D]/20 text-amber-300 border border-[#E5A00D]/40 shadow-inner">
                Top Sourced • Hair Weave
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Supplier Verified</span>
              </div>
            </div>

            {/* Product Photography Container with 3D Depth */}
            <div className="relative w-full h-52 rounded-2xl overflow-hidden mb-5 border border-white/5 bg-neutral-900 shadow-inner">
              <Image
                src="/unsplash/assets/p014-frontal.jpg"
                alt="HD Lace Frontal 13x4"
                fill
                sizes="(max-width: 1024px) 100vw, 448px"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-transparent to-transparent opacity-80" />
              
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">HD Lace Frontal 13×4</h3>
                  <p className="text-xs text-gray-300 font-mono">Supplier Cost: BWP 715.00</p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 bg-black/70 text-emerald-300 rounded border border-emerald-500/30">
                  Ready to Dispatch
                </span>
              </div>
            </div>

            {/* Live Tier Ladder Preview Cards Inside 3D Box */}
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/5 hover:border-amber-400/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-gray-300">Retail (1–4 units)</span>
                </div>
                <span className="font-bold text-white">BWP 1,144.00</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#E5A00D]/20 to-amber-950/40 border border-[#E5A00D]/50 text-amber-300 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E5A00D] animate-ping" />
                  <span className="font-bold text-amber-200">Bulk (5–99 units)</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#E5A00D] text-sm">BWP 1,030.00</span>
                  <span className="block text-[10px] text-emerald-400 font-sans">Save BWP 114/unit</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-gray-300">Wholesale (100+ units)</span>
                </div>
                <span className="font-bold text-emerald-400">By Quotation</span>
              </div>
            </div>

            {/* Bottom floating tag */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>Merchant of Record: AfriDeal</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                Auto-Tier Savings
              </span>
            </div>

          </motion.div>
        </div>

      </div>
    </section>
  );
}
