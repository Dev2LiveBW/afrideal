import {defineArrayMember, defineField, defineType} from 'sanity'
import {COUNTRIES, DOC_STATUS, SUPPLIER_STATUS, SUPPLIER_TYPE} from './shared'

export const supplier = defineType({
  name: 'supplier',
  title: 'Supplier',
  type: 'document',
  groups: [
    {name: 'profile', title: 'Profile', default: true},
    {name: 'verification', title: 'Verification'},
    {name: 'performance', title: 'Performance'},
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Trading name',
      type: 'string',
      group: 'profile',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'legalName', title: 'Legal name', type: 'string', group: 'profile'}),
    defineField({
      name: 'initials',
      type: 'string',
      group: 'profile',
      description: 'Two letters for the avatar when there is no logo.',
      validation: (rule) => rule.max(3),
    }),
    defineField({name: 'logo', type: 'image', group: 'profile', options: {hotspot: true}}),
    defineField({
      name: 'status',
      type: 'string',
      group: 'profile',
      options: {list: SUPPLIER_STATUS, layout: 'radio', direction: 'horizontal'},
      initialValue: 'VERIFIED',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'supplierType',
      title: 'Supplier type',
      type: 'string',
      group: 'profile',
      options: {list: SUPPLIER_TYPE},
    }),
    defineField({
      name: 'categories',
      type: 'array',
      group: 'profile',
      of: [defineArrayMember({type: 'reference', to: [{type: 'category'}]})],
      description: 'The categories this supplier can be asked to quote in.',
    }),
    defineField({
      name: 'country',
      type: 'string',
      group: 'profile',
      options: {list: COUNTRIES},
      initialValue: 'BW',
    }),
    defineField({name: 'city', type: 'string', group: 'profile'}),
    defineField({name: 'contactEmail', title: 'Contact email', type: 'string', group: 'profile'}),
    defineField({name: 'contactPhone', title: 'Contact phone', type: 'string', group: 'profile'}),
    defineField({
      name: 'registrationNo',
      title: 'Company registration no.',
      type: 'string',
      group: 'verification',
    }),
    defineField({
      name: 'verificationDocs',
      title: 'Verification documents',
      type: 'array',
      group: 'verification',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'verificationDoc',
          fields: [
            defineField({name: 'label', type: 'string', validation: (rule) => rule.required()}),
            defineField({
              name: 'status',
              type: 'string',
              options: {list: DOC_STATUS, layout: 'radio', direction: 'horizontal'},
              initialValue: 'PENDING',
            }),
            defineField({name: 'file', type: 'file'}),
            defineField({name: 'uploadedAt', title: 'Uploaded', type: 'datetime'}),
          ],
          preview: {select: {title: 'label', subtitle: 'status'}},
        }),
      ],
    }),
    defineField({name: 'joinedAt', title: 'Joined', type: 'datetime', group: 'profile'}),
    defineField({name: 'rating', type: 'number', group: 'performance', readOnly: true}),
    defineField({
      name: 'fulfilmentRate',
      title: 'Fulfilment rate (%)',
      type: 'number',
      group: 'performance',
      readOnly: true,
    }),
    defineField({
      name: 'reliabilityScore',
      title: 'Reliability score',
      type: 'number',
      group: 'performance',
      readOnly: true,
    }),
    defineField({
      name: 'avgFulfilmentDays',
      title: 'Average fulfilment (days)',
      type: 'number',
      group: 'performance',
    }),
    defineField({
      name: 'ordersCount',
      title: 'Orders',
      type: 'number',
      group: 'performance',
      readOnly: true,
    }),
    defineField({
      name: 'totalGmv',
      title: 'Total GMV (BWP)',
      type: 'number',
      group: 'performance',
      readOnly: true,
    }),
  ],
  orderings: [
    {title: 'Name', name: 'name', by: [{field: 'name', direction: 'asc'}]},
    {title: 'Rating', name: 'rating', by: [{field: 'rating', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'name', city: 'city', status: 'status', media: 'logo'},
    prepare({title, city, status, media}) {
      return {title, subtitle: [city, status].filter(Boolean).join(' · '), media}
    },
  },
})
