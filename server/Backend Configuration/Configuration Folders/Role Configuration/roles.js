/**
 * Central definition of roles and what each one is allowed to do.
 * Keeping this in one file means RBAC checks never hardcode role strings
 * scattered across routes - they reference these constants instead.
 */

const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
};

// Permission keys used by the rbac middleware. Add new keys here as new
// modules are built (sales, warehouses, forecasting, etc. in later phases).
const PERMISSIONS = {
  PRODUCT_MANAGE: 'product:manage',
  PRODUCT_VIEW: 'product:view',
  CATEGORY_MANAGE: 'category:manage',
  SUPPLIER_MANAGE: 'supplier:manage',
  SUPPLIER_VIEW: 'supplier:view',
  PURCHASE_ORDER_MANAGE: 'purchase_order:manage',
  STOCK_MANAGE: 'stock:manage',
  STOCK_VIEW: 'stock:view',
  USER_MANAGE: 'user:manage',
  REPORTS_VIEW: 'reports:view',
  SETTINGS_MANAGE: 'settings:manage',
};

// Which permissions each role has. Admin gets everything automatically
// in the rbac middleware, so it isn't fully enumerated here.
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.STAFF]: [
    PERMISSIONS.PRODUCT_MANAGE,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.CATEGORY_MANAGE,
    PERMISSIONS.SUPPLIER_VIEW,
    PERMISSIONS.PURCHASE_ORDER_MANAGE,
    PERMISSIONS.STOCK_MANAGE,
    PERMISSIONS.STOCK_VIEW,
  ],
};

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS };
