import 'server-only';

import { readAll } from '@/lib/db';
import type { CountryCode, Product, ProductImage, Supplier } from '@/types';

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
  country: CountryCode;
  /** §11 - manufacturer, wholesaler, distributor and so on. */
  supplier_type: string;
  verified: boolean;
  rating: number;
  /** 0-100. Stands in for Alibaba's reorder rate on the listing row. */
  fulfilment_rate: number;
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

export interface SupplierProductListing extends DirectoryListing {
  product: Product;
  is_direct_supplier_product: boolean;
}

export interface SupplierWithProducts {
  supplier: Supplier;
  /** The supplier's country by name, from the `countries` collection (spec 0009). */
  country_name: string;
  categoryNames: string[];
  listings: SupplierProductListing[];
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
          moq: product.owner_type === 'SUPPLIER' && product.supplier_id === supplier.id
            ? (product.moq ?? offer.moq)
            : offer.moq,
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          supplier_initials: supplier.initials,
          city: supplier.city,
          country: supplier.country,
          supplier_type: supplier.supplier_type ?? 'WHOLESALER',
          verified,
          rating: supplier.rating,
          fulfilment_rate: supplier.fulfilment_rate,
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

/**
 * Group verified suppliers with their own respective products.
 * Direct supplier-owned products (`owner_type === 'SUPPLIER'`) lead each supplier's
 * catalogue, followed by their other verified product listings.
 */
export async function getSuppliersWithProducts({
  categoryId,
  verifiedOnly = true,
  limit,
}: {
  categoryId?: string | null;
  verifiedOnly?: boolean;
  limit?: number;
} = {}): Promise<SupplierWithProducts[]> {
  const [products, offers, suppliers, categories, images, countries] = await Promise.all([
    readAll('products'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('categories'),
    readAll('product-images'),
    readAll('countries'),
  ]);
  const countryName = new Map(countries.map((country) => [country.code, country.name]));

  const productById = new Map<string, Product>(products.map((product) => [product.id, product]));
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const primaryImage = new Map(
    images.filter((image) => image.sort_order === 0).map((image) => [image.product_id, image]),
  );

  const eligibleSuppliers = suppliers
    .filter((supplier) => (verifiedOnly ? supplier.status === 'VERIFIED' : true))
    .sort((a, b) => b.reliability_score - a.reliability_score || b.rating - a.rating);

  const groups = eligibleSuppliers
    .map((supplier): SupplierWithProducts => {
      const supplierOffers = offers.filter(
        (offer) => offer.active && offer.supplier_id === supplier.id,
      );

      const seenProducts = new Set<string>();
      const listings: SupplierProductListing[] = [];

      for (const offer of supplierOffers) {
        const product = productById.get(offer.product_id);
        if (!product || seenProducts.has(product.id)) continue;
        if (categoryId && product.category_id !== categoryId) continue;

        seenProducts.add(product.id);
        const isDirect =
          product.owner_type === 'SUPPLIER' && product.supplier_id === supplier.id;

        listings.push({
          id: offer.id,
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          moq: isDirect ? (product.moq ?? offer.moq) : offer.moq,
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          supplier_initials: supplier.initials,
          city: supplier.city,
          country: supplier.country,
          supplier_type: supplier.supplier_type ?? 'WHOLESALER',
          verified: supplier.status === 'VERIFIED',
          rating: supplier.rating,
          fulfilment_rate: supplier.fulfilment_rate,
          fulfilment_days: offer.fulfilment_days,
          in_stock: offer.stock > 0,
          category_id: product.category_id,
          category_name: categoryName.get(product.category_id) ?? 'Uncategorised',
          emoji: product.emoji,
          swatch: product.swatch,
          image: primaryImage.get(product.id),
          product,
          is_direct_supplier_product: isDirect,
        });
      }

      // Direct supplier-owned products first, then in-stock, then by rating.
      listings.sort(
        (a, b) =>
          Number(b.is_direct_supplier_product) - Number(a.is_direct_supplier_product) ||
          Number(b.in_stock) - Number(a.in_stock) ||
          b.product.rating - a.product.rating,
      );

      const categoryNames = supplier.categories
        .map((catId) => categoryName.get(catId))
        .filter((name): name is string => Boolean(name));

      return {
        supplier,
        country_name: countryName.get(supplier.country) ?? supplier.country,
        categoryNames,
        listings,
      };
    })
    .filter((group) => group.listings.length > 0);

  return typeof limit === 'number' ? groups.slice(0, limit) : groups;
}

/**
 * Single supplier storefront model for `/suppliers/[id]`.
 */
export async function getSupplierStorefront(supplierId: string): Promise<{
  supplier: Supplier;
  country_name: string;
  categories: { id: string; name: string; slug: string; emoji: string }[];
  listings: SupplierProductListing[];
} | null> {
  const [groups, allCategories] = await Promise.all([
    getSuppliersWithProducts({ verifiedOnly: true }),
    readAll('categories'),
  ]);

  const group = groups.find((entry) => entry.supplier.id === supplierId);
  if (!group) return null;

  const productCategoryIds = new Set(group.listings.map((item) => item.category_id));
  const categories = allCategories.filter((cat) => productCategoryIds.has(cat.id));

  return {
    supplier: group.supplier,
    country_name: group.country_name,
    categories,
    listings: group.listings,
  };
}

