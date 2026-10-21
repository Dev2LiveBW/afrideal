import {defineField, defineType} from 'sanity'

/**
 * What one supplier will sell one product for. The pricing engine reads
 * supplierCost and the storefront reads stock and MOQ; the customer price
 * lives on the product.
 */
export const supplierOffer = defineType({
  name: 'supplierOffer',
  title: 'Supplier offer',
  type: 'document',
  fields: [
    defineField({
      name: 'product',
      type: 'reference',
      to: [{type: 'product'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'supplier',
      type: 'reference',
      to: [{type: 'supplier'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'supplierCost',
      title: 'Supplier cost (BWP)',
      type: 'number',
      description: 'Per unit, what AfriDeal pays. Never shown to customers.',
      validation: (rule) => rule.required().positive(),
    }),
    defineField({name: 'stock', type: 'number', validation: (rule) => rule.min(0)}),
    defineField({
      name: 'moq',
      title: 'Minimum order quantity',
      type: 'number',
      initialValue: 1,
      validation: (rule) => rule.min(1),
    }),
    defineField({name: 'fulfilmentDays', title: 'Fulfilment (days)', type: 'number'}),
    defineField({name: 'active', type: 'boolean', initialValue: true}),
    defineField({name: 'lastUpdated', title: 'Last updated', type: 'datetime'}),
  ],
  preview: {
    select: {
      product: 'product.name',
      supplier: 'supplier.name',
      cost: 'supplierCost',
      stock: 'stock',
      active: 'active',
      media: 'product.images.0',
    },
    prepare({product, supplier, cost, stock, active, media}) {
      return {
        title: `${product ?? '—'} ← ${supplier ?? '—'}`,
        subtitle: `cost P${cost} · stock ${stock ?? 0}${active === false ? ' · inactive' : ''}`,
        media,
      }
    },
  },
})
