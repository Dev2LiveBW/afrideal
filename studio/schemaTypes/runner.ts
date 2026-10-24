import {defineField, defineType} from 'sanity'

export const runner = defineType({
  name: 'runner',
  title: 'Runner',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'initials', type: 'string', validation: (rule) => rule.max(3)}),
    defineField({name: 'photo', type: 'image', options: {hotspot: true}}),
    defineField({name: 'phone', type: 'string'}),
    defineField({name: 'city', type: 'string', initialValue: 'Gaborone'}),
    defineField({name: 'vehicle', type: 'string'}),
    defineField({name: 'plate', title: 'Number plate', type: 'string'}),
    defineField({name: 'online', type: 'boolean', initialValue: false}),
    defineField({
      name: 'account',
      type: 'reference',
      to: [{type: 'user'}],
      description: 'The sign-in account this runner uses.',
    }),
    defineField({name: 'rating', type: 'number', readOnly: true}),
    defineField({
      name: 'deliveriesCompleted',
      title: 'Deliveries completed',
      type: 'number',
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'name', city: 'city', vehicle: 'vehicle', online: 'online', media: 'photo'},
    prepare({title, city, vehicle, online, media}) {
      const state = online ? 'online' : 'offline'
      return {title, subtitle: [state, city, vehicle].filter(Boolean).join(' · '), media}
    },
  },
})
