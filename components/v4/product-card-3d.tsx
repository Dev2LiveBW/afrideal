"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag, 
  Check, 
  Sparkles, 
  Info,
  TrendingDown
} from "lucide-react";

export interface CatalogueProduct {
  id: string;
  name: string;
  category: string;
  image: string;
  supplierCost: number;
  retailPrice: number;
  bulkPrice: number;
  stockStatus: string;
  supplierCity: string;
  supplierCountry: string;
  leadTimeDays: number;
}

interface ProductCard3DProps {
  product: CatalogueProduct;
}

export function ProductCard3D({ product }: ProductCard3DProps) {
  const [showLadder, setShowLadder] = useState(false);
  const [added, setAdded] = useState(false);

  const handleQuickAdd = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative rounded-3xl bg-gradient-to-b from-[#141b16]/90 via-[#0e1410]/80 to-[#18181B]/90 backdrop-blur-xl border border-white/5 hover:border-amber-400/40 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/40 transition-all duration-500 flex flex-col justify-between overflow-hidden"
    >
      {/* Top Refraction Highlight */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      {/* Product Image Section */}
      <div>
        <div className="relative w-full aspect-[4/3] bg-neutral-900 overflow-hidden border-b border-white/5">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-transparent to-transparent opacity-60" />

          {/* Category Pill Tag */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/70 text-amber-300 border border-amber-400/30 backdrop-blur-md">
            {product.category}
          </div>

          {/* Supplier City Tag */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{product.supplierCity}, {product.supplierCountry}</span>
          </div>
        </div>

        {/* Product Details Header */}
        <div className="p-5 space-y-3">
          <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Retail & Bulk Prices Display */}
          <div className="flex items-baseline justify-between font-mono pt-1">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">1–4 Retail</span>
              <span className="text-lg font-bold text-white">BWP {product.retailPrice.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-400 block uppercase font-bold">5+ Bulk</span>
              <span className="text-lg font-extrabold text-[#E5A00D]">BWP {product.bulkPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Tier Ladder Toggle */}
          <button
            onClick={() => setShowLadder(!showLadder)}
            className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/5 text-xs font-mono text-gray-300 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5 text-amber-400">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Inspect Tier Prices</span>
            </span>
            {showLadder ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Expandable Tier Breakdown */}
          <AnimatePresence>
            {showLadder && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2 pt-2 text-xs font-mono border-t border-white/5"
              >
                <div className="flex justify-between items-center p-2 rounded-lg bg-white/[0.04] text-gray-300">
                  <span>1–4 units (Retail +60%)</span>
                  <span className="font-bold text-white">BWP {product.retailPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[#E5A00D]/10 text-amber-300 border border-[#E5A00D]/30">
                  <span>5–99 units (Bulk +44%)</span>
                  <span className="font-bold">BWP {product.bulkPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  <span>100+ units (Wholesale)</span>
                  <span className="font-bold">By Quotation</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-5 pt-0">
        <button
          onClick={handleQuickAdd}
          className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            added
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
              : "bg-gradient-to-r from-[#E5A00D] to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-[#E5A00D]/5"
          }`}
        >
          {added ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Added to Order</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Order Now • BWP {product.retailPrice.toFixed(2)}</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
