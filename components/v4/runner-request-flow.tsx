"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Compass, 
  Search, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Truck, 
  PackageCheck,
  Send,
  UserCheck,
  MapPin,
  ShieldCheck,
  ArrowRight
} from "lucide-react";

const STAGES = [
  { id: "REQUESTED", name: "1. Requested", icon: Clock, desc: "Buyer submits request specs" },
  { id: "ASSIGNED", name: "2. Assigned", icon: UserCheck, desc: "Verified runner assigned" },
  { id: "LOCATED", name: "3. Located", icon: Search, description: "Wait for someone to pick up your order" },
  { id: "ACTIVE", name: "4. Runner Active", icon: DollarSign, description: "Your runner is picking up &quot;and&quot; delivering" },
  { id: "CONFIRMED", name: "5. Confirmed", icon: ShieldCheck, desc: "Buyer approves & locks payment" },
  { id: "DISPATCHED", name: "6. Dispatched", icon: Truck, desc: "In last-mile delivery" },
  { id: "DELIVERED", name: "7. Delivered", icon: PackageCheck, desc: "Fulfilled & settled" }
];

export function RunnerRequestFlow() {
  const [currentStep, setCurrentStep] = useState<number>(3); // Default to QUOTED state
  const [itemName, setItemName] = useState("Custom Braiding Hair Bulk - Color #27 (30 Bundles)");
  const [buyerCity, setBuyerCity] = useState("Gaborone");
  const [runnerQuote, setRunnerQuote] = useState("1450.00");
  const [submitted, setSubmitted] = useState(false);

  const activeStage = STAGES[currentStep];

  const handleNextStage = () => {
    if (currentStep < STAGES.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStage = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <section id="runner-sourcing" className="py-20 px-4 sm:px-6 bg-[#070a08] relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-xs shadow-inner">
            <Compass className="w-3.5 h-3.5" />
            <span>Unlisted Goods Sourcing</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Runner Sourcing Engine
          </h2>

          <p className="text-gray-300 text-base font-sans">
            &quot;I know what I want and nobody lists it.&quot; Describe what you need, a verified runner finds it in 
            Gaborone or Johannesburg, inspects it, and sets the price. You pay only after you approve the quote.
          </p>
        </div>

        {/* 7-Stage Visual Tracker Bar */}
        <div className="mb-12 overflow-x-auto pb-4 scrollbar-none">
          <div className="flex items-center justify-between min-w-[700px] px-4">
            {STAGES.map((stg, idx) => {
              const IconComp = stg.icon;
              const isPast = idx <= currentStep;
              const isCurrent = idx === currentStep;

              return (
                <button
                  key={stg.id}
                  onClick={() => setCurrentStep(idx)}
                  className="flex flex-col items-center gap-2 group relative z-10"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono transition-all duration-300 ${
                    isCurrent
                      ? "bg-gradient-to-r from-[#E5A00D] to-amber-500 text-black shadow-lg shadow-[#E5A00D]/30 scale-110"
                      : isPast
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                      : "bg-white/[0.04] text-gray-500 border border-white/5"
                  }`}>
                    <IconComp className="w-4 h-4" />
                  </div>

                  <span className={`text-[11px] font-mono font-medium transition-colors ${
                    isCurrent ? "text-amber-300 font-bold" : isPast ? "text-emerald-400" : "text-gray-500"
                  }`}>
                    {stg.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Interactive Viewport Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-gradient-to-b from-[#121714] to-[#0a0e0b] p-6 sm:p-10 rounded-3xl border border-white/15 shadow-2xl backdrop-blur-xl">
          
          {/* Left Side: Live Request State Box */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-500/30">
                Request #REQ-2026-8942
              </span>
              <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Destination: {buyerCity}
              </span>
            </div>

            <div>
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                Requested Item Description
              </label>
              <h3 className="text-xl font-bold text-white tracking-tight">{itemName}</h3>
            </div>

            {/* Current State Detail Box */}
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/5 space-y-3">
              <div className="flex items-center gap-3 text-amber-300 font-mono text-sm font-bold">
                <activeStage.icon className="w-5 h-5 text-[#E5A00D]" />
                <span>Current Status: {activeStage.name}</span>
              </div>
              <p className="text-xs text-gray-300 font-sans leading-relaxed">
                {activeStage.desc}. Runner status is updated live on the storefront and verified by staff. 
                Prices are entered by the runner directly from the supplier floor.
              </p>

              {currentStep >= 3 && (
                <div className="pt-3 border-t border-white/5 flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-400">Runner Inspected Quote:</span>
                  <span className="text-lg font-black text-amber-400">BWP {runnerQuote}</span>
                </div>
              )}
            </div>

            {/* Step Stepper Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrevStage}
                disabled={currentStep === 0}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/5 text-xs font-mono text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
              >
                &larr; Previous Stage
              </button>

              <div className="text-xs font-mono text-gray-400">
                Stage {currentStep + 1} of 7
              </div>

              <button
                onClick={handleNextStage}
                disabled={currentStep === STAGES.length - 1}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E5A00D] to-amber-500 text-black font-bold text-xs shadow-md shadow-[#E5A00D]/5 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5"
              >
                <span>Advance Demo Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Side: Create New Runner Request Quick Form */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-[#080c09] border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Submit Sourcing Request</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">What item do you need?</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/5 text-white text-xs font-sans focus:border-[#E5A00D] outline-none"
                  placeholder="e.g. 50 packs Braiding Yaki Hair #4"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Target Delivery City</label>
                <select
                  value={buyerCity}
                  onChange={(e) => setBuyerCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d130f] border border-white/5 text-white text-xs font-sans focus:border-[#E5A00D] outline-none"
                >
                  <option value="Gaborone">Gaborone, Botswana</option>
                  <option value="Francistown">Francistown, Botswana</option>
                  <option value="Johannesburg">Johannesburg, South Africa</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setSubmitted(true);
                  setCurrentStep(0);
                  setTimeout(() => setSubmitted(false), 3000);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Verified Runners</span>
              </button>

              <AnimatePresence>
                {submitted && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] font-mono text-emerald-400 text-center"
                  >
                    Request dispatched to Gaborone &amp; Jo&apos;burg runner network!
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
