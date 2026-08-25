"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AfriDealLogo } from "@/components/brand/AfriDealLogo";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  ShoppingBag, 
  Search, 
  Zap, 
  ShieldCheck, 
  Compass, 
  Truck, 
  ArrowRight,
  ChevronRight,
  Sliders,
  PackageCheck
} from "lucide-react";

export function V4Header() {
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(3);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activePortal, setActivePortal] = useState<"storefront" | "runner" | "supplier" | "admin">("storefront");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 transition-all duration-300">
      <div 
        className={`max-w-7xl mx-auto rounded-2xl transition-all duration-500 backdrop-blur-xl border ${
          scrolled 
            ? "bg-[#0f1511]/85 border-emerald-500/20 shadow-2xl shadow-emerald-950/40 py-2.5 px-4 sm:px-6" 
            : "bg-[#0d120e]/60 border-white/5 py-3.5 px-4 sm:px-6"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <AfriDealLogo variant="dark" size="md" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Botswana & SA Live Trade
                </span>
              </div>
            </div>
          </Link>

          {/* Center Nav: Portal Switcher Pill */}
          <div className="hidden lg:flex items-center bg-[#070a08]/80 p-1 rounded-xl border border-white/5 shadow-inner">
            <button
              onClick={() => setActivePortal("storefront")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePortal === "storefront"
                  ? "bg-gradient-to-r from-[#E5A00D] to-amber-600 text-black font-semibold shadow-md shadow-[#E5A00D]/5"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Storefront
            </button>
            <button
              onClick={() => setActivePortal("runner")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePortal === "runner"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-semibold shadow-md shadow-emerald-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Runner Sourcing
            </button>
            <button
              onClick={() => setActivePortal("supplier")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePortal === "supplier"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Suppliers
            </button>
          </div>

          {/* Right Actions: Currency Ticker, Search, Cart */}
          <div className="flex items-center gap-3">
            {/* Currency badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>BWP (Pula)</span>
            </div>

            {/* Quick Runner Action */}
            <Link
              href="#runner-sourcing"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/5 text-xs text-gray-200 hover:text-white transition-all"
            >
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>Request Runner</span>
            </Link>

            {/* Cart Button with Spatial Glow */}
            <button className="relative group p-2.5 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 hover:border-amber-400/50 transition-all shadow-lg hover:shadow-amber-500/10">
              <ShoppingBag className="w-4 h-4 text-gray-200 group-hover:text-amber-400 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-[#E5A00D] to-amber-500 text-black font-mono font-bold text-[10px] flex items-center justify-center shadow-md shadow-[#E5A00D]/40">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
