"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sliders, 
  TrendingDown, 
  Check, 
  Sparkles, 
  ShoppingBag, 
  Info, 
  ShieldCheck,
  ArrowRight,
  Layers
} from "lucide-react";

interface ProductTierData {
  id: string;
  name: string;
  category: string;
  image: string;
  supplierCost: number;
  retailPrice: number; // 1-4 units (+60%)
  bulkPrice: number;   // 5-99 units (+44%)
  stockStatus: string;
}

const SAMPLE_PRODUCTS: ProductTierData[] = [
  {
    id: "p014",
    name: "HD Lace Frontal 13×4 (Virgin Hair)",
    category: "Hair Weaves & Extensions",
    image: "/unsplash/assets/p014-frontal.jpg",
    supplierCost: 715,
    retailPrice: 1144,
    bulkPrice: 1030,
    stockStatus: "In Stock"
  },
  {
    id: "p001",
    name: "Brazilian Virgin Hair 3-Bundle Pack",
    category: "Hair Weaves & Extensions",
    image: "/unsplash/assets/p001-bundles.jpg",
    supplierCost: 1250,
    retailPrice: 2000,
    bulkPrice: 1800,
    stockStatus: "In Stock"
  },
  {
    id: "p002",
    name: "Raw Cambodian Straight Weave 28\"",
    category: "Hair Weaves & Extensions",
    image: "/unsplash/assets/p002-cambodian.jpg",
    supplierCost: 950,
    retailPrice: 1520,
    bulkPrice: 1368,
    stockStatus: "In Stock"
  },
  {
    id: "p008",
    name: "Commercial Hair Salon Dryer Chair",
    category: "Beauty & Personal Care",
    image: "/unsplash/assets/p008-salon-chair.jpg",
    supplierCost: 3200,
    retailPrice: 5120,
    bulkPrice: 4608,
    stockStatus: "Low Stock"
  },
  {
    id: "p011",
    name: "Solar Hybrid Inverter 5.5kVA",
    category: "Electronics",
    image: "/unsplash/assets/p011-solar-inverter.jpg",
    supplierCost: 4800,
    retailPrice: 7680,
    bulkPrice: 6912,
    stockStatus: "In Stock"
  }
];

export function TierLadderVisualizer() {
  const [selectedProduct, setSelectedProduct] = useState<ProductTierData>(SAMPLE_PRODUCTS[0]);
  const [quantity, setQuantity] = useState<number>(12);
  const [addedToast, setAddedToast] = useState(false);

  // Calculate tier based on quantity
  let currentTier: "Retail" | "Bulk" | "Wholesale" = "Retail";
  let unitPrice = selectedProduct.retailPrice;

  if (quantity >= 100) {
    currentTier = "Wholesale";
    unitPrice = selectedProduct.bulkPrice * 0.95; // Estimated quotation rung
  } else if (quantity >= 5) {
    currentTier = "Bulk";
    unitPrice = selectedProduct.bulkPrice;
  } else {
    currentTier = "Retail";
    unitPrice = selectedProduct.retailPrice;
  }

  const totalPrice = unitPrice * quantity;
  const retailBaselineTotal = selectedProduct.retailPrice * quantity;
  const totalSavings = retailBaselineTotal - totalPrice;

  const handleAddToCart = () => {
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  return (
    <section id="ladder-simulator" className="py-20 px-4 sm:px-6 bg-[#18181B] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-r from-[#E5A00D]/5 via-emerald-600/10 to-transparent blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5A00D]/10 border border-[#E5A00D]/30 text-[#E5A00D] font-mono text-xs shadow-inner">
            <Sliders className="w-3.5 h-3.5" />
            <span>Signature Pricing Mechanism</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            The Interactive Tier Price Ladder
          </h2>

          <p className="text-gray-300 text-base font-sans">
            Select a product and drag the quantity slider to simulate live wholesale savings. 
            No account required to see lower rates — one published ladder for all buyers.
          </p>
        </div>

        {/* Main Grid: Product Picker + Spatial Interactive Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Product Selector List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider px-1">
              Select Catalogue Item
            </h3>
            
            {SAMPLE_PRODUCTS.map((prod) => {
              const isSelected = selectedProduct.id === prod.id;
              return (
                <button
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 group ${
                    isSelected
                      ? "bg-[#141b16] border-[#E5A00D]/60 shadow-lg shadow-[#E5A00D]/5"
                      : "bg-[#0d120e]/60 border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/5 shrink-0">
                    <Image
                      src={prod.image}
                      alt={prod.name}
                      fill
                      sizes="48px"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-amber-400/80 truncate">{prod.category}</p>
                    <h4 className="text-sm font-bold text-white truncate">{prod.name}</h4>
                    <p className="text-xs font-mono text-gray-400">
                      Cost: BWP {prod.supplierCost.toFixed(2)}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#E5A00D] text-black flex items-center justify-center shrink-0 shadow-md">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Interactive Ladder Visualizer Panel */}
          <div className="lg:col-span-8 bg-gradient-to-b from-[#121814] to-[#0b0f0c] p-6 sm:p-8 rounded-3xl border border-white/15 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            
            {/* Top Shine */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E5A00D]/50 to-transparent" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              {/* Product Visual */}
              <div className="md:col-span-5 flex flex-col items-center text-center">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-neutral-900 mb-4 group">
                  <Image
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 320px"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-black/80 text-emerald-400 border border-emerald-500/30">
                    In Stock
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight">{selectedProduct.name}</h3>
                <p className="text-xs font-mono text-gray-400 mt-1">
                  Supplier Base Cost: <span className="text-gray-200">BWP {selectedProduct.supplierCost.toFixed(2)}</span>
                </p>
              </div>

              {/* Ladder Controller & Price Calculator */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Quantity Slider */}
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.04] border border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Order Quantity
                    </label>
                    <span className="font-mono text-xl font-black text-amber-400 bg-amber-950/60 px-3 py-0.5 rounded-lg border border-amber-500/30">
                      {quantity} {quantity === 1 ? "unit" : "units"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={120}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full h-2.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#E5A00D]"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-gray-400 pt-1">
                    <span>1 unit (Retail)</span>
                    <span>5 units (Bulk Start)</span>
                    <span>100+ units (Wholesale)</span>
                  </div>
                </div>

                {/* 3 Tier Rungs Display */}
                <div className="grid grid-cols-3 gap-2.5 font-mono text-xs">
                  
                  {/* Retail Rung */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    currentTier === "Retail"
                      ? "bg-[#E5A00D]/15 border-[#E5A00D] shadow-md shadow-[#E5A00D]/5 text-white"
                      : "bg-white/[0.04] border-white/5 text-gray-400"
                  }`}>
                    <span className="block text-[10px] uppercase font-bold text-gray-400">1–4 Units</span>
                    <span className="block text-xs text-amber-300 font-semibold">Retail</span>
                    <span className="block text-sm font-bold mt-1 text-white">BWP {selectedProduct.retailPrice.toFixed(2)}</span>
                  </div>

                  {/* Bulk Rung */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    currentTier === "Bulk"
                      ? "bg-gradient-to-br from-[#E5A00D]/25 to-amber-950/60 border-[#E5A00D] shadow-lg shadow-[#E5A00D]/30 text-white"
                      : "bg-white/[0.04] border-white/5 text-gray-400"
                  }`}>
                    <span className="block text-[10px] uppercase font-bold text-amber-400">5–99 Units</span>
                    <span className="block text-xs text-amber-200 font-semibold">Bulk (-10%)</span>
                    <span className="block text-sm font-bold mt-1 text-amber-300">BWP {selectedProduct.bulkPrice.toFixed(2)}</span>
                  </div>

                  {/* Wholesale Rung */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    currentTier === "Wholesale"
                      ? "bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-950 text-white"
                      : "bg-white/[0.04] border-white/5 text-gray-400"
                  }`}>
                    <span className="block text-[10px] uppercase font-bold text-emerald-400">100+ Units</span>
                    <span className="block text-xs text-emerald-300 font-semibold">RFQ Quote</span>
                    <span className="block text-sm font-bold mt-1 text-emerald-400">By Quotation</span>
                  </div>

                </div>

                {/* Calculation Output Box */}
                <div className="p-4 rounded-2xl bg-[#18181B]/90 border border-white/15 space-y-2 font-mono">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Applied Unit Price:</span>
                    <span className="text-white font-bold">BWP {unitPrice.toFixed(2)} / unit</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Total Order Payable:</span>
                    <span className="text-xl font-extrabold text-amber-400">
                      BWP {totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-400 pt-1 border-t border-white/5">
                      <span className="flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Total Bulk Savings:
                      </span>
                      <span className="font-bold">
                        BWP {totalSavings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Add to Order Action */}
                <div className="pt-2">
                  <button
                    onClick={handleAddToCart}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#E5A00D] via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm shadow-xl shadow-[#E5A00D]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                    <span>Add {quantity} Units to Order • BWP {totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </button>

                  <AnimatePresence>
                    {addedToast && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono text-center flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Added {quantity} x {selectedProduct.name} to Cart at BWP {unitPrice.toFixed(2)}/unit!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
