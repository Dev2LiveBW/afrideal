import {defineField, defineType} from 'sanity'

export const brand = defineType({
  name: 'brand',
  title: 'Brand',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'logo', type: 'image', options: {hotspot: true}}),
  ],
  preview: {select: {title: 'name', media: 'logo'}},
})
