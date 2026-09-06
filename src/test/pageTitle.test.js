import { describe, it, expect } from 'vitest'
import { getPageTitleFor } from '../components/Layout/pageTitle'

describe('getPageTitleFor', () => {
  it('names the dashboard', () => {
    expect(getPageTitleFor('/admin')).toBe('Dashboard')
    expect(getPageTitleFor('/admin/')).toBe('Dashboard')
  })

  it('names top-level sections', () => {
    expect(getPageTitleFor('/admin/orders')).toBe('Orders')
    expect(getPageTitleFor('/admin/service-providers')).toBe('Service Providers')
    expect(getPageTitleFor('/admin/analytics')).toBe('Analytics')
  })

  // The old implementation read the second segment, so all of these said
  // "Wallet" / "Services" / "Pricing" — the actual page name was lost.
  it('names sub-pages, not just their section', () => {
    expect(getPageTitleFor('/admin/wallet/payment-approval')).toBe('Payment Approval')
    expect(getPageTitleFor('/admin/wallet/transaction-ledger')).toBe('Transaction Ledger')
    expect(getPageTitleFor('/admin/services/addons')).toBe('Service Add-ons')
    expect(getPageTitleFor('/admin/services/pricing-matrix')).toBe('Pricing Matrix')
    expect(getPageTitleFor('/admin/pricing/regional')).toBe('Regional Pricing')
    expect(getPageTitleFor('/admin/pricing/surge')).toBe('Surge Pricing')
    expect(getPageTitleFor('/admin/assets/sizes')).toBe('Size Categories')
    expect(getPageTitleFor('/admin/communication/content')).toBe('Content Management')
  })

  it('falls back to the section a detail route sits under', () => {
    expect(getPageTitleFor('/admin/orders/9f1c2d3e-4b5a-6789-abcd-ef0123456789'))
      .toBe('Orders')
    expect(getPageTitleFor('/admin/zones/9f1c2d3e-4b5a-6789-abcd-ef0123456789/edit'))
      .toBe('Zones')
    expect(getPageTitleFor('/admin/services/pricing-matrix/9f1c2d3e-4b5a-6789-abcd-ef0123456789/9f1c2d3e-4b5a-6789-abcd-ef0123456789/edit'))
      .toBe('Pricing Matrix')
    expect(getPageTitleFor('/admin/settings/roles/users/9f1c2d3e-4b5a-6789-abcd-ef0123456789'))
      .toBe('Settings')
    expect(getPageTitleFor('/admin/services/9f1c2d3e-4b5a-6789-abcd-ef0123456789/settings'))
      .toBe('Service Settings')
  })

  it('names the create routes', () => {
    expect(getPageTitleFor('/admin/zones/add')).toBe('New Zone')
    expect(getPageTitleFor('/admin/customers/add')).toBe('Add Customer')
  })

  it('prettifies an unmapped route rather than showing a slug', () => {
    expect(getPageTitleFor('/admin/brand-new-section')).toBe('Brand New Section')
  })

  it('never returns an id', () => {
    const title = getPageTitleFor('/admin/9f1c2d3e-4b5a-6789-abcd-ef0123456789')
    expect(title).not.toMatch(/[0-9a-f]{8}-/)
  })
})
