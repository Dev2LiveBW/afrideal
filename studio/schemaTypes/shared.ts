/**
 * Option lists shared by several document types. They mirror the enums in
 * the app's `types/index.ts` so a document edited here round-trips into the
 * storefront without translation.
 */

export const ROLES = [
  {title: 'Super Admin', value: 'SUPER_ADMIN'},
  {title: 'Operations', value: 'OPERATIONS_ADMIN'},
  {title: 'Finance', value: 'FINANCE_ADMIN'},
  {title: 'Supplier', value: 'SUPPLIER_OWNER'},
  {title: 'Runner', value: 'RUNNER'},
  {title: 'Customer', value: 'CUSTOMER'},
]

export const ACCOUNT_STATUS = [
  {title: 'Active', value: 'ACTIVE'},
  {title: 'Suspended', value: 'SUSPENDED'},
  {title: 'Invited', value: 'INVITED'},
]

export const PRODUCT_STATUS = [
  {title: 'Active', value: 'ACTIVE'},
  {title: 'Draft', value: 'DRAFT'},
  {title: 'Archived', value: 'ARCHIVED'},
]

export const SUPPLIER_STATUS = [
  {title: 'Verified', value: 'VERIFIED'},
  {title: 'Pending', value: 'PENDING'},
  {title: 'Suspended', value: 'SUSPENDED'},
]

export const SUPPLIER_TYPE = [
  {title: 'Distributor', value: 'DISTRIBUTOR'},
  {title: 'Wholesaler', value: 'WHOLESALER'},
  {title: 'Importer', value: 'IMPORTER'},
  {title: 'Manufacturer', value: 'MANUFACTURER'},
  {title: 'Agent', value: 'AGENT'},
  {title: 'Retailer', value: 'RETAILER'},
]

export const IMAGE_TYPE = [
  {title: 'Primary', value: 'PRIMARY'},
  {title: 'Gallery', value: 'GALLERY'},
  {title: 'Spec sheet', value: 'SPEC'},
  {title: 'Packaging', value: 'PACKAGING'},
]

export const DOC_STATUS = [
  {title: 'Approved', value: 'APPROVED'},
  {title: 'Pending', value: 'PENDING'},
  {title: 'Rejected', value: 'REJECTED'},
]

export const COUNTRIES = [
  {title: 'Botswana', value: 'BW'},
  {title: 'South Africa', value: 'ZA'},
  {title: 'Lesotho', value: 'LS'},
  {title: 'Ghana', value: 'GH'},
  {title: 'Nigeria', value: 'NG'},
  {title: 'China', value: 'CN'},
  {title: 'India', value: 'IN'},
]
