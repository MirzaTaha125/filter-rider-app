/**
 * Every capability the admin panel gates on, derived from what each page can
 * actually do. Grouped by the sidebar entry it belongs to, so a role can be
 * granted a sub-page (Add-ons) without granting its siblings (Services,
 * Pricing Matrix) — those used to share one `services.view` slug.
 *
 * Must stay in sync with:
 *   - src/components/Layout/Sidebar.jsx            (menu gating)
 *   - src/pages/admin/dashboard/Dashboard.jsx      (KPI blocks)
 *   - filter-rider-live/prisma/seed-permissions.ts (backend seed + @Permissions)
 */
export const PERMISSION_GROUPS = [
  {
    group: 'Dashboard',
    permissions: [
      { name: 'Dashboard View', slug: 'dashboard.view', description: 'View the dashboard and its KPI cards' },
    ],
  },
  {
    group: 'Orders',
    permissions: [
      { name: 'Orders View', slug: 'orders.view', description: 'View the orders list and order details' },
      { name: 'Orders Edit', slug: 'orders.edit', description: 'Edit order details' },
      { name: 'Orders Cancel', slug: 'orders.cancel', description: 'Cancel an order' },
      { name: 'Orders Assign', slug: 'orders.assign', description: 'Assign, reassign or rebroadcast an order' },
    ],
  },
  {
    group: 'Customers',
    permissions: [
      { name: 'Customers View', slug: 'customers.view', description: 'View customer list and profiles' },
      { name: 'Customers Create', slug: 'customers.create', description: 'Add a new customer account' },
      { name: 'Customers Edit', slug: 'customers.edit', description: 'Edit customers and change their status' },
    ],
  },
  {
    group: 'Service Providers',
    permissions: [
      { name: 'Providers View', slug: 'providers.view', description: 'View providers, their orders and requests' },
      { name: 'Providers Edit', slug: 'providers.edit', description: 'Change provider status and details' },
      { name: 'Providers Approve', slug: 'providers.approve', description: 'Accept or reject provider registration requests' },
      { name: 'Providers Manage Services', slug: 'providers.services.manage', description: 'Assign or remove the services a provider offers' },
    ],
  },
  {
    group: 'Wallet',
    permissions: [
      { name: 'Wallet View', slug: 'wallet.view', description: 'View wallet overview and balances' },
      { name: 'Payment Approvals View', slug: 'wallet.approvals.view', description: 'View provider withdrawal requests' },
      { name: 'Payment Approvals Manage', slug: 'wallet.approvals.manage', description: 'Approve or reject withdrawal requests' },
      { name: 'Transaction Ledger View', slug: 'wallet.ledger.view', description: 'View the immutable transaction ledger' },
    ],
  },
  {
    group: 'Services',
    permissions: [
      { name: 'Services View', slug: 'services.view', description: 'View the service catalog' },
      { name: 'Services Create', slug: 'services.create', description: 'Create a service' },
      { name: 'Services Edit', slug: 'services.edit', description: 'Edit a service' },
      { name: 'Services Delete', slug: 'services.delete', description: 'Delete a service' },
    ],
  },
  {
    group: 'Service Types & Checklists',
    permissions: [
      { name: 'Service Types View', slug: 'service_types.view', description: 'View service types, properties and checklists' },
      { name: 'Service Types Create', slug: 'service_types.create', description: 'Create service types, properties and checklist items' },
      { name: 'Service Types Edit', slug: 'service_types.edit', description: 'Edit service types, properties and checklist items' },
      { name: 'Service Types Delete', slug: 'service_types.delete', description: 'Delete service types, properties and checklist items' },
    ],
  },
  {
    group: 'Add-ons',
    permissions: [
      { name: 'Add-ons View', slug: 'addons.view', description: 'View service add-ons' },
      { name: 'Add-ons Create', slug: 'addons.create', description: 'Create a service add-on' },
      { name: 'Add-ons Edit', slug: 'addons.edit', description: 'Edit a service add-on' },
      { name: 'Add-ons Delete', slug: 'addons.delete', description: 'Delete a service add-on' },
    ],
  },
  {
    group: 'Pricing Matrix',
    permissions: [
      { name: 'Pricing Matrix View', slug: 'pricing_matrix.view', description: 'View the service/size pricing matrix' },
      { name: 'Pricing Matrix Create', slug: 'pricing_matrix.create', description: 'Add a pricing matrix row' },
      { name: 'Pricing Matrix Edit', slug: 'pricing_matrix.edit', description: 'Edit a pricing matrix row' },
      { name: 'Pricing Matrix Delete', slug: 'pricing_matrix.delete', description: 'Delete a pricing matrix row' },
    ],
  },
  {
    group: 'Fee Configuration',
    permissions: [
      { name: 'Fee Configuration View', slug: 'pricing_fees.view', description: 'View platform fee configuration' },
      { name: 'Fee Configuration Edit', slug: 'pricing_fees.edit', description: 'Create or update platform fee configuration' },
    ],
  },
  {
    group: 'Surge Pricing',
    permissions: [
      { name: 'Surge Pricing View', slug: 'surge.view', description: 'View surge pricing rules' },
      { name: 'Surge Pricing Edit', slug: 'surge.edit', description: 'Create and update surge pricing rules' },
    ],
  },
  {
    group: 'Regional Pricing',
    permissions: [
      { name: 'Regional Pricing View', slug: 'regional_pricing.view', description: 'View per-zone pricing' },
      { name: 'Regional Pricing Create', slug: 'regional_pricing.create', description: 'Add per-zone pricing' },
      { name: 'Regional Pricing Edit', slug: 'regional_pricing.edit', description: 'Edit per-zone pricing' },
      { name: 'Regional Pricing Delete', slug: 'regional_pricing.delete', description: 'Delete per-zone pricing' },
    ],
  },
  {
    group: 'Asset Categories',
    permissions: [
      { name: 'Asset Categories View', slug: 'asset_categories.view', description: 'View asset/service categories' },
      { name: 'Asset Categories Create', slug: 'asset_categories.create', description: 'Create an asset category' },
      { name: 'Asset Categories Edit', slug: 'asset_categories.edit', description: 'Edit an asset category' },
      { name: 'Asset Categories Delete', slug: 'asset_categories.delete', description: 'Delete an asset category' },
    ],
  },
  {
    group: 'Size Categories',
    permissions: [
      { name: 'Size Categories View', slug: 'size_categories.view', description: 'View size categories' },
      { name: 'Size Categories Create', slug: 'size_categories.create', description: 'Create a size category' },
      { name: 'Size Categories Edit', slug: 'size_categories.edit', description: 'Edit a size category' },
      { name: 'Size Categories Delete', slug: 'size_categories.delete', description: 'Delete a size category' },
    ],
  },
  {
    group: 'Promotions',
    permissions: [
      { name: 'Promotions View', slug: 'promotions.view', description: 'View promotions and discount codes' },
      { name: 'Promotions Create', slug: 'promotions.create', description: 'Create a promotion' },
      { name: 'Promotions Edit', slug: 'promotions.edit', description: 'Edit a promotion or toggle it on/off' },
      { name: 'Promotions Delete', slug: 'promotions.delete', description: 'Delete a promotion' },
    ],
  },
  {
    group: 'Email & SMS Templates',
    permissions: [
      { name: 'Templates View', slug: 'templates.view', description: 'View email and SMS templates' },
      { name: 'Templates Create', slug: 'templates.create', description: 'Create a template' },
      { name: 'Templates Edit', slug: 'templates.edit', description: 'Edit a template' },
      { name: 'Templates Delete', slug: 'templates.delete', description: 'Delete a template' },
    ],
  },
  {
    group: 'Push Notifications',
    permissions: [
      { name: 'Push Notifications View', slug: 'push_notifications.view', description: 'View push notification settings' },
      { name: 'Push Notifications Edit', slug: 'push_notifications.edit', description: 'Change push notification settings' },
    ],
  },
  {
    group: 'Content Pages',
    permissions: [
      { name: 'Content Pages View', slug: 'content_pages.view', description: 'View managed content pages' },
      { name: 'Content Pages Create', slug: 'content_pages.create', description: 'Create a content page' },
      { name: 'Content Pages Edit', slug: 'content_pages.edit', description: 'Edit a content page' },
      { name: 'Content Pages Delete', slug: 'content_pages.delete', description: 'Delete a content page' },
    ],
  },
  {
    group: 'Disputes',
    permissions: [
      { name: 'Disputes View', slug: 'disputes.view', description: 'View dispute cases and their threads' },
      { name: 'Disputes Reply', slug: 'disputes.reply', description: 'Reply in a dispute thread' },
      { name: 'Disputes Change Status', slug: 'disputes.status', description: 'Resolve, reject or reopen a dispute' },
      { name: 'Disputes Internal Notes', slug: 'disputes.internal_notes', description: 'Read and write admin-only internal notes' },
    ],
  },
  {
    group: 'Zones',
    permissions: [
      { name: 'Zones View', slug: 'zones.view', description: 'View service zones and the zone map' },
      { name: 'Zones Create', slug: 'zones.create', description: 'Create a service zone' },
      { name: 'Zones Edit', slug: 'zones.edit', description: 'Edit a service zone' },
      { name: 'Zones Delete', slug: 'zones.delete', description: 'Delete a service zone' },
    ],
  },
  {
    group: 'Analytics',
    permissions: [
      { name: 'Analytics View', slug: 'analytics.view', description: 'View analytics and reports' },
    ],
  },
  {
    group: 'Settings',
    permissions: [
      { name: 'Settings View', slug: 'settings.view', description: 'Open Settings and read platform configuration' },
      { name: 'Settings Edit', slug: 'settings.edit', description: 'Change platform settings and API keys' },
    ],
  },
  {
    group: 'Admin Users',
    permissions: [
      { name: 'Admin Users View', slug: 'admin_users.view', description: 'View the list of admin accounts' },
      { name: 'Admin Users Create', slug: 'admin_users.create', description: 'Create an admin account' },
    ],
  },
  {
    group: 'Roles & Permissions',
    permissions: [
      { name: 'Roles View', slug: 'roles.view', description: 'View roles' },
      { name: 'Roles Create', slug: 'roles.create', description: 'Create a role' },
      { name: 'Roles Assign', slug: 'roles.assign', description: 'Assign or remove a user’s roles' },
      { name: 'Role Permissions View', slug: 'role_permissions.view', description: 'View which permissions a role holds' },
      { name: 'Role Permissions Edit', slug: 'role_permissions.edit', description: 'Grant or revoke a role’s permissions' },
    ],
  },
]

/** Flat list, kept for the seed button and the Create Permission preset picker. */
export const PREDEFINED_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions)

/**
 * Roles belonging to the customer/provider apps. An admin account can hold any
 * role EXCEPT these — defined by exclusion so roles an operator creates on the
 * Roles page are offered without a code change.
 * Mirrors NON_ADMIN_ROLES in filter-rider-live/src/common/constants/system-roles.constant.ts
 */
export const NON_ADMIN_ROLE_NAMES = ['CUSTOMER', 'PROVIDER']

export function isAdminRoleName(roleName) {
  return Boolean(roleName) && !NON_ADMIN_ROLE_NAMES.includes(roleName)
}
