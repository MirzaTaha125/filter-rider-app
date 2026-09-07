/**
 * The name of the page the topbar is sitting above.
 *
 * The pages themselves no longer print their own title, so this is the only
 * place the name appears — it has to be right for sub-pages too. Deriving it
 * from the second path segment (the old behaviour) named the section instead:
 * /admin/pricing/regional read as "Pricing", and "Regional Pricing" appeared
 * nowhere at all.
 *
 * Kept out of TopBar.jsx so it can be unit tested without rendering.
 */
const EXACT = {
  '/admin': 'Dashboard',
  '/admin/orders': 'Orders',
  '/admin/customers': 'Customers',
  '/admin/customers/add': 'Add Customer',
  '/admin/service-providers': 'Service Providers',
  '/admin/wallet': 'Wallet',
  '/admin/wallet/payment-approval': 'Payment Approval',
  '/admin/wallet/transaction-ledger': 'Transaction Ledger',
  '/admin/services': 'Services',
  '/admin/services/addons': 'Service Add-ons',
  '/admin/services/addons/add': 'New Add-on',
  '/admin/services/pricing-matrix': 'Pricing Matrix',
  '/admin/services/pricing-matrix/add': 'New Price',
  '/admin/services/add': 'New Service',
  // Reached as /admin/services/<id>/settings — ids are dropped before lookup.
  '/admin/services/settings': 'Service Settings',
  '/admin/pricing': 'Fee Configuration',
  '/admin/pricing/surge': 'Surge Pricing',
  '/admin/pricing/surge/configure': 'Configure Surge',
  '/admin/pricing/regional': 'Regional Pricing',
  '/admin/pricing/regional/add': 'New Region',
  '/admin/pricing/rewards': 'Rewards',
  '/admin/pricing/rewards/new': 'New Reward',
  '/admin/assets': 'Asset Categories',
  '/admin/assets/add': 'New Category',
  '/admin/assets/sizes': 'Size Categories',
  '/admin/assets/sizes/add': 'New Size Category',
  '/admin/promotions': 'Promotions & Coupons',
  '/admin/promotions/create': 'New Promotion',
  '/admin/communication': 'Email & SMS Templates',
  '/admin/communication/push-notifications': 'Push Notifications',
  '/admin/communication/content': 'Content Management',
  '/admin/communication/chat': 'Chat',
  '/admin/disputes': 'Disputes',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'Settings',
  '/admin/settings/admin-users/new': 'New Admin User',
  '/admin/settings/roles/new': 'New Role',
  '/admin/settings/permissions/new': 'New Permission',
  '/admin/zones': 'Zones',
  '/admin/zones/add': 'New Zone',
  '/admin/account': 'Account Settings',
}

/** Segments that describe an action, not a place. */
const NOT_A_PLACE = new Set(['add', 'edit', 'new', 'create', 'configure'])

function looksLikeId(segment) {
  return /^[0-9]+$/.test(segment)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment)
    || segment.length > 20
}

export function getPageTitleFor(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/admin'
  if (EXACT[clean]) return EXACT[clean]

  const parts = clean.split('/').filter(Boolean)
  if (parts[0] !== 'admin' || parts.length < 2) return 'Dashboard'

  // A detail or edit route: fall back to the deepest real section it sits
  // under, so /admin/zones/<id>/edit still reads "Zones" rather than an id.
  const sections = parts.slice(1).filter((p) => !looksLikeId(p) && !NOT_A_PLACE.has(p))
  for (let i = sections.length; i > 0; i--) {
    const candidate = `/admin/${sections.slice(0, i).join('/')}`
    if (EXACT[candidate]) return EXACT[candidate]
  }

  const last = sections[sections.length - 1] ?? parts[1]
  return last
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
