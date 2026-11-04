import { priceLine, sellerQuantities } from '@/lib/pricing-tiers';
import { routeLine } from '@/lib/supplier-selection';
import type {
  CartLine,
  CustomerPrice,
  CustomerType,
  OrderItem,
  Product,
  Supplier,
  SupplierOffer,
} from '@/types';

/**
 * Buying a delivered order again (spec 0011, AC-11 and AC-12).
 *
 * The cart lives in the browser, so this only works out what can go back in it.
 * Nothing is carried over from the old order except which variant and how many:
 * the price is today's, from `priceLine()`, the function checkout charges with.
 * Every check here is one `POST /api/orders` would make, so a line that passes
 * is a line the buyer can actually order.
 */

export interface ReorderSkip {
  product_id: string;
  name: string;
  /** Why it was left out, in words the buyer sees. */
  note: string;
}

export interface ReorderResult {
  lines: CartLine[];
  skipped: ReorderSkip[];
}

export function reorderLines(input: {
  items: OrderItem[];
  products: Product[];
  offers: SupplierOffer[];
  suppliers: Supplier[];
  bands: CustomerPrice[];
  customerType: CustomerType;
  /** The product's photograph for the cart, when it has one. */
  imageUrlOf?: (productId: string) => string | undefined;
}): ReorderResult {
  const { items, products, offers, suppliers, bands, customerType, imageUrlOf } = input;
  const skipped: ReorderSkip[] = [];

  const skip = (item: OrderItem, note: string) =>
    skipped.push({ product_id: item.product_id, name: item.product_name, note });

  const candidates = items.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.product_id);
    const variant = product?.variants.find((entry) => entry.id === item.variant_id);

    if (!product || !variant || product.status !== 'ACTIVE') {
      skip(item, 'no longer sold');
      return [];
    }

    const minimum = product.owner_type === 'SUPPLIER' ? Math.max(1, product.moq ?? 1) : 1;
    if (item.qty < minimum) {
      skip(item, `now has a minimum order of ${minimum}`);
      return [];
    }

    // routeLine falls back to its best offer even when that offer is short, so
    // the stock has to be checked against the offer it actually chose.
    const route = routeLine(product, offers, suppliers, item.qty);
    if (!route || route.offer.stock < item.qty) {
      skip(item, `not in stock for ${item.qty}`);
      return [];
    }

    return [{ item, product, variant, route }];
  });

  // Rungs count the whole order, so only the lines still in it may count.
  const tierQuantityOf = sellerQuantities(
    candidates.map(({ item }) => ({ product_id: item.product_id, qty: item.qty })),
    products,
  );

  const lines = candidates.flatMap<CartLine>(({ item, product, variant, route }) => {
    const priced = priceLine(
      bands.filter((band) => band.product_id === product.id),
      product,
      variant.id,
      item.qty,
      customerType,
      tierQuantityOf(product.id),
    );

    if (priced.resolved.requires_rfq) {
      skip(item, 'now priced by quotation');
      return [];
    }

    return [
      {
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        variant_label: variant.label,
        emoji: product.emoji,
        unit_price: priced.unit_price,
        qty: item.qty,
        supplier_id: route.supplier.id,
        image_url: imageUrlOf?.(product.id),
      },
    ];
  });

  return { lines, skipped };
}
