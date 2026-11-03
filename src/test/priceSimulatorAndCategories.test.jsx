import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../api', async (importOriginal) => {
  const real = await importOriginal()
  return Object.fromEntries(Object.keys(real).map((k) => [k, vi.fn(async () => [])]))
})
vi.mock('../contexts/SocketContext', () => ({
  useSocket: () => ({ catalogSocket: null, connected: {} }),
}))

const api = await import('../api')
const { default: PriceSimulator } = await import('../pages/admin/services/PriceSimulator')
const { default: AssetCategories } = await import('../pages/admin/assets/AssetCategories')
const { default: AssetCategoryForm } = await import('../pages/admin/assets/AssetCategoryForm')

const LARGE = { id: 'large', name: 'Large', code: 'large', is_active: true }
const XL = { id: 'xl', name: 'XL', code: 'xl', is_active: true }
const SUV = { id: 'suv', name: 'SUV', vehicle_size_id: 'large', vehicle_size: LARGE, is_active: true }
const VIP = { id: 'vip', name_en: 'Car Wash VIP', is_active: true }

function quote({ addonIds = [], available = true } = {}) {
  const lines = available ? [{ kind: 'SERVICE', id: 'vip', label: 'Car Wash VIP', price: '50.00' }] : []
  if (available && addonIds.includes('tyre')) lines.push({ kind: 'ADDON', id: 'tyre', label: 'Tyre Shine', price: '8.00' })
  return {
    available,
    vehicle_size: available ? LARGE : XL,
    addons: available ? [{ id: 'tyre', name_en: 'Tyre Shine', price: '8.00' }] : [],
    lines,
    total: available ? (addonIds.includes('tyre') ? '58.00' : '50.00') : null,
    message: available ? null : 'Car Wash VIP is not available for XL vehicles.',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getVehicleTypes.mockResolvedValue([SUV])
  api.getVehicleSizes.mockResolvedValue([LARGE, XL])
  api.getServices.mockResolvedValue([VIP])
})

describe('Price simulator', () => {
  it('picks the size from the vehicle type and totals the chosen add-ons', async () => {
    api.getPriceQuote.mockImplementation(async ({ addonIds }) => quote({ addonIds }))
    render(<MemoryRouter><PriceSimulator /></MemoryRouter>)

    fireEvent.change(await screen.findByLabelText(/Vehicle type/), { target: { value: 'suv' } })
    expect(screen.getByLabelText(/^Size/)).toHaveValue('large')
    expect(screen.getByText('Large', { selector: 'strong' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Service/), { target: { value: 'vip' } })
    fireEvent.click(await screen.findByLabelText(/Tyre Shine/))

    await waitFor(() => expect(api.getPriceQuote).toHaveBeenLastCalledWith({
      serviceId: 'vip', vehicleSizeId: 'large', addonIds: ['tyre'],
    }))
    expect(await screen.findByText('58.00')).toBeInTheDocument()
  })

  it('says when the service is not available for the size', async () => {
    api.getPriceQuote.mockResolvedValue(quote({ available: false }))
    render(<MemoryRouter><PriceSimulator /></MemoryRouter>)

    fireEvent.change(await screen.findByLabelText(/^Size/), { target: { value: 'xl' } })
    fireEvent.change(screen.getByLabelText(/^Service/), { target: { value: 'vip' } })
    expect(await screen.findByText('Car Wash VIP is not available for XL vehicles.')).toBeInTheDocument()
  })
})

describe('Categories', () => {
  it('shows service-style cards with display order, price range and source', async () => {
    api.getServiceCategories.mockResolvedValue([
      { id: 'c1', title_en: 'Wash', title_ar: 'غسيل', is_active: true, display_order: 1, price_source: 'AUTO', price_from: '25.00', price_to: '55.00', services_count: 4, active_services_count: 3 },
      { id: 'c2', title_en: 'Detailing', is_active: false, display_order: 2, price_source: 'MANUAL', price_from: '100.00', price_to: '100.00', services_count: 0, active_services_count: 0 },
    ])
    render(<MemoryRouter><AssetCategories /></MemoryRouter>)

    expect(await screen.findByText('Wash')).toBeInTheDocument()
    expect(screen.getAllByText('No image').length).toBeGreaterThan(0)
    expect(screen.getByText('Display order #1')).toBeInTheDocument()
    expect(screen.getByText('Automatic')).toBeInTheDocument()
    expect(screen.getByText('Manual override')).toBeInTheDocument()
    expect(screen.getByText('(3 active)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Wash' })).toBeInTheDocument()
  })

  it('saves a manual price range and display order', async () => {
    api.getServiceCategories.mockResolvedValue([
      { id: 'c1', title_en: 'Wash', title_ar: 'Wash', is_active: true, display_order: 1, price_source: 'AUTO', price_from: '25.00', price_to: '55.00' },
    ])
    api.updateServiceCategory.mockResolvedValue({})
    render(
      <MemoryRouter initialEntries={['/admin/assets/c1/edit']}>
        <Routes>
          <Route path="/admin/assets/:categoryId/edit" element={<AssetCategoryForm />} />
          <Route path="/admin/assets" element={<p>list</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/25\.00/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Display order'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('radio', { name: /Manual override/ }))
    fireEvent.change(screen.getByLabelText(/Price from/), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(/Price to/), { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/cannot be more than/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Price to/), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.updateServiceCategory).toHaveBeenCalledWith('c1', expect.objectContaining({
      displayOrder: 5, priceSource: 'MANUAL', priceFrom: '60.00', priceTo: '90.00',
    })))
  })
})

describe('No delete on services or categories', () => {
  it('categories: Deactivate asks first, then saves is_active false', async () => {
    api.getServiceCategories.mockResolvedValue([
      { id: 'c1', title_en: 'Wash', is_active: true, display_order: 1 },
      { id: 'c2', title_en: 'Old', is_active: false, display_order: 2 },
    ])
    api.updateServiceCategory.mockResolvedValue({})
    render(<MemoryRouter><AssetCategories /></MemoryRouter>)

    await screen.findByText('Wash')
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Activate Old' }))
    await waitFor(() => expect(api.updateServiceCategory).toHaveBeenCalledWith('c2', { isActive: true }))

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Wash' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Deactivate'))
    await waitFor(() => expect(api.updateServiceCategory).toHaveBeenCalledWith('c1', { isActive: false }))
  })

  it('services: Deactivate replaces Delete', async () => {
    const { default: ServiceManagement } = await import('../pages/admin/services/ServiceManagement')
    api.getServices.mockResolvedValue([{ id: 's1', name_en: 'Car Wash', category_id: 'c1', base_price: '25', is_active: true }])
    api.getServiceCategories.mockResolvedValue([{ id: 'c1', title_en: 'Wash' }])
    api.updateService.mockResolvedValue({})
    render(<MemoryRouter><ServiceManagement /></MemoryRouter>)

    await screen.findByText('Car Wash')
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Car Wash' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Deactivate'))
    await waitFor(() => expect(api.updateService).toHaveBeenCalledWith('s1', { isActive: false }))
    expect(await screen.findByRole('button', { name: 'Activate Car Wash' })).toBeInTheDocument()
  })
})
