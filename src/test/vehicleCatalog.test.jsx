import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api', async (importOriginal) => {
  const real = await importOriginal()
  return Object.fromEntries(Object.keys(real).map((k) => [k, vi.fn(async () => [])]))
})
vi.mock('../contexts/PermissionsContext', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

const api = await import('../api')
const { default: VehicleCatalog } = await import('../pages/admin/assets/VehicleCatalog')

const MAKES = [
  { id: 'toyota', name: 'Toyota', name_ar: 'تويوتا', is_active: true, models_count: 2 },
  { id: 'kia', name: 'Kia', name_ar: 'كيا', is_active: true, models_count: 0 },
]
const SEDAN = { id: 'sedan', name: 'Sedan', is_active: true, vehicle_size: { name: 'Medium' } }
const TOYOTA_MODELS = [
  { id: 'camry', make_id: 'toyota', name: 'Camry', name_ar: 'كامري', is_active: true, vehicle_type_id: 'sedan', vehicle_type: SEDAN },
  { id: 'hilux', make_id: 'toyota', name: 'Hilux', name_ar: null, is_active: true, vehicle_type_id: null, vehicle_type: null },
]

beforeEach(() => {
  vi.clearAllMocks()
  api.getVehicleMakes.mockResolvedValue(MAKES)
  api.getVehicleTypes.mockResolvedValue([SEDAN])
  api.getVehicleModels.mockImplementation(async ({ makeId }) => (makeId === 'toyota' ? TOYOTA_MODELS : []))
})

describe('Vehicles (makes & models)', () => {
  it('lists makes and the first make’s models with their vehicle type', async () => {
    render(<MemoryRouter><VehicleCatalog /></MemoryRouter>)
    expect(await screen.findByText('Camry')).toBeInTheDocument()
    expect(screen.getByText('كامري')).toBeInTheDocument()
    expect(screen.getByText('Sedan')).toBeInTheDocument()
    expect(screen.getByText('Not set')).toBeInTheDocument()
    expect(api.getVehicleModels).toHaveBeenCalledWith({ makeId: 'toyota' })

    fireEvent.click(screen.getByRole('button', { name: /Kia/ }))
    expect(await screen.findByText('No models for this make yet.')).toBeInTheDocument()
  })

  it('adds a model with Arabic name and vehicle type', async () => {
    api.createVehicleModel.mockResolvedValue({ id: 'yaris', make_id: 'toyota' })
    render(<MemoryRouter><VehicleCatalog /></MemoryRouter>)
    await screen.findByText('Camry')

    fireEvent.click(screen.getAllByRole('button', { name: /Add Model/ })[0])
    const dialog = await screen.findByRole('dialog', { name: 'Add model' })
    expect(dialog).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^Model name \*/), { target: { value: 'Yaris' } })
    fireEvent.change(screen.getByLabelText(/^Model name \(Arabic\)/), { target: { value: 'يارس' } })
    fireEvent.change(screen.getByLabelText('Vehicle type'), { target: { value: 'sedan' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(api.createVehicleModel).toHaveBeenCalledWith({
      name: 'Yaris', name_ar: 'يارس', make_id: 'toyota', vehicle_type_id: 'sedan',
    }))
  })

  it('deactivates a model', async () => {
    api.updateVehicleModel.mockResolvedValue({ is_active: false })
    render(<MemoryRouter><VehicleCatalog /></MemoryRouter>)
    await screen.findByText('Camry')
    fireEvent.click(screen.getAllByRole('button', { name: /^Deactivate$/ })[0])
    await waitFor(() => expect(api.updateVehicleModel).toHaveBeenCalledWith('camry', { is_active: false }))
  })

  it('shows the app search results', async () => {
    api.searchVehicleCatalog.mockResolvedValue([
      { make: { id: 'toyota' }, model: { id: 'camry' }, label: 'Toyota Camry', label_ar: 'تويوتا كامري',
        vehicle_type: { name: 'Sedan', vehicle_size_name: 'Medium' } },
    ])
    render(<MemoryRouter><VehicleCatalog /></MemoryRouter>)
    fireEvent.change(await screen.findByLabelText('Try the app search'), { target: { value: 'toy cam' } })
    expect(await screen.findByText('Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText('Sedan · Medium')).toBeInTheDocument()
    expect(api.searchVehicleCatalog).toHaveBeenCalledWith('toy cam')
  })
})
