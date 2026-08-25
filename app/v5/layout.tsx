import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AfriDeal v5 - Editorial Brutalism Marketplace",
  description: "Africa's Procurement Marketplace. Stark, physical, tactile trade mechanics.",
};

export default function V5Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F4F4F5] text-[#111111] selection:bg-[#0044FF] selection:text-white font-sans antialiased relative">
      {/* Subtle paper grain noise overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
