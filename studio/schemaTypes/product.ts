import {defineArrayMember, defineField, defineType} from 'sanity'
import {COUNTRIES, IMAGE_TYPE, PRODUCT_STATUS} from './shared'

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  groups: [
    {name: 'listing', title: 'Listing', default: true},
    {name: 'pricing', title: 'Pricing'},
    {name: 'media', title: 'Images'},
    {name: 'details', title: 'Details'},
  ],
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      group: 'listing',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'listing',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{type: 'category'}],
      group: 'listing',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'brand', type: 'reference', to: [{type: 'brand'}], group: 'listing'}),
    defineField({
      name: 'status',
      type: 'string',
      group: 'listing',
      options: {list: PRODUCT_STATUS, layout: 'radio', direction: 'horizontal'},
      initialValue: 'DRAFT',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'featured',
      type: 'boolean',
      group: 'listing',
      description: 'Featured products are eligible for the home-page floors.',
      initialValue: false,
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'string',
      group: 'listing',
      description: 'One line under the name on cards. Keep it under 80 characters.',
      validation: (rule) => rule.max(120),
    }),
    defineField({name: 'description', type: 'text', rows: 6, group: 'details'}),
    defineField({
      name: 'specs',
      type: 'array',
      group: 'details',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'spec',
          fields: [
            defineField({name: 'label', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'value', type: 'string', validation: (rule) => rule.required()}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
    }),
    defineField({
      name: 'emoji',
      type: 'string',
      group: 'details',
      description: 'Stand-in when a product has no photograph yet.',
    }),
    defineField({
      name: 'swatch',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'string'})],
      description: 'Two hex colours for the image stand-in gradient.',
      validation: (rule) => rule.max(2),
    }),
    defineField({
      name: 'productType',
      title: 'Product type',
      type: 'string',
      group: 'details',
      options: {list: ['PHYSICAL', 'SERVICE']},
      initialValue: 'PHYSICAL',
    }),
    defineField({
      name: 'countryOfOrigin',
      title: 'Country of origin',
      type: 'string',
      group: 'details',
      options: {list: COUNTRIES},
    }),
    defineField({
      name: 'price',
      title: 'Customer price (BWP)',
      type: 'number',
      group: 'pricing',
      description: 'What AfriDeal charges at one unit. Must sit above every supplier cost.',
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Compare-at price (BWP)',
      type: 'number',
      group: 'pricing',
      description: 'The strikethrough figure while a promotion runs. Leave empty otherwise.',
    }),
    defineField({
      name: 'variants',
      type: 'array',
      group: 'pricing',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'variant',
          fields: [
            defineField({name: 'label', type: 'string', validation: (rule) => rule.required()}),
            defineField({
              name: 'sku',
              title: 'SKU',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'price',
              title: 'Price (BWP)',
              type: 'number',
              validation: (rule) => rule.required().positive(),
            }),
          ],
          preview: {
            select: {title: 'label', sku: 'sku', price: 'price'},
            prepare({title, sku, price}) {
              return {title, subtitle: `${sku} · P${price}`}
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'images',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'imageType',
              title: 'Type',
              type: 'string',
              options: {list: IMAGE_TYPE, layout: 'radio', direction: 'horizontal'},
              initialValue: 'GALLERY',
            }),
            defineField({name: 'alt', title: 'Alt text', type: 'string'}),
          ],
        }),
      ],
      description: 'The first image is the one shown on cards.',
    }),
    defineField({name: 'rating', type: 'number', group: 'details', readOnly: true}),
    defineField({
      name: 'reviewCount',
      title: 'Review count',
      type: 'number',
      group: 'details',
      readOnly: true,
    }),
    defineField({
      name: 'createdAt',
      title: 'Created',
      type: 'datetime',
      group: 'details',
      readOnly: true,
    }),
  ],
  orderings: [
    {title: 'Name', name: 'name', by: [{field: 'name', direction: 'asc'}]},
    {title: 'Newest', name: 'createdAt', by: [{field: 'createdAt', direction: 'desc'}]},
    {title: 'Price, low to high', name: 'price', by: [{field: 'price', direction: 'asc'}]},
  ],
  preview: {
    select: {
      title: 'name',
      price: 'price',
      status: 'status',
      category: 'category.name',
      media: 'images.0',
    },
    prepare({title, price, status, category, media}) {
      const flags = status === 'ACTIVE' ? '' : ` · ${status}`
      return {title, subtitle: `P${price} · ${category ?? 'no category'}${flags}`, media}
    },
  },
})
