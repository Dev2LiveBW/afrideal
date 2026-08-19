'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileText, Minus, PackageX, Plus, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { VariantSelector } from '@/components/products/VariantSelector';
import { RfqModal } from '@/components/procurement/RfqModal';
import { TieredPriceCalculator } from '@/components/procurement/TieredPriceCalculator';
import { TIER_LABELS, resolvePrice } from '@/lib/pricing-tiers';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import { PriceLadder } from '@/components/storefront/PriceLadder';
import { photoUrl } from '@/components/storefront/Swatch';
import type { TierDoor } from '@/lib/tier-doors';
import type { CustomerPrice, CustomerType, Product, ProductImage } from '@/types';

export function ProductBuyPanel({
  product,
  bands,
  customerType,
  inStock,
  primarySupplierId,
  primaryImage,
  doors,
}: {
  product: Product;
  bands: CustomerPrice[];
  /** Resolved from the session on the server, never chosen in the browser. */
  customerType: CustomerType;
  inStock: boolean;
  primarySupplierId: string;
  /** Carried into the cart line so the basket shows the photo, not the glyph. */
  primaryImage?: ProductImage;
  /** This product's three rungs, resolved server-side against the account. */
  doors?: TierDoor[];
}) {
  const addToCart = useAfriDealStore((state) => state.addToCart);

  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [rfqOpen, setRfqOpen] = useState(false);

  const variant = product.variants.find((entry) => entry.id === variantId) ?? product.variants[0];

  /**
   * Tiers are per product; variants carry their own uplift over the base price.
   * Composing them as a ratio keeps a case-of-12 correctly more expensive than a
   * single tub at every rung of the ladder, without needing a band per variant.
   */
  const resolved = resolvePrice(bands, product, qty, customerType);
  const variantRatio = product.price === 0 ? 1 : (variant?.price ?? product.price) / product.price;
  const unitPrice = Math.ceil(resolved.unit_price * variantRatio);
  const lineTotal = unitPrice * qty;

  function add() {
    if (!variant) return;

    addToCart({
      product_id: product.id,
      variant_id: variant.id,
      name: product.name,
      variant_label: variant.label,
      emoji: product.emoji,
      unit_price: unitPrice,
      qty,
      supplier_id: primarySupplierId,
      image_url: photoUrl(primaryImage),
    });

    toast.success(
      qty === 1 ? `${product.name} added to cart` : `${qty} × ${product.name} added to cart`,
    );
  }

  return (
    <>
      <div className="mt-6 rounded-lg border border-hairline bg-surface-raised p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11.5px] text-muted">
              Price per unit
              {resolved.tier !== 'RETAIL' && (
                <span className="ml-1.5 text-gold-dark">
                  · {TIER_LABELS[resolved.tier]}
                </span>
              )}
            </p>
            <MoneyText amount={unitPrice} size="xl" tone="gold" />
          </div>

          {!inStock && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-inert-wash px-2.5 py-1 text-[11.5px] font-medium text-inert-ink">
              <PackageX size={12} strokeWidth={1.5} />
              Out of stock
            </span>
          )}
        </div>

        {product.variants.length > 1 && (
          <VariantSelector
            variants={product.variants}
            selectedId={variantId}
            onSelect={setVariantId}
            label="Option"
            className="mt-6"
          />
        )}

        {/*
          The ladder, beside the control it drives. On the landing page a rung
          is a way into the catalogue; here it is a quantity, so tapping "Bulk"
          sets this product to that band rather than navigating away from the
          product the buyer is already looking at.
        */}
        {doors && doors.length > 1 && (
          <div className="mt-6">
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-ink">Price by quantity</p>
              <span className="font-mono text-[11px] tabular-nums text-muted">per unit</span>
            </div>

            <PriceLadder
              doors={doors}
              productName={product.name}
              tone="light"
              stagger={false}
              activeTier={resolved.tier}
              onSelect={(door) => {
                const band = door.range ? Number.parseInt(door.range, 10) : NaN;
                if (Number.isFinite(band)) setQty(Math.max(1, band));
              }}
            />
          </div>
        )}

        <div className="mt-6">
          <p className="eyebrow mb-2.5">Quantity</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-full ring-1 ring-inset ring-hairline-strong">
              <button
                type="button"
                onClick={() => setQty((value) => Math.max(1, value - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="flex h-10 w-10 items-center justify-center rounded-l-full text-body transition-colors hover:bg-ink/[0.04] hover:text-ink disabled:opacity-35"
              >
                <Minus size={15} strokeWidth={1.5} />
              </button>
              <input
                type="number"
                min={1}
                max={9999}
                value={qty}
                onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
                aria-label="Quantity"
                className="w-14 bg-transparent text-center font-mono text-[14px] font-medium tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setQty((value) => Math.min(9999, value + 1))}
                aria-label="Increase quantity"
                className="flex h-10 w-10 items-center justify-center rounded-r-full text-body transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                <Plus size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="text-right">
              <p className="text-[11.5px] text-muted">Line total</p>
              <MoneyText amount={lineTotal} size="md" />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <GoldButton
            variant="gold"
            size="lg"
            className="w-full"
            onClick={add}
            disabled={!inStock || !variant || resolved.requires_rfq}
            icon={<ShoppingBag size={16} strokeWidth={1.5} />}
          >
            {resolved.requires_rfq ? 'Quotation required' : 'Add to cart'}
          </GoldButton>

          {resolved.requires_rfq ? (
            <GoldButton
              variant="ghost"
              size="md"
              className="w-full"
              icon={<FileText size={15} strokeWidth={1.5} />}
              onClick={() => setRfqOpen(true)}
            >
              Request a quotation
            </GoldButton>
          ) : (
            <Link href="/cart" className="block">
              <GoldButton variant="ghost" size="md" className="w-full">
                View cart
              </GoldButton>
            </Link>
          )}
        </div>

        <p className="mt-4 text-[11.5px] leading-5 text-muted">
          Delivery is a flat BWP 45.00 per order, not per supplier. An order that splits across two
          suppliers is still charged once.
        </p>
      </div>

      <TieredPriceCalculator
        product={product}
        bands={bands}
        customerType={customerType}
        quantity={qty}
        onQuantityChange={setQty}
        onRequestRfq={(quantity) => {
          setQty(quantity);
          setRfqOpen(true);
        }}
      />

      <RfqModal
        isOpen={rfqOpen}
        onClose={() => setRfqOpen(false)}
        productId={product.id}
        productName={product.name}
        initialQty={Math.max(100, qty)}
        customerType={customerType}
      />
    </>
  );
}
