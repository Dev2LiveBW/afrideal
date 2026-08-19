import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Info, Layers, ShieldCheck, Star } from 'lucide-react';

import { MoneyText } from '@/components/brand/MoneyText';
import { Enclosure, PageHeader, Panel, PanelBody, PanelHeader } from '@/components/brand/Panel';
import { PricingFormula } from '@/components/brand/PricingFormula';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { SupplierOfferTable } from '@/components/products/SupplierOfferTable';
import { Swatch } from '@/components/storefront/Swatch';
import { ConsoleTopbar } from '@/components/layout/ConsoleTopbar';
import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { shortDate } from '@/lib/format';
import { calculatePrice, getPricingRule } from '@/lib/pricing-engine';
import { getNotifications, getProductDetail } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function AdminProductDetailPage({ params }: { params: { id: string } }) {
  const [session, detail, pricingRules, allImages] = await Promise.all([
    auth(),
    getProductDetail(params.id),
    readAll('pricing-rules'),
    readAll('product-images'),
  ]);

  if (!detail) notFound();

  const { product, categoryName, selection, allSelection } = detail;
  const notifications = session?.user ? await getNotifications(session.user.id) : [];

  const primaryImage = allImages.find(
    (image) => image.product_id === product.id && image.sort_order === 0,
  );

  const rule = getPricingRule(pricingRules, product.category_id);
  const pricingOffer = selection.primary ?? allSelection.primary;
  const priceResult = pricingOffer ? calculatePrice(pricingOffer.offer.supplier_cost, rule) : null;

  return (
    <>
      <ConsoleTopbar
        title={product.name}
        breadcrumb={[
          { label: 'Admin console' },
          { label: 'Products', href: '/admin/products' },
          { label: product.name },
        ]}
        notifications={notifications}
      />

      <div className="mx-auto max-w-console space-y-5 px-6 py-6">
        <PageHeader
          eyebrow={categoryName}
          title={product.name}
          description={product.short_description}
          action={<StatusBadge status={product.status} />}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Left: product info, specs, variants ─────────────────────── */}
          <div className="space-y-5 lg:col-span-1">
            <Panel className="overflow-hidden">
              <Swatch
                image={primaryImage}
                fallback={product.swatch}
                emoji={product.emoji}
                label={product.name}
                className="aspect-[16/9] w-full"
                glyphClassName="text-[64px]"
                zoomOnHover={false}
              />
              <PanelBody className="space-y-4">
                <p className="text-[13px] leading-6 text-body">{product.description}</p>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hairline pt-4 text-[12.5px]">
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <Star size={12} strokeWidth={1.5} />
                      Rating
                    </dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-ink">
                      {product.rating.toFixed(1)} ({product.review_count})
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <Layers size={12} strokeWidth={1.5} />
                      Variants
                    </dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-ink">{product.variants.length}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <ShieldCheck size={12} strokeWidth={1.5} />
                      Verified suppliers
                    </dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-ink">{selection.all.length}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <Calendar size={12} strokeWidth={1.5} />
                      Listed
                    </dt>
                    <dd className="mt-0.5 text-ink">{shortDate(product.created_at)}</dd>
                  </div>
                </dl>

                {product.featured && (
                  <p className="rounded bg-gold/[0.08] px-3 py-2 text-[12px] font-medium text-gold-700">
                    Featured on the storefront
                  </p>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Specifications" />
              <PanelBody>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[12.5px] sm:grid-cols-2">
                  {product.specs.map((spec) => (
                    <div key={spec.label}>
                      <dt className="text-muted">{spec.label}</dt>
                      <dd className="mt-0.5 font-medium text-ink">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </PanelBody>
            </Panel>

            <Panel className="overflow-hidden">
              <PanelHeader title="Variants" description={`${product.variants.length} sellable options`} />
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>SKU</th>
                      <th className="text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant) => (
                      <tr key={variant.id}>
                        <td className="font-medium text-ink">{variant.label}</td>
                        <td className="font-mono text-[11.5px] text-muted">{variant.sku}</td>
                        <td className="text-right">
                          <MoneyText amount={variant.price} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* ── Right: routing and pricing ───────────────────────────────── */}
          <div className="space-y-5 lg:col-span-2">
            <Panel className="overflow-hidden">
              <PanelHeader
                title="Supplier routing"
                description="How the selection engine would route the next order for this product"
              />
              <SupplierOfferTable offers={allSelection.all} productName={product.name} />

              <div className="flex items-start gap-2.5 border-t border-hairline bg-surface px-5 py-3.5">
                <Info size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                <p className="text-[12.5px] leading-5 text-body">
                  This ranking is a live preview, recomputed from current stock and reliability — it is not tied
                  to a real order. Routing can only be overridden on an order that already exists, from that
                  order&apos;s detail page, because there has to be a live supplier order for a reassignment to
                  apply to.
                </p>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Pricing breakdown"
                description={
                  pricingOffer
                    ? `Computed from ${pricingOffer.supplier.name}'s offer — the ${
                        selection.primary ? 'current top verified supplier' : 'best available offer'
                      }`
                    : undefined
                }
              />
              <PanelBody>
                {priceResult ? (
                  <>
                    <PricingFormula
                      result={priceResult}
                      markupLabel={rule ? `${rule.markup_value}% markup · ${categoryName}` : 'Markup'}
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-hairline bg-surface px-4 py-3">
                      <p className="text-[12.5px] text-body">
                        Listed sell price on the storefront right now:{' '}
                        <MoneyText amount={product.price} size="sm" tone="ink" className="mx-1" />
                      </p>
                      {priceResult.recommended_price !== product.price && (
                        <span className="rounded-full bg-gold/[0.1] px-2.5 py-1 text-[11px] font-medium text-gold-700">
                          Recommendation differs from listed price
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <Enclosure>
                    <div className="flex items-start gap-2.5 p-4 text-[12.5px] text-body">
                      <Info size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                      No supplier currently offers this product, so a landed price cannot be computed. Once a
                      supplier lists an offer, its cost will drive this breakdown automatically.
                    </div>
                  </Enclosure>
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>

        <div>
          <Link href="/admin/products" className="text-[12.5px] font-medium text-muted hover:text-ink">
            ← Back to catalogue
          </Link>
        </div>
      </div>
    </>
  );
}
