"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, CheckSquare, ShieldCheck, Truck, PackageCheck, Zap } from "lucide-react";

const DOSSIER_STAGES = [
  { id: 1, label: "Req. Init", title: "Request Initialization", icon: Search, detail: "Runner accepts the brief and begins market scan." },
  { id: 2, label: "Src. Ident", title: "Source Identification", icon: MapPin, detail: "Primary and secondary suppliers located." },
  { id: 3, label: "Q.A. Eval", title: "Quality Evaluation", icon: CheckSquare, detail: "Physical inspection of goods against requirements." },
  { id: 4, label: "Neg. Lock", title: "Negotiation Lock", icon: ShieldCheck, detail: "Final price secured and escrow conditions met." },
  { id: 5, label: "Log. Route", title: "Logistics Routing", icon: Truck, detail: "Transport booked, border documentation prepared." },
  { id: 6, label: "Disp. Conf", title: "Dispatch Confirmation", icon: PackageCheck, detail: "Goods handed over to carrier, tracking live." },
  { id: 7, label: "Trade Exec", title: "Trade Executed", icon: Zap, detail: "Client receives goods, escrow released." },
];

export function RunnerDossier() {
  const [activeStage, setActiveStage] = useState(3); // Example: Stage 3 active

  return (
    <div className="border border-[#111111] bg-[#F4F4F5] p-8 lg:p-12 shadow-[8px_8px_0px_0px_#111111]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-[#111111] pb-6 mb-12">
        <div>
          <h2 className="font-serif text-4xl sm:text-5xl text-[#111111] leading-none mb-2">
            Runner Dossier
          </h2>
          <p className="font-mono text-sm text-[#71717A] uppercase tracking-widest">
            Sourcing Protocol 7-Stage
          </p>
        </div>
        <div className="mt-4 md:mt-0 font-mono border border-[#111111] px-4 py-2 bg-[#111111] text-[#F4F4F5] text-xs font-bold uppercase">
          Status: In Progress
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Stages List */}
        <div className="md:col-span-5 space-y-3">
          {DOSSIER_STAGES.map((stage, idx) => {
            const isCompleted = stage.id < activeStage;
            const isActive = stage.id === activeStage;
            const isPending = stage.id > activeStage;

            return (
              <div 
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`group cursor-pointer border ${
                  isActive ? "border-[#0044FF] bg-[#0044FF]/5" : "border-[#111111]"
                } p-4 flex items-center justify-between transition-colors ${
                  isPending ? "opacity-50 hover:opacity-100" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 flex items-center justify-center font-mono text-xs font-bold border ${
                    isCompleted ? "bg-[#111111] text-[#F4F4F5] border-[#111111]" :
                    isActive ? "bg-[#0044FF] text-white border-[#0044FF]" :
                    "border-[#111111] text-[#111111]"
                  }`}>
                    {stage.id}
                  </div>
                  <span className={`font-mono text-sm uppercase font-bold ${
                    isActive ? "text-[#0044FF]" : "text-[#111111]"
                  }`}>
                    {stage.label}
                  </span>
                </div>
                {isCompleted && <span className="font-mono text-[10px] uppercase text-[#71717A] border border-[#71717A] px-1">Done</span>}
                {isActive && <span className="font-mono text-[10px] uppercase text-[#0044FF] border border-[#0044FF] px-1 animate-pulse">Live</span>}
              </div>
            );
          })}
        </div>

        {/* Stage Details (The Terminal) */}
        <div className="md:col-span-7">
          <div className="border border-[#111111] h-full min-h-[400px] bg-[#111111] text-[#F4F4F5] p-6 font-mono flex flex-col relative overflow-hidden">
            
            {/* Scanlines / CRT effect overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />

            <div className="border-b border-[#333] pb-4 mb-6 flex justify-between items-center relative z-10">
              <span className="text-xs text-[#71717A] uppercase">Live Feed // Terminal</span>
              <span className="text-xs text-green-500 animate-pulse">Connected</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={activeStage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative z-10 flex-grow"
              >
                {DOSSIER_STAGES.map(s => {
                  if (s.id !== activeStage) return null;
                  const Icon = s.icon;
                  return (
                    <div key={s.id} className="h-full flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                        <Icon size={32} className="text-[#0044FF]" />
                        <h3 className="text-xl font-bold uppercase">{s.title}</h3>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-8 max-w-md leading-relaxed">
                        {s.detail}
                      </p>

                      <div className="mt-auto border-t border-[#333] pt-4">
                        <div className="text-[10px] uppercase text-[#71717A] mb-2">System Log</div>
                        <div className="text-xs text-green-400 space-y-1">
                          <div>&gt; Initializing protocol {s.id}...</div>
                          <div>&gt; Verifying parameters...</div>
                          {s.id <= 3 && <div>&gt; Awaiting runner input...</div>}
                          {s.id > 3 && <div>&gt; Cryptographic lock secured.</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
