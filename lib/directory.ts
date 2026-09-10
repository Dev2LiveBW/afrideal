import 'server-only';

import { readAll } from '@/lib/db';
import type { Product, ProductImage, Supplier } from '@/types';

/**
 * The supplier / product directory read model. (TICKET-007)
 *
 * One row per product-supplier pairing, which is the unit the Alibaba-style
 * grid is actually about: the same product from two suppliers is two listings,
 * because the MOQ, the lead time and the company behind it are what the buyer
 * is choosing between.
 *
 * `supplier_cost` never leaves this module. It is what a supplier privately
 * quotes AfriDeal (§5), and a server component serialises whatever it hands a
 * client component into the page payload - so the row carries the published
 * customer price and nothing that could be worked back to the cost.
 */

export interface DirectoryListing {
  id: string;
  product_id: string;
  product_name: string;
  /** Published customer-facing price, per unit. Never a supplier cost. */
  price: number;
  /** Minimum order quantity this supplier will accept for this product. */
  moq: number;
  supplier_id: string;
  supplier_name: string;
  supplier_initials: string;
  city: string;
  country: 'BW' | 'ZA';
  /** §11 - manufacturer, wholesaler, distributor and so on. */
  supplier_type: string;
  verified: boolean;
  rating: number;
  fulfilment_days: number;
  in_stock: boolean;
  category_id: string;
  category_name: string;
  emoji: string;
  swatch: [string, string];
  image?: ProductImage;
}

export interface DirectoryOptions {
  /** Cap the rows returned, for the homepage preview. */
  limit?: number;
  /** Only rows whose supplier has cleared verification. Defaults to true. */
  verifiedOnly?: boolean;
}

export async function getDirectoryListings({
  limit,
  verifiedOnly = true,
}: DirectoryOptions = {}): Promise<DirectoryListing[]> {
  const [products, offers, suppliers, categories, images] = await Promise.all([
    readAll('products'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('categories'),
    readAll('product-images'),
  ]);

  const productById = new Map<string, Product>(products.map((product) => [product.id, product]));
  const supplierById = new Map<string, Supplier>(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const primaryImage = new Map(
    images.filter((image) => image.sort_order === 0).map((image) => [image.product_id, image]),
  );

  const rows = offers
    .filter((offer) => offer.active)
    .flatMap((offer): DirectoryListing[] => {
      const product = productById.get(offer.product_id);
      const supplier = supplierById.get(offer.supplier_id);
      if (!product || !supplier) return [];

      const verified = supplier.status === 'VERIFIED';
      if (verifiedOnly && !verified) return [];

      return [
        {
          id: offer.id,
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          moq: offer.moq,
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          supplier_initials: supplier.initials,
          city: supplier.city,
          country: supplier.country,
          supplier_type: supplier.supplier_type ?? 'WHOLESALER',
          verified,
          rating: supplier.rating,
          fulfilment_days: offer.fulfilment_days,
          in_stock: offer.stock > 0,
          category_id: product.category_id,
          category_name: categoryName.get(product.category_id) ?? 'Uncategorised',
          emoji: product.emoji,
          swatch: product.swatch,
          image: primaryImage.get(product.id),
        },
      ];
    })
    /*
     * In stock first, then the supplier the selection engine would rank
     * highest. A directory that leads with a listing nobody can order from is
     * a directory the buyer stops trusting on the first click.
     */
    .sort(
      (a, b) =>
        Number(b.in_stock) - Number(a.in_stock) ||
        b.rating - a.rating ||
        a.fulfilment_days - b.fulfilment_days,
    );

  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}
