import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../api', async (importOriginal) => {
  const real = await importOriginal()
  return Object.fromEntries(Object.keys(real).map((k) => [k, vi.fn(async () => [])]))
})
vi.mock('../contexts/PermissionsContext', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

const api = await import('../api')
const { default: VehicleTypes } = await import('../pages/admin/assets/VehicleTypes')
const { default: VehicleTypeForm } = await import('../pages/admin/assets/VehicleTypeForm')

const SIZES = [
  { id: 'large', name: 'Large', code: 'large', display_order: 3, is_active: true },
  { id: 'small', name: 'Small', code: 'small', display_order: 1, is_active: true },
  { id: 'old', name: 'Old size', code: 'old', display_order: 9, is_active: false },
]
const TYPES = [
  { id: 't1', name: 'SUV', vehicle_size_id: 'large', vehicle_size: SIZES[0], display_order: 10, is_active: true },
  { id: 't2', name: 'Coupe', vehicle_size_id: 'old', vehicle_size: SIZES[2], display_order: 20, is_active: false },
]

function renderForm(path = '/admin/assets/vehicle-types/add') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/assets/vehicle-types/add" element={<VehicleTypeForm />} />
        <Route path="/admin/assets/vehicle-types/:typeId/edit" element={<VehicleTypeForm />} />
        <Route path="/admin/assets/vehicle-types" element={<p>list page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Vehicle type size mapping list', () => {
  it('shows the columns, linked size and status', async () => {
    api.getVehicleTypes.mockResolvedValue(TYPES)
    render(<MemoryRouter><VehicleTypes /></MemoryRouter>)
    expect(await screen.findByText('SUV')).toBeInTheDocument()
    for (const col of ['Vehicle Type', 'Linked Size', 'Display Order', 'Status', 'Actions']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(col) })).toBeInTheDocument()
    }
    expect(screen.getByText('Large')).toBeInTheDocument()
    expect(screen.getByText('Size inactive')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add Vehicle Type/ })).toBeInTheDocument()
  })

  it('asks before deactivating, and activates straight away', async () => {
    api.getVehicleTypes.mockResolvedValue(TYPES)
    api.setVehicleTypeStatus.mockResolvedValue({})
    render(<MemoryRouter><VehicleTypes /></MemoryRouter>)
    await screen.findByText('SUV')

    fireEvent.click(screen.getByRole('button', { name: /^Activate$/ }))
    await waitFor(() => expect(api.setVehicleTypeStatus).toHaveBeenCalledWith('t2', true))

    fireEvent.click(screen.getAllByRole('button', { name: /^Deactivate$/ })[0])
    expect(api.setVehicleTypeStatus).toHaveBeenCalledTimes(1)
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Deactivate'))
    await waitFor(() => expect(api.setVehicleTypeStatus).toHaveBeenCalledWith('t1', false))
  })
})

describe('Add Vehicle Type form', () => {
  it('lists only active sizes and saves the mapping', async () => {
    api.getVehicleSizes.mockResolvedValue(SIZES)
    api.getVehicleTypes.mockResolvedValue(TYPES)
    api.createVehicleType.mockResolvedValue({ id: 't3' })
    renderForm()

    const size = await screen.findByLabelText(/Size/)
    const options = Array.from(size.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).toEqual(['Select a size…', 'Large', 'Small'])
    expect(screen.getByLabelText(/Display order/)).toHaveValue(21)

    fireEvent.change(screen.getByLabelText(/^Vehicle type name \*/), { target: { value: 'Sedan' } })
    fireEvent.change(size, { target: { value: 'small' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.createVehicleType).toHaveBeenCalledWith({
      name: 'Sedan', name_ar: '', vehicle_size_id: 'small', display_order: 21, is_active: true,
    }))
    expect(await screen.findByText('list page')).toBeInTheDocument()
  })

  it('requires a size and a case-insensitive unique name', async () => {
    api.getVehicleSizes.mockResolvedValue(SIZES)
    api.getVehicleTypes.mockResolvedValue(TYPES)
    renderForm()
    fireEvent.change(await screen.findByLabelText(/^Vehicle type name \*/), { target: { value: 'suv' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Vehicle type name already exists')).toBeInTheDocument()
    expect(screen.getByText('Size is required.')).toBeInTheDocument()
    expect(api.createVehicleType).not.toHaveBeenCalled()
  })

  it('keeps an inactive current size selectable when editing', async () => {
    api.getVehicleSizes.mockResolvedValue(SIZES)
    api.getVehicleTypes.mockResolvedValue(TYPES)
    api.getVehicleType.mockResolvedValue(TYPES[1])
    renderForm('/admin/assets/vehicle-types/t2/edit')
    const size = await screen.findByLabelText(/Size/)
    expect(size).toHaveValue('old')
    expect(screen.getByText(/This size is inactive/)).toBeInTheDocument()
  })
})
