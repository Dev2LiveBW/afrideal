import {defineField, defineType} from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'emoji', type: 'string', description: 'Shown on category tiles and chips.'}),
    defineField({
      name: 'blurb',
      type: 'text',
      rows: 2,
      description: 'One or two sentences under the category name on its page.',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers come first on the home page.',
    }),
    defineField({name: 'artwork', type: 'image', options: {hotspot: true}}),
  ],
  orderings: [{title: 'Sort order', name: 'sortOrder', by: [{field: 'sortOrder', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', subtitle: 'blurb', media: 'artwork', emoji: 'emoji'},
    prepare({title, subtitle, media, emoji}) {
      return {title: emoji ? `${emoji}  ${title}` : title, subtitle, media}
    },
  },
})
