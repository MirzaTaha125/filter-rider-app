import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../api', async (importOriginal) => {
  const real = await importOriginal()
  return Object.fromEntries(Object.keys(real).map((k) => [k, vi.fn(async () => [])]))
})
vi.mock('../api/upload', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, uploadImage: vi.fn() }
})

const api = await import('../api')
const upload = await import('../api/upload')
const { default: ServiceForm } = await import('../pages/admin/services/ServiceForm')
const { default: AssetCategoryForm } = await import('../pages/admin/assets/AssetCategoryForm')

const SERVICE = {
  id: 'svc1', name_en: 'Car Wash', category_id: 'cat1', base_price: '25.00',
  duration_min: 30, is_active: true, image_url: 'https://cdn.test/services/old.jpg',
}

function at(path, pattern, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={element} />
        <Route path="/admin/services" element={<p>services list</p>} />
        <Route path="/admin/assets" element={<p>categories list</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getServiceCategories.mockResolvedValue([{ id: 'cat1', title_en: 'Wash', title_ar: 'Wash', is_active: true, display_order: 1 }])
  api.getServices.mockResolvedValue([SERVICE])
})

describe('Service image', () => {
  beforeEach(() => {
    api.getServiceSizePrices.mockResolvedValue([
      { vehicle_size_id: 's', name: 'Small', code: 'small', is_active: true, price: '25.00', price_active: true },
    ])
  })

  it('shows the current image, replaces it by upload and saves the new URL', async () => {
    upload.uploadImage.mockResolvedValue('https://cdn.test/services/new.jpg')
    api.updateService.mockResolvedValue(SERVICE)
    const { container } = at('/admin/services/svc1/edit', '/admin/services/:serviceId/edit', <ServiceForm />)

    await screen.findByText('Image upload')
    expect(container.querySelector('.iu-preview img')).toHaveAttribute('src', SERVICE.image_url)

    const file = new File(['x'], 'car.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Image upload'), { target: { files: [file] } })
    await waitFor(() => expect(upload.uploadImage).toHaveBeenCalledWith(file, 'services'))
    await waitFor(() => expect(container.querySelector('.iu-preview img')).toHaveAttribute('src', 'https://cdn.test/services/new.jpg'))

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.updateService).toHaveBeenCalledWith('svc1', expect.objectContaining({
      imageUrl: 'https://cdn.test/services/new.jpg',
    })))
  })

  it('removing the image saves null', async () => {
    api.updateService.mockResolvedValue(SERVICE)
    at('/admin/services/svc1/edit', '/admin/services/:serviceId/edit', <ServiceForm />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    expect(screen.getByText('Upload image')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.updateService).toHaveBeenCalledWith('svc1', expect.objectContaining({ imageUrl: null })))
  })

  it('shows an upload error under the field', async () => {
    upload.uploadImage.mockRejectedValue(new Error('The image must be 5 MB or smaller.'))
    at('/admin/services/svc1/edit', '/admin/services/:serviceId/edit', <ServiceForm />)

    await screen.findByText('Image upload')
    fireEvent.change(screen.getByLabelText('Image upload'), { target: { files: [new File(['x'], 'big.png', { type: 'image/png' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('The image must be 5 MB or smaller.')
  })
})

describe('Category image', () => {
  it('uploads into the categories folder and creates the category with it', async () => {
    upload.uploadImage.mockResolvedValue('https://cdn.test/service-categories/wash.jpg')
    api.createServiceCategory.mockResolvedValue({ id: 'new' })
    at('/admin/assets/add', '/admin/assets/add', <AssetCategoryForm />)

    fireEvent.change(await screen.findByLabelText(/Name \(English\)/), { target: { value: 'Detailing' } })
    fireEvent.change(screen.getByLabelText('Category image'), { target: { files: [new File(['x'], 'd.webp', { type: 'image/webp' })] } })
    await waitFor(() => expect(upload.uploadImage).toHaveBeenCalledWith(expect.any(File), 'service-categories'))
    await screen.findByRole('button', { name: /Change/ })

    fireEvent.click(screen.getByRole('button', { name: 'Create category' }))
    await waitFor(() => expect(api.createServiceCategory).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Detailing', imageUrl: 'https://cdn.test/service-categories/wash.jpg',
    })))
  })

  it('uploads a custom icon image and saves the URL as icon', async () => {
    upload.uploadImage.mockResolvedValue('https://cdn.test/service-categories/icon.png')
    api.createServiceCategory.mockResolvedValue({ id: 'new' })
    at('/admin/assets/add', '/admin/assets/add', <AssetCategoryForm />)

    fireEvent.change(await screen.findByLabelText(/Name \(English\)/), { target: { value: 'Detailing' } })
    fireEvent.change(screen.getByLabelText('Custom icon'), {
      target: { files: [new File(['x'], 'icon.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(upload.uploadImage).toHaveBeenCalledWith(expect.any(File), 'service-categories'))

    fireEvent.click(screen.getByRole('button', { name: 'Create category' }))
    await waitFor(() => expect(api.createServiceCategory).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Detailing',
      icon: 'https://cdn.test/service-categories/icon.png',
    })))
  })
})
