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
const { default: VehicleSizes } = await import('../pages/admin/assets/VehicleSizes')
const { default: VehicleSizeForm } = await import('../pages/admin/assets/VehicleSizeForm')
const { suggestCode } = await import('../pages/admin/assets/vehicleSizeCode')

const SIZES = [
  { id: 'a', name: 'Large', code: 'large', display_order: 3, is_active: true },
  { id: 'b', name: 'Small', code: 'small', display_order: 1, is_active: false },
]

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/admin/assets/vehicle-sizes/add']}>
      <Routes>
        <Route path="/admin/assets/vehicle-sizes/add" element={<VehicleSizeForm />} />
        <Route path="/admin/assets/vehicle-sizes" element={<p>list page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('suggestCode', () => {
  it('turns a name into a lowercase a-z0-9_ code', () => {
    expect(suggestCode('Large')).toBe('large')
    expect(suggestCode('Extra Large (XL)')).toBe('extra_large_xl')
    expect(suggestCode('  SUV / 4x4 ')).toBe('suv_4x4')
  })
})

describe('Vehicle Size Master list', () => {
  it('shows the table columns and rows', async () => {
    api.getVehicleSizes.mockResolvedValue(SIZES)
    render(<MemoryRouter><VehicleSizes /></MemoryRouter>)
    expect(await screen.findByText('Large')).toBeInTheDocument()
    for (const col of ['Name', 'Code', 'Display Order', 'Status', 'Actions']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(col) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /Add New Size/ })).toBeInTheDocument()
    expect(screen.getByText('2 sizes · 1 active')).toBeInTheDocument()
  })

  it('toggles status from the table', async () => {
    api.getVehicleSizes.mockResolvedValue(SIZES)
    api.setVehicleSizeStatus.mockResolvedValue({})
    render(<MemoryRouter><VehicleSizes /></MemoryRouter>)
    await screen.findByText('Small')
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches.find((s) => s.getAttribute('aria-checked') === 'false'))
    await waitFor(() => expect(api.setVehicleSizeStatus).toHaveBeenCalledWith('b', true))
  })
})

describe('Add New Size form', () => {
  it('suggests the code from the name, defaults display order to the end, and saves', async () => {
    api.getVehicleSizes.mockResolvedValue(SIZES)
    api.createVehicleSize.mockResolvedValue({ id: 'c' })
    renderForm()
    const name = await screen.findByLabelText(/^Name \*/)
    await waitFor(() => expect(screen.getByLabelText(/Display order/)).toHaveValue(4))
    fireEvent.change(name, { target: { value: 'Extra Large' } })
    expect(screen.getByLabelText(/Code/)).toHaveValue('extra_large')
    fireEvent.change(screen.getByLabelText(/^Name \(Arabic\)/), { target: { value: ' كبير جداً ' } })
    expect(screen.getByLabelText(/^Name \(Arabic\)/)).toHaveAttribute('dir', 'rtl')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.createVehicleSize).toHaveBeenCalledWith({
      name: 'Extra Large', name_ar: 'كبير جداً', code: 'extra_large', display_order: 4, is_active: true,
    }))
    expect(await screen.findByText('list page')).toBeInTheDocument()
  })

  it('rejects an invalid code before calling the API', async () => {
    renderForm()
    fireEvent.change(await screen.findByLabelText(/^Name \*/), { target: { value: 'Big' } })
    fireEvent.change(screen.getByLabelText(/Code/), { target: { value: 'big-one' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(/lowercase letters, digits and underscores/)).toBeInTheDocument()
    expect(api.createVehicleSize).not.toHaveBeenCalled()
  })

  it('shows "Code already exists" under the code field on a 409', async () => {
    api.createVehicleSize.mockRejectedValue(Object.assign(new Error('Code already exists'), { status: 409 }))
    renderForm()
    fireEvent.change(await screen.findByLabelText(/^Name \*/), { target: { value: 'Large' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Code already exists')).toBeInTheDocument()
  })
})
