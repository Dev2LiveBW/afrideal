"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Building2,
  Truck,
  ArrowUpRight
} from "lucide-react";

interface SupplierData {
  id: string;
  name: string;
  location: string;
  country: string;
  reliabilityScore: number;
  ordersFulfilled: number;
  avgLeadTime: string;
  specialization: string;
  verificationBadge: string;
}

const SUPPLIERS: SupplierData[] = [
  {
    id: "sup-001",
    name: "Kalahari Luxury Extensions Ltd",
    location: "Gaborone",
    country: "Botswana",
    reliabilityScore: 99.2,
    ordersFulfilled: 412,
    avgLeadTime: "24-48 Hours",
    specialization: "Virgin Hair & HD Frontals",
    verificationBadge: "Tier-1 Verified Merchant"
  },
  {
    id: "sup-002",
    name: "Jo'burg Beauty Trade Hub",
    location: "Johannesburg",
    country: "South Africa",
    reliabilityScore: 97.8,
    ordersFulfilled: 680,
    avgLeadTime: "3-4 Business Days",
    specialization: "Salon Supplies & Equipment",
    verificationBadge: "Cross-Border Verified"
  },
  {
    id: "sup-003",
    name: "Gaborone Tech & Electronics Distro",
    location: "Gaborone",
    country: "Botswana",
    reliabilityScore: 98.5,
    ordersFulfilled: 295,
    avgLeadTime: "24 Hours Local",
    specialization: "Solar & Smart POS",
    verificationBadge: "Tier-1 Verified Merchant"
  },
  {
    id: "sup-004",
    name: "Highland Hair Imports",
    location: "Francistown",
    country: "Botswana",
    reliabilityScore: 96.4,
    ordersFulfilled: 180,
    avgLeadTime: "48 Hours",
    specialization: "Braiding Yaki & Weaves",
    verificationBadge: "Regional Verified"
  }
];

export function SupplierRadar() {
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData>(SUPPLIERS[0]);

  return (
    <section className="py-20 px-4 sm:px-6 bg-[#18181B] relative overflow-hidden">
      {/* Ambient background blur */}
      <div className="absolute top-1/2 left-10 w-[500px] h-[500px] bg-emerald-600/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-xs shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fulfillment & Reliability Infrastructure</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Verified Supplier Routing
          </h2>

          <p className="text-gray-300 text-base font-sans">
            Orders route automatically to the supplier most likely to deliver on time, not to whichever is cheapest. 
            All suppliers are vetted before listing on AfriDeal.
          </p>
        </div>

        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SUPPLIERS.map((sup) => {
            const isSelected = selectedSupplier.id === sup.id;

            return (
              <motion.div
                key={sup.id}
                onClick={() => setSelectedSupplier(sup)}
                whileHover={{ y: -4 }}
                className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden backdrop-blur-xl ${
                  isSelected
                    ? "bg-gradient-to-b from-[#141c16] to-[#0c120e] border-[#E5A00D] shadow-xl shadow-emerald-950/50"
                    : "bg-[#0c100d]/70 border-white/5 hover:border-white/20"
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>{sup.location}, {sup.country}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    {sup.reliabilityScore}% Match
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <h3 className="text-base font-bold text-white tracking-tight line-clamp-1">{sup.name}</h3>
                  <p className="text-xs font-mono text-amber-400/80">{sup.specialization}</p>
                </div>

                {/* Score & Metrics */}
                <div className="space-y-2 pt-3 border-t border-white/5 font-mono text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Fulfillment Rate:</span>
                    <span className="text-emerald-400 font-bold">{sup.reliabilityScore}%</span>
                  </div>

                  <div className="flex justify-between text-gray-400">
                    <span>Avg Lead Time:</span>
                    <span className="text-white font-bold">{sup.avgLeadTime}</span>
                  </div>

                  <div className="flex justify-between text-gray-400">
                    <span>Completed Orders:</span>
                    <span className="text-amber-300 font-bold">{sup.ordersFulfilled}+</span>
                  </div>
                </div>

                {/* Verification Footer */}
                <div className="mt-4 pt-3 flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {sup.verificationBadge}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
