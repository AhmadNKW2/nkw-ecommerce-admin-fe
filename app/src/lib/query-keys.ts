/**
 * Query Keys Factory - Centralized query key management
 * Following the Factory pattern
 */

export const queryKeys = {
  // Users
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.users.details(), id] as const,
  },

  // Orders
  orders: {
    all: ["orders"] as const,
    lists: () => [...queryKeys.orders.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.orders.lists(), params] as const,
    stats: (params?: Record<string, any>) =>
      [...queryKeys.orders.all, "stats", params] as const,
    details: () => [...queryKeys.orders.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.orders.details(), id] as const,
  },

  // Cashback Rules
  cashbackRules: {
    all: ["cashback-rules"] as const,
    lists: () => [...queryKeys.cashbackRules.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.cashbackRules.lists(), params] as const,
    details: () => [...queryKeys.cashbackRules.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.cashbackRules.details(), id] as const,
  },

  // Categories
  categories: {
    all: ["categories"] as const,
    tree: ["categories", "tree"] as const,
    main: ["categories", "main"] as const,
    archived: ["categories", "archived"] as const,
    products: (id: number) => ["categories", id, "products"] as const,
    urls: () => [...queryKeys.categories.all, "urls"] as const,
    urlList: (params?: Record<string, any>) =>
      [...queryKeys.categories.urls(), params] as const,
    urlDetails: () => [...queryKeys.categories.urls(), "detail"] as const,
    urlDetail: (id: string | number) =>
      [...queryKeys.categories.urlDetails(), id] as const,
    categoryUrls: (id: string | number) =>
      [...queryKeys.categories.all, id, "urls"] as const,
    vendorUrls: (vendorId: string | number, params?: Record<string, any>) =>
      [...queryKeys.categories.all, "vendor", vendorId, "urls", params] as const,
    lists: () => [...queryKeys.categories.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.categories.lists(), params] as const,
    details: () => [...queryKeys.categories.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.categories.details(), id] as const,
  },

  // Vendors
  vendors: {
    all: ["vendors"] as const,
    archived: ["vendors", "archived"] as const,
    products: (id: number) => ["vendors", id, "products"] as const,
    categories: (id: number) => ["vendors", id, "categories"] as const,
    categoryTree: (id: number) => ["vendors", id, "categories", "tree"] as const,
    categoryDetail: (id: number, categoryId: number) =>
      ["vendors", id, "categories", "detail", categoryId] as const,
    lists: () => [...queryKeys.vendors.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.vendors.lists(), params] as const,
    details: () => [...queryKeys.vendors.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.vendors.details(), id] as const,
  },

  // Brands
  brands: {
    all: ["brands"] as const,
    archived: ["brands", "archived"] as const,
    products: (id: number) => ["brands", id, "products"] as const,
    lists: () => [...queryKeys.brands.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.brands.lists(), params] as const,
    details: () => [...queryKeys.brands.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.brands.details(), id] as const,
  },

  // Products
  products: {
    all: ["products"] as const,
    archived: ["products", "archived"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.products.lists(), params] as const,
    names: () => [...queryKeys.products.all, "names"] as const,
    namesList: (params?: Record<string, any>) =>
      [...queryKeys.products.names(), params] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.products.details(), id] as const,
  },

  // Attributes
  attributes: {
    all: ["attributes"] as const,
    lists: () => [...queryKeys.attributes.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.attributes.lists(), params] as const,
    details: () => [...queryKeys.attributes.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.attributes.details(), id] as const,
  },

  // Specifications
  specifications: {
    all: ["specifications"] as const,
    lists: () => [...queryKeys.specifications.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.specifications.lists(), params] as const,
    details: () => [...queryKeys.specifications.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.specifications.details(), id] as const,
  },

  // Wishlists
  wishlists: {
    all: ["wishlists"] as const,
    lists: () => [...queryKeys.wishlists.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.wishlists.lists(), params] as const,
    details: () => [...queryKeys.wishlists.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.wishlists.details(), id] as const,
  },

  // Customers
  customers: {
    all: ["customers"] as const,
    lists: () => [...queryKeys.customers.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.customers.lists(), params] as const,
    details: () => [...queryKeys.customers.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.customers.details(), id] as const,
  },

  // Terms
  // Terms / concepts
  terms: {
    all: ["terms"] as const,
    generation: () => [...queryKeys.terms.all, "generation"] as const,
    generationJob: (jobId: string) =>
      [...queryKeys.terms.generation(), "job", jobId] as const,
    lists: () => [...queryKeys.terms.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.terms.lists(), params] as const,
    coverage: () => [...queryKeys.terms.all, "coverage"] as const,
    detail: (id: number) => [...queryKeys.terms.all, "detail", id] as const,
  },

  // Notes
  notes: {
    all: ["notes"] as const,
    lists: () => [...queryKeys.notes.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.notes.lists(), params] as const,
    details: () => [...queryKeys.notes.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.notes.details(), id] as const,
  },

  // Partners
  partners: {
    all: ["partners"] as const,
    lists: () => [...queryKeys.partners.all, "list"] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.partners.lists(), params] as const,
    details: () => [...queryKeys.partners.all, "detail"] as const,
    detail: (id: string | number) =>
      [...queryKeys.partners.details(), id] as const,
  },

  // Analytics
  analytics: {
    all: ["analytics"] as const,
    overview: (params?: Record<string, any>) =>
      [...queryKeys.analytics.all, "overview", params] as const,
  },

  // Settings
  settings: {
    all: ["settings"] as const,
    seo: () => [...queryKeys.settings.all, "seo"] as const,
    features: () =>
      [...queryKeys.settings.all, "features"] as const,
    /** @deprecated Use features */
    productFields: () =>
      [...queryKeys.settings.all, "features"] as const,
    pricingRules: () => [...queryKeys.settings.all, "pricing-rules"] as const,
    pricingAudit: (params?: Record<string, any>) =>
      [...queryKeys.settings.all, "pricing-audit", params] as const,
    popup: () => [...queryKeys.settings.all, "popup"] as const,
  },
} as const;
