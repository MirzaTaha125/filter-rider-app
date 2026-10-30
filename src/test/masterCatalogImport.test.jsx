import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Every API call is a stub (empty list) unless a test sets it.
vi.mock('../api', async (importOriginal) => {
  const real = await importOriginal()
  return Object.fromEntries(Object.keys(real).map((k) => [k, vi.fn(async () => [])]))
})
vi.mock('../contexts/SocketContext', () => ({
  useSocket: () => ({ catalogSocket: null, connected: {} }),
}))

const api = await import('../api')
const { default: MasterCatalogPicker } = await import('../pages/admin/catalog/MasterCatalogPicker')

const SERVICES = {
  items: [
    { id: 's1', erp_id: '201', name: 'Oil change', name_ar: 'تغيير الزيت', price: 57.5, category: 'Oil services', category_id: 'c1', department: { name: 'Mechanical' }, rider_service_id: null },
    { id: 's2', erp_id: '202', name: 'Hand wash', name_ar: null, price: 30, category: null, category_id: null, department: { name: 'Detailing' }, rider_service_id: null },
    { id: 's3', erp_id: '203', name: 'Engine flush', name_ar: null, price: 80, category: 'Oil services', category_id: 'c1', department: null, rider_service_id: 'rider-1' },
  ],
  total: 3,
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getMasterCatalogItems.mockResolvedValue(SERVICES)
})

describe('Add service from master catalog', () => {
  it('lists active ERP services with price and shows the ones already added', async () => {
    render(<MasterCatalogPicker mode="service" onClose={() => {}} />)
    expect(await screen.findByText('Oil change')).toBeInTheDocument()
    expect(api.getMasterCatalogItems).toHaveBeenCalledWith(expect.objectContaining({ kind: 'SERVICE', status: 'active', offset: 0 }))
    expect(screen.getByText('Added')).toBeInTheDocument() // Engine flush
    expect(screen.getAllByRole('button', { name: /Select/ })).toHaveLength(2)
    expect(screen.getByText('Showing 1–3 of 3')).toBeInTheDocument()
  })

  it('adds with the same name and price; its ERP category comes along', async () => {
    api.importMasterCatalogService.mockResolvedValue({ created: true, category_created: true, service: { name_en: 'Oil change' }, category: { title_en: 'Oil services' } })
    const onAdded = vi.fn()
    render(<MasterCatalogPicker mode="service" riderCategories={[{ id: 'r1', name: 'Car care' }]} onClose={() => {}} onAdded={onAdded} />)
    fireEvent.click((await screen.findAllByRole('button', { name: /Select/ }))[0])
    expect(screen.getByText('تغيير الزيت')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Oil services (from master catalog)')
    fireEvent.click(screen.getByRole('button', { name: /Add service/ }))
    await waitFor(() => expect(onAdded).toHaveBeenCalled())
    expect(api.importMasterCatalogService).toHaveBeenCalledWith('s1', { duration_min: 60 })
  })

  it('a service with no ERP category needs a Rider category first', async () => {
    api.importMasterCatalogService.mockResolvedValue({ created: true, service: {}, category: {} })
    render(<MasterCatalogPicker mode="service" riderCategories={[{ id: 'r1', name: 'Car care' }]} onClose={() => {}} />)
    fireEvent.click((await screen.findAllByRole('button', { name: /Select/ }))[1])
    const add = screen.getByRole('button', { name: /Add service/ })
    expect(add).toBeDisabled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'r1' } })
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '30' } })
    fireEvent.click(add)
    await waitFor(() => expect(api.importMasterCatalogService).toHaveBeenCalledWith('s2', { category_id: 'r1', duration_min: 30 }))
  })

  it('shows the API error and stays on the form', async () => {
    api.importMasterCatalogService.mockRejectedValue(new Error('This service has no price in the master catalog'))
    render(<MasterCatalogPicker mode="service" onClose={() => {}} />)
    fireEvent.click((await screen.findAllByRole('button', { name: /Select/ }))[0])
    fireEvent.click(screen.getByRole('button', { name: /Add service/ }))
    expect(await screen.findByText('This service has no price in the master catalog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add service/ })).toBeEnabled()
  })
})

describe('Add category from master catalog', () => {
  it('lists ERP service categories and adds one', async () => {
    api.getMasterCatalogCategories.mockResolvedValue([
      { id: 'c1', erp_id: '1', name: 'Oil services', department: { name: 'Mechanical' }, products: 0, services: 2, rider_category_id: null },
      { id: 'c2', erp_id: '2', name: 'Wash', department: { name: 'Detailing' }, products: 0, services: 1, rider_category_id: 'rc2' },
    ])
    api.importMasterCatalogCategory.mockResolvedValue({ created: true, category: { title_en: 'Oil services' } })
    const onAdded = vi.fn()
    render(<MasterCatalogPicker mode="category" onClose={() => {}} onAdded={onAdded} />)
    expect(await screen.findByText('Oil services')).toBeInTheDocument()
    expect(api.getMasterCatalogCategories).toHaveBeenCalledWith({ q: '', type: 'service', status: 'active' })
    expect(screen.getByText('Mechanical · 2 services · 0 products')).toBeInTheDocument()
    expect(screen.getByText('Added')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }))
    await waitFor(() => expect(onAdded).toHaveBeenCalled())
    expect(api.importMasterCatalogCategory).toHaveBeenCalledWith('c1')
  })
})

describe('Pages open without crashing (lists paged after they are built)', () => {
  const pages = {
    'Services': () => import('../pages/admin/services/ServiceManagement'),
    'Service categories': () => import('../pages/admin/assets/AssetCategories'),
    'Vehicle sizes': () => import('../pages/admin/assets/VehicleSizes'),
    'Disputes': () => import('../pages/admin/disputes/DisputeManagement'),
    'Regional pricing': () => import('../pages/admin/pricing/RegionalPricing'),
  }
  for (const [name, load] of Object.entries(pages)) {
    it(name, async () => {
      const { default: Page } = await load()
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { container } = render(<MemoryRouter><Page /></MemoryRouter>)
      await waitFor(() => expect(container.querySelector('.spin')).toBeNull())
      expect(container.textContent.length).toBeGreaterThan(0)
      errors.mockRestore()
    })
  }

  it('Services page has the master catalog button and opens the picker', async () => {
    const { default: Page } = await import('../pages/admin/services/ServiceManagement')
    render(<MemoryRouter><Page /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Add Service from Master Catalog/ }))
    expect(await screen.findByRole('dialog', { name: 'Add service from master catalog' })).toBeInTheDocument()
  })

  it('Categories page has the master catalog button and opens the picker', async () => {
    const { default: Page } = await import('../pages/admin/assets/AssetCategories')
    render(<MemoryRouter><Page /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Add Category from Master Catalog/ }))
    expect(await screen.findByRole('dialog', { name: 'Add category from master catalog' })).toBeInTheDocument()
  })
})
