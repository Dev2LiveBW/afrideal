import type {StructureResolver} from 'sanity/structure'

/**
 * The left-hand menu of the Studio, grouped the way the business talks
 * about it rather than by document type.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('AfriDeal')
    .items([
      S.listItem()
        .title('Catalogue')
        .child(
          S.list()
            .title('Catalogue')
            .items([
              S.documentTypeListItem('product').title('Products'),
              S.documentTypeListItem('category').title('Categories'),
              S.documentTypeListItem('brand').title('Brands'),
            ]),
        ),
      S.listItem()
        .title('Suppliers')
        .child(
          S.list()
            .title('Suppliers')
            .items([
              S.documentTypeListItem('supplier').title('Suppliers'),
              S.documentTypeListItem('supplierOffer').title('Offers (cost, stock, MOQ)'),
            ]),
        ),
      S.listItem()
        .title('People')
        .child(
          S.list()
            .title('People')
            .items([
              S.documentTypeListItem('user').title('Users'),
              S.documentTypeListItem('runner').title('Runners'),
            ]),
        ),
    ])
