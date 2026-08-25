"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  Menu,
  ArrowUpRight
} from "lucide-react";

export function V5Header() {
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(3);
  const [activePortal, setActivePortal] = useState<"storefront" | "runner" | "supplier">("storefront");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-[#F4F4F5] transition-all duration-300 ${scrolled ? 'border-b border-[#111111]' : ''}`}>
      <div className="w-full px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-[#111111]">
        
        {/* Left: Brand Identity */}
        <Link href="/v5" className="flex items-baseline gap-2 group">
          <span className="font-display font-black text-2xl tracking-tighter text-[#111111] uppercase">
            AfriDeal
          </span>
          <span className="font-mono text-[10px] uppercase font-bold text-[#111111] px-1 border border-[#111111]">
            v5
          </span>
        </Link>

        {/* Center: Strict Portal Links */}
        <div className="hidden lg:flex items-center gap-8 font-mono text-xs uppercase font-bold tracking-widest text-[#111111]">
          <button 
            onClick={() => setActivePortal("storefront")}
            className={`relative pb-1 group ${activePortal === "storefront" ? "" : "opacity-50 hover:opacity-100"}`}
          >
            Storefront
            {activePortal === "storefront" && (
              <motion.div layoutId="nav-indicator" className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#0044FF]" />
            )}
          </button>
          <button 
            onClick={() => setActivePortal("runner")}
            className={`relative pb-1 group ${activePortal === "runner" ? "" : "opacity-50 hover:opacity-100"}`}
          >
            Runner Sourcing
            {activePortal === "runner" && (
              <motion.div layoutId="nav-indicator" className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#0044FF]" />
            )}
          </button>
          <button 
            onClick={() => setActivePortal("supplier")}
            className={`relative pb-1 group ${activePortal === "supplier" ? "" : "opacity-50 hover:opacity-100"}`}
          >
            Suppliers
            {activePortal === "supplier" && (
              <motion.div layoutId="nav-indicator" className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#0044FF]" />
            )}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs font-bold text-[#111111] uppercase">
            <span className="w-2 h-2 bg-[#0044FF]" />
            BWP / Pula
          </div>
          
          <button className="flex items-center gap-2 font-mono text-xs uppercase font-bold text-[#111111] hover:text-[#0044FF] transition-colors">
            Cart [{cartCount}]
          </button>
        </div>
      </div>
    </header>
  );
}
