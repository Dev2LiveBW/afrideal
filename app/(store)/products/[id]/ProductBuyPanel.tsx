'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { FileText, Minus, PackageX, Plus, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/brand/ActionButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { VariantSelector } from '@/components/products/VariantSelector';
import { RfqModal } from '@/components/procurement/RfqModal';
import { TieredPriceCalculator } from '@/components/procurement/TieredPriceCalculator';
import { TIER_LABELS, hasVariantLadder, priceLine } from '@/lib/pricing-tiers';
import { tierDoors } from '@/lib/tier-doors';
import { useAfriDealStore } from '@/store/useAfriDealStore';
import { PriceLadder } from '@/components/storefront/PriceLadder';
import { photoUrl } from '@/components/storefront/Swatch';
import { CartSheet } from '@/components/storefront/CartSheet';
import { DEFAULT_DELIVERY_COUNTRY, isCrossBorder } from '@/lib/lanes.mjs';
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
  intro,
  aside,
}: {
  product: Product;
  bands: CustomerPrice[];
  /** Resolved from the session on the server, never chosen in the browser. */
  customerType: CustomerType;
  inStock: boolean;
  primarySupplierId: string;
  /** Carried into the cart line so the basket shows the photo, not the glyph. */
  primaryImage?: ProductImage;
  /** This product's five packages, resolved server-side against the account. */
  doors?: TierDoor[];
  /** Badges, title and summary, set above the buy box in the right column. */
  intro: ReactNode;
  /** Cards that follow the volume calculator under the gallery. */
  aside: ReactNode;
}) {
  const addToCart = useAfriDealStore((state) => state.addToCart);

  const isSupplierOwned =
    product.owner_type === 'SUPPLIER' || product.commercial_model === 'SUPPLIER_LED';
  const minQty = isSupplierOwned ? Math.max(1, product.moq ?? 1) : 1;

  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [qty, setQty] = useState(minQty);
  const [rfqOpen, setRfqOpen] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const variant = product.variants.find((entry) => entry.id === variantId) ?? product.variants[0];

  /**
   * `priceLine()` is what the cart, checkout and the orders route charge with.
   * A wig sold by length has a ladder per length, so its packages follow the
   * length chosen; anything else keeps the ladder resolved on the server.
   */
  const priced = priceLine(bands, product, variant?.id ?? null, qty, customerType);
  const resolved = priced.resolved;
  const unitPrice = priced.unit_price;
  const lineTotal = priced.line_total;
  const shownDoors =
    variant && hasVariantLadder(bands, product.id, variant.id)
      ? tierDoors(bands, product, customerType, variant.id)
      : doors;

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

  /*
    Two cells of the page's grid, not one column. On wide screens the buy box
    runs down the right beside the gallery, and the calculator and the cards
    after it fill the space under the gallery: a reverse L, so the photos do
    not end above a screen of white. The calculator shares the quantity, which
    is why the panel owns both cells. On phones they simply stack.
  */
  return (
    <>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {intro}
        <div className="mt-6 rounded-lg border border-hairline bg-surface-raised p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[11.5px] text-muted">
                  {isSupplierOwned ? 'Supplier unit price' : 'Price per unit'}
                  {!isSupplierOwned && resolved.tier !== 'RETAIL' && (
                    <span className="ml-1.5 text-forest">
                      · {TIER_LABELS[resolved.tier]}
                    </span>
                  )}
                </p>
                {isCrossBorder(product.country_of_origin, DEFAULT_DELIVERY_COUNTRY) && (
                  <span className="rounded bg-forest-wash px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-forest-ink">
                    Customs cleared by courier
                  </span>
                )}
              </div>
              <MoneyText amount={unitPrice} size="xl" tone="ink" />
            </div>
  
            {!inStock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-inert-wash px-2.5 py-1 text-[11.5px] font-medium text-inert-ink">
                <PackageX size={12} strokeWidth={1.5} />
                Out of stock
              </span>
            )}
          </div>
  
          {isSupplierOwned && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-ocean/25 bg-ocean-wash px-3.5 py-2.5 text-[12px] text-ocean-ink">
              <span>
                Listed by{' '}
                <strong className="font-semibold">{product.supplier_name ?? 'Verified Supplier'}</strong>
                {minQty > 1 ? (
                  <>
                    {' '}· Minimum order <span className="font-mono font-semibold">{minQty}</span> units
                  </>
                ) : (
                  ' · No minimum order'
                )}
              </span>
              {product.supplier_id && (
                <Link
                  href={`/suppliers/${product.supplier_id}`}
                  className="font-semibold text-ocean underline underline-offset-4 hover:text-ocean-ink"
                >
                  View supplier products →
                </Link>
              )}
            </div>
          )}
  
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
          {!isSupplierOwned && shownDoors && shownDoors.length > 1 && (
            <div className="mt-6">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-semibold text-ink">Price by quantity</p>
                <span className="font-mono text-[11px] tabular-nums text-muted">per unit</span>
              </div>
  
              <PriceLadder
                doors={shownDoors}
                productName={product.name}
                tone="light"
                stagger={false}
                activeTier={resolved.tier}
                onSelect={(door) => {
                  const band = door.range ? Number.parseInt(door.range, 10) : NaN;
                  if (Number.isFinite(band)) setQty(Math.max(1, band));
                }}
              />
  
              <p className="mt-2.5 text-[11.5px] leading-5 text-muted">
                Retail multi-buy: 2% off each for 2, 3% for 3, 5% for 4. Mix{' '}
                {product.category_id === 'c1' ? 'lengths and styles' : 'products'} from the same
                category and they count together.
              </p>
            </div>
          )}
  
          <div className="mt-6">
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <p className="eyebrow">Quantity</p>
              {minQty > 1 && (
                <span className="font-mono text-[11px] text-muted">
                  Min. order: {minQty} units
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-full ring-1 ring-inset ring-hairline-strong">
                <button
                  type="button"
                  onClick={() => setQty((value) => Math.max(minQty, value - 1))}
                  disabled={qty <= minQty}
                  aria-label="Decrease quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-l-full text-body transition-colors hover:bg-ink/[0.04] hover:text-ink disabled:opacity-35"
                >
                  <Minus size={15} strokeWidth={1.5} />
                </button>
                <input
                  type="number"
                  min={minQty}
                  max={9999}
                  value={qty}
                  onChange={(event) => setQty(Math.max(minQty, Number(event.target.value) || minQty))}
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
  
          <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 z-[60] flex flex-row-reverse gap-2 border-t border-hairline bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:bottom-0 lg:static lg:mt-6 lg:flex lg:flex-col lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <ActionButton
              size="lg"
              className="flex-1 lg:w-full"
              onClick={add}
              disabled={!inStock || !variant || resolved.requires_rfq}
              icon={<ShoppingBag size={16} strokeWidth={1.5} />}
            >
              {resolved.requires_rfq ? 'Quotation required' : 'Add to cart'}
            </ActionButton>
  
            {resolved.requires_rfq ? (
              <ActionButton
                variant="ghost"
                size="lg"
                className="flex-1 lg:w-full"
                icon={<FileText size={15} strokeWidth={1.5} />}
                onClick={() => setRfqOpen(true)}
              >
                Request a quotation
              </ActionButton>
            ) : (
              <ActionButton
                variant="ghost"
                size="lg"
                className="flex-1 lg:w-full"
                onClick={() => setCartSheetOpen(true)}
              >
                View cart
              </ActionButton>
            )}
          </div>
  
          <p className="mt-4 text-[11.5px] leading-5 text-muted">
            Delivery is a flat BWP 45.00 per order, not per supplier. An order that splits across two
            suppliers is still charged once.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
        {!isSupplierOwned && (
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
        )}
        {aside}
      </div>

      <RfqModal
        isOpen={rfqOpen}
        onClose={() => setRfqOpen(false)}
        productId={product.id}
        productName={product.name}
        initialQty={Math.max(100, qty)}
        customerType={customerType}
      />

      <CartSheet
        isOpen={cartSheetOpen}
        onClose={() => setCartSheetOpen(false)}
      />
    </>
  );
}
