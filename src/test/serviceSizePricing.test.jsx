import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../api', async (importOriginal) => {
  const real = await importOriginal()
  return Object.fromEntries(Object.keys(real).map((k) => [k, vi.fn(async () => [])]))
})

const api = await import('../api')
const { default: ServiceForm } = await import('../pages/admin/services/ServiceForm')
const { default: ServiceSettings } = await import('../pages/admin/services/ServiceSettings')

const CATEGORY = { id: 'cat1', title_en: 'Car Wash' }
const SERVICE = {
  id: 'svc1', name_en: 'Car Wash Normal', name_ar: '', category_id: 'cat1',
  base_price: '25.00', duration_min: 30, is_active: true,
}
const SIZE_ROWS = [
  { vehicle_size_id: 's', name: 'Small', code: 'small', is_active: true, price: null },
  { vehicle_size_id: 'm', name: 'Medium', code: 'medium', is_active: true, price: '30.00' },
  { vehicle_size_id: 'x', name: 'Old', code: 'old', is_active: false, price: '50.00' },
]

function renderAt(path, element, pattern) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={element} />
        <Route path="/admin/services" element={<p>services list</p>} />
        <Route path="/admin/services/:serviceId/edit" element={<p>edit page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getServiceCategories.mockResolvedValue([CATEGORY])
  api.getServices.mockResolvedValue([SERVICE])
})

describe('Edit service: price index matrix', () => {
  it('shows priced sizes only, the description fields, and no service types card', async () => {
    api.getServiceSizePrices.mockResolvedValue(SIZE_ROWS)
    renderAt('/admin/services/svc1/edit', <ServiceForm />, '/admin/services/:serviceId/edit')

    expect(await screen.findByText('Section 2 – Price Index Matrix')).toBeInTheDocument()
    expect(screen.getByLabelText('Short description')).toBeInTheDocument()
    expect(screen.getByLabelText('Long description')).toBeInTheDocument()
    expect(screen.queryByLabelText('Small price')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Medium price')).toHaveValue(30)
    expect(screen.getByLabelText('Old price')).toHaveValue(50)
    expect(screen.queryByText('Service types')).not.toBeInTheDocument()
  })

  it('saves the service and its size prices in one request', async () => {
    api.getServiceSizePrices.mockResolvedValue(SIZE_ROWS)
    api.updateService.mockResolvedValue(SERVICE)
    renderAt('/admin/services/svc1/edit', <ServiceForm />, '/admin/services/:serviceId/edit')

    fireEvent.change(await screen.findByLabelText('Medium price'), { target: { value: '27.5' } })
    fireEvent.change(screen.getByLabelText('Medium discounted price'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(api.updateService).toHaveBeenCalledWith('svc1', expect.objectContaining({
      sizePrices: [
        { vehicle_size_id: 'm', price: '27.50', discounted_price: '20.00', is_active: true },
        { vehicle_size_id: 'x', price: '50.00', discounted_price: null, is_active: true },
      ],
    })))
    expect(api.setServiceSizePrices).not.toHaveBeenCalled()
    expect(await screen.findByText('services list')).toBeInTheDocument()
  })

  it('blocks an invalid size price before saving anything', async () => {
    api.getServiceSizePrices.mockResolvedValue(SIZE_ROWS)
    renderAt('/admin/services/svc1/edit', <ServiceForm />, '/admin/services/:serviceId/edit')

    fireEvent.change(await screen.findByLabelText('Medium price'), { target: { value: '1.234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Greater than 0, up to 2 decimals')).toBeInTheDocument()
    expect(api.updateService).not.toHaveBeenCalled()
  })

  it('new service: adds an active size and saves prices with the service', async () => {
    api.getVehicleSizes.mockResolvedValue([
      { id: 's', name: 'Small', code: 'small', is_active: true },
      { id: 'off', name: 'Hidden', code: 'hidden', is_active: false },
    ])
    api.createService.mockResolvedValue({ id: 'new1' })
    renderAt('/admin/services/add', <ServiceForm />, '/admin/services/add')

    fireEvent.change(await screen.findByLabelText(/^Service name/), { target: { value: 'Polish' } })
    fireEvent.change(screen.getByLabelText(/^Duration/), { target: { value: '45' } })
    fireEvent.change(screen.getByLabelText('Short description'), { target: { value: 'Exterior wash and dry' } })
    fireEvent.focus(screen.getByLabelText('Add size'))
    expect(screen.queryByRole('option', { name: /Hidden/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Small' }))
    fireEvent.change(screen.getByLabelText('Small price'), { target: { value: '35' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(api.createService).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Polish',
      shortDescription: 'Exterior wash and dry',
      duration: 45,
      sizePrices: [
        { vehicle_size_id: 's', price: '35.00', discounted_price: null, is_active: true },
      ],
    })))
    expect(api.setServiceSizePrices).not.toHaveBeenCalled()
  })
})

describe('Service settings: checklist belongs to the service', () => {
  it('lists and adds checklist items without any service type', async () => {
    api.getServiceChecklist.mockResolvedValue([
      { id: 'c1', title: 'Exterior wash', is_active: true },
    ])
    api.createServiceChecklistItem.mockResolvedValue({ id: 'c2', title: 'Tyre shine', is_active: true })
    renderAt('/admin/services/svc1/settings', <ServiceSettings />, '/admin/services/:serviceId/settings')

    fireEvent.click(await screen.findByRole('tab', { name: /Checklist/ }))
    expect(screen.getByText('Exterior wash')).toBeInTheDocument()
    expect(screen.queryByText(/service type/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Add a checklist item…'), { target: { value: 'Tyre shine' } })
    fireEvent.change(screen.getByLabelText('Checklist item (Arabic, optional)'), { target: { value: 'تلميع الإطارات' } })
    fireEvent.click(screen.getByRole('button', { name: /Add item/ }))
    await waitFor(() => expect(api.createServiceChecklistItem).toHaveBeenCalledWith('svc1', 'Tyre shine', 'تلميع الإطارات'))
    expect(await screen.findByText('Tyre shine')).toBeInTheDocument()
  })
})
