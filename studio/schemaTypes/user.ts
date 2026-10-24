import {defineField, defineType} from 'sanity'
import {ACCOUNT_STATUS, ROLES} from './shared'

/**
 * The people directory: who can sign in and as what. Credentials never live
 * here — Clerk holds them. `clerkUserId` links this profile to that account.
 */
export const user = defineType({
  name: 'user',
  title: 'User',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'email',
      type: 'string',
      validation: (rule) => rule.required().email(),
    }),
    defineField({name: 'phone', type: 'string'}),
    defineField({
      name: 'role',
      type: 'string',
      options: {list: ROLES},
      initialValue: 'CUSTOMER',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {list: ACCOUNT_STATUS, layout: 'radio', direction: 'horizontal'},
      initialValue: 'ACTIVE',
    }),
    defineField({
      name: 'supplier',
      type: 'reference',
      to: [{type: 'supplier'}],
      description: 'For supplier accounts: which supplier this person manages.',
      hidden: ({document}) => document?.role !== 'SUPPLIER_OWNER',
    }),
    defineField({
      name: 'avatar',
      title: 'Avatar initials',
      type: 'string',
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: 'clerkUserId',
      title: 'Clerk user ID',
      type: 'string',
      readOnly: true,
      description: 'Filled in automatically once the person has signed in.',
    }),
  ],
  orderings: [
    {title: 'Name', name: 'name', by: [{field: 'name', direction: 'asc'}]},
    {title: 'Role', name: 'role', by: [{field: 'role', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', email: 'email', role: 'role', status: 'status'},
    prepare({title, email, role, status}) {
      const roleTitle = ROLES.find((r) => r.value === role)?.title ?? role
      const flag = status === 'ACTIVE' ? '' : ` · ${status}`
      return {title, subtitle: `${roleTitle} · ${email}${flag}`}
    },
  },
})
