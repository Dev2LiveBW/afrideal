"use client";

import React from "react";
import Link from "next/link";
import { AfriDealLogo } from "@/components/brand/AfriDealLogo";
import { ShieldCheck, Lock, Sparkles, MapPin, ExternalLink } from "lucide-react";

export function V4Footer() {
  return (
    <footer className="bg-[#050806] text-gray-400 font-sans border-t border-white/5 pt-16 pb-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        
        {/* Top Brand Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand Identity */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <AfriDealLogo variant="dark" size="md" />
            </div>

            <p className="text-xs text-gray-400 max-w-md leading-relaxed">
              Africa&apos;s Procurement Marketplace. Connecting verified hair extension, beauty, electronics, and general merchandise suppliers in Botswana and South Africa with buyers across Southern Africa.
            </p>

            <div className="flex items-center gap-4 text-xs font-mono text-emerald-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Gaborone • Johannesburg
              </span>
              <span>•</span>
              <span>Currency: BWP (Pula)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <h4 className="font-mono font-bold text-white uppercase tracking-wider mb-3">Marketplace</h4>
              <ul className="space-y-2 font-sans">
                <li><Link href="#ladder-simulator" className="hover:text-amber-300 transition-colors">Price Ladder</Link></li>
                <li><Link href="#runner-sourcing" className="hover:text-amber-300 transition-colors">Runner Sourcing</Link></li>
                <li><Link href="#verified-suppliers" className="hover:text-amber-300 transition-colors">Verified Suppliers</Link></li>
                <li><Link href="/browse" className="hover:text-amber-300 transition-colors">Full Catalogue</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-bold text-white uppercase tracking-wider mb-3">Portals</h4>
              <ul className="space-y-2 font-sans">
                <li><Link href="/supplier" className="hover:text-amber-300 transition-colors">Supplier Portal</Link></li>
                <li><Link href="/runner" className="hover:text-amber-300 transition-colors">Runner Console</Link></li>
                <li><Link href="/admin" className="hover:text-amber-300 transition-colors">Operations Admin</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-bold text-white uppercase tracking-wider mb-3">Guarantees</h4>
              <ul className="space-y-2 font-sans">
                <li><span className="text-gray-300">7-Day Buyer Returns</span></li>
                <li><span className="text-gray-300">Merchant of Record</span></li>
                <li><span className="text-gray-300">Published Ladder Rates</span></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Mandatory Legal Disclosure Bar */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/5 text-xs font-mono text-gray-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300">
            <Lock className="w-4 h-4 shrink-0 text-[#E5A00D]" />
            <span>Legal Notice & Financial Regulatory Position:</span>
          </div>
          <p className="text-gray-400 text-[11px] leading-normal flex-1">
            AfriDeal is not a payment provider. Payments are processed by licensed partners and the platform holds no funds on anyone&apos;s behalf.
          </p>
        </div>

        {/* Bottom Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-gray-500 pt-4 border-t border-white/5">
          <p>Â© 2026 AfriDeal. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/legacy/v3" className="hover:text-gray-300">Classic Version</Link>
            <span>•</span>
            <span className="text-emerald-400">Spatial Direction Active</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
