import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Bold, Italic, List } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getServiceCategories,
  getServices,
  createService,
  updateService,
  getVehicleSizes,
  getServiceSizePrices,
  getServiceChecklist,
  getServiceAddons,
  updateServiceAddon,
} from '../../../api'
import { DEFAULT_SERVICE_ICON } from './serviceIcons'
import ImageUploadField from '../../../components/ImageUpload/ImageUploadField'
import '../adminForm.css'
import './ServiceForm.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'
import ArabicField from '../../../components/ArabicField/ArabicField'

const EMPTY_FORM = {
  name_en: '',
  name_ar: '',
  category_id: '',
  short_description: '',
  short_description_ar: '',
  duration_min: '',
  display_order: '1',
  is_addon: false,
  is_active: true,
  image_url: null,
  icon: DEFAULT_SERVICE_ICON,
  icon_color: '#FCC245',
}

const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function escapeHtml(value) {
  return value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))
}

function checklistToHtml(items, key = 'title') {
  const titles = toArray(items)
    .map((item) => (item?.[key] ?? '').toString().trim())
    .filter(Boolean)
  if (titles.length === 0) return ''
  return `<ul>${titles.map((title) => `<li>${escapeHtml(title)}</li>`).join('')}</ul>`
}

function RichTextEditor({
  initialHtml,
  onChange,
  disabled,
  dir,
  label = 'Long description',
  placeholder = 'List what this service includes',
}) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml || ''
  }, [initialHtml])

  const run = (command) => {
    ref.current?.focus()
    document.execCommand(command)
    onChange(ref.current?.innerHTML ?? '')
  }

  return (
    <div className={`rte ${disabled ? 'is-disabled' : ''}`}>
      <div className="rte-toolbar" role="toolbar" aria-label="Description formatting">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('bold')} disabled={disabled} aria-label="Bold">
          <Bold size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('italic')} disabled={disabled} aria-label="Italic">
          <Italic size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('insertUnorderedList')} disabled={disabled} aria-label="Bullet list">
          <List size={14} />
          <span>List</span>
        </button>
      </div>
      <div
        ref={ref}
        className="rte-editor"
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        dir={dir}
        lang={dir === 'rtl' ? 'ar' : undefined}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  )
}

function ServiceForm() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(serviceId)

  const [form, setForm] = useState(EMPTY_FORM)
  const [description, setDescription] = useState('')
  const [descriptionSeed, setDescriptionSeed] = useState('')
  // Arabic long description: its bullets are the Arabic "what's included"
  // titles, matched to the English bullets by position.
  const [descriptionAr, setDescriptionAr] = useState('')
  const [descriptionArSeed, setDescriptionArSeed] = useState('')
  const [categories, setCategories] = useState([])
  const [activeSizes, setActiveSizes] = useState([])
  const [priceRows, setPriceRows] = useState([])
  const [sizeQuery, setSizeQuery] = useState('')
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [priceErrors, setPriceErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [undo, setUndo] = useState(null)
  const [addonOptions, setAddonOptions] = useState([])
  const [selectedAddonIds, setSelectedAddonIds] = useState([])
  const undoTimer = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [cats, services, sizes, priced, checklist] = await Promise.all([
        getServiceCategories(true),
        getServices(null, true),
        getVehicleSizes(),
        isEdit ? getServiceSizePrices(serviceId) : Promise.resolve([]),
        isEdit ? getServiceChecklist(serviceId).catch(() => []) : Promise.resolve([]),
      ])

      const catList = toArray(cats)
      setCategories(catList)
      setActiveSizes(toArray(sizes).filter((size) => size.is_active))

      const serviceList = toArray(services)
      const addonLists = await Promise.allSettled(
        serviceList.map((service) => getServiceAddons(service.id, true)),
      )
      const options = []
      serviceList.forEach((service, index) => {
        if (addonLists[index].status !== 'fulfilled') return
        for (const addon of toArray(addonLists[index].value)) {
          options.push({
            id: addon.id,
            name: addon.name_en || 'Add-on',
            price: addon.price,
            serviceId: addon.service_id || service.id,
            active: addon.is_active !== false,
          })
        }
      })
      setAddonOptions(options)
      if (isEdit) {
        const found = serviceList.find((service) => service.id === serviceId)
        if (!found) {
          setLoadError('Service not found')
          return
        }
        const html = (found.long_description || '').trim() || checklistToHtml(checklist)
        const htmlAr = (found.long_description_ar || '').trim() || checklistToHtml(checklist, 'title_ar')
        setForm({
          name_en: found.name_en ?? '',
          name_ar: found.name_ar ?? '',
          category_id: found.category_id ?? '',
          short_description: found.short_description ?? '',
          short_description_ar: found.short_description_ar ?? '',
          duration_min: String(found.duration_min ?? ''),
          display_order: String(found.display_order ?? 0),
          is_addon: found.is_addon === true || options.some((addon) => addon.serviceId === serviceId && addon.active),
          is_active: found.is_active !== false,
          image_url: found.image_url || null,
          icon: found.icon || DEFAULT_SERVICE_ICON,
          icon_color: found.icon_color || '#FCC245',
        })
        setDescription(html)
        setDescriptionSeed(html)
        setDescriptionAr(htmlAr)
        setDescriptionArSeed(htmlAr)
        setSelectedAddonIds(
          options
            .filter((addon) => addon.serviceId === serviceId && addon.active)
            .map((addon) => addon.id),
        )
        setPriceRows(
          toArray(priced)
            .filter((row) => row.price != null && row.price !== '')
            .map((row) => ({
              vehicle_size_id: row.vehicle_size_id,
              name: row.name,
              code: row.code,
              price: String(Number(row.price)),
              discounted: row.discounted_price == null || row.discounted_price === ''
                ? ''
                : String(Number(row.discounted_price)),
              active: row.price_active !== false,
            })),
        )
      } else {
        const nextOrder = serviceList.reduce(
          (max, service) => Math.max(max, Number(service.display_order) || 0),
          0,
        ) + 1
        setForm((current) => ({
          ...current,
          category_id: catList[0]?.id ?? '',
          display_order: String(nextOrder),
        }))
        setDescription('')
        setDescriptionSeed('')
        setDescriptionAr('')
        setDescriptionArSeed('')
        setPriceRows([])
        setSelectedAddonIds([])
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load service')
    } finally {
      setLoading(false)
    }
  }, [serviceId, isEdit])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => () => clearTimeout(undoTimer.current), [])

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: '' }))
    setFormError('')
  }

  const addedSizeIds = new Set(priceRows.map((row) => row.vehicle_size_id))
  const sizeMatches = activeSizes.filter((size) => {
    const term = sizeQuery.trim().toLowerCase()
    if (!term) return true
    return size.name.toLowerCase().includes(term) || String(size.code || '').toLowerCase().includes(term)
  })

  const addSize = (size) => {
    if (addedSizeIds.has(size.id)) return
    setPriceRows((rows) => [
      ...rows,
      {
        vehicle_size_id: size.id,
        name: size.name,
        code: size.code,
        price: '',
        discounted: '',
        active: true,
      },
    ])
    setSizeQuery('')
    setSizeMenuOpen(false)
    setFormError('')
  }

  const updateRow = (sizeId, patch) => {
    setPriceRows((rows) => rows.map((row) => (
      row.vehicle_size_id === sizeId ? { ...row, ...patch } : row
    )))
    setPriceErrors((prev) => ({ ...prev, [sizeId]: {} }))
    setFormError('')
  }

  const removeRow = (index) => {
    const row = priceRows[index]
    setPriceRows((rows) => rows.filter((_, i) => i !== index))
    setUndo({
      message: `${row.name} removed`,
      restore: () => setPriceRows((rows) => {
        if (rows.some((item) => item.vehicle_size_id === row.vehicle_size_id)) return rows
        const next = [...rows]
        next.splice(Math.min(index, next.length), 0, row)
        return next
      }),
    })
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setUndo(null), 4000)
  }

  const validatePrices = () => {
    const errors = {}
    for (const row of priceRows) {
      const price = row.price.trim()
      const discounted = row.discounted.trim()
      const rowErrors = {}
      if (!price) rowErrors.price = 'Price is required'
      else if (!PRICE_PATTERN.test(price) || Number(price) <= 0) {
        rowErrors.price = 'Greater than 0, up to 2 decimals'
      }
      if (discounted) {
        if (!PRICE_PATTERN.test(discounted) || Number(discounted) <= 0) {
          rowErrors.discounted = 'Greater than 0, up to 2 decimals'
        } else if (!rowErrors.price && Number(discounted) >= Number(price)) {
          rowErrors.discounted = 'Must be less than the price'
        }
      }
      if (Object.keys(rowErrors).length > 0) errors[row.vehicle_size_id] = rowErrors
    }
    return errors
  }

  const toggleAddon = (addonId) => {
    setSelectedAddonIds((current) => (
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId]
    ))
  }

  const syncAddonSelection = async (savedId) => {
    const chosen = new Set(form.is_addon ? selectedAddonIds : [])
    await Promise.all(addonOptions.map((addon) => {
      const onThisService = addon.serviceId === savedId
      const selected = chosen.has(addon.id)
      if (selected) {
        return updateServiceAddon(addon.id, { isActive: true, serviceId: savedId })
      }
      if (onThisService && addon.active) {
        return updateServiceAddon(addon.id, { isActive: false })
      }
      return Promise.resolve()
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextFieldErrors = {}
    if (!form.name_en.trim()) nextFieldErrors.name_en = 'Service name is required.'
    if (!form.name_ar.trim()) nextFieldErrors.name_ar = 'Arabic name is required.'
    if (!form.category_id) nextFieldErrors.category_id = 'Please select a category.'
    const duration = Number(form.duration_min)
    if (!Number.isInteger(duration) || duration < 1) {
      nextFieldErrors.duration_min = 'Duration must be a whole number of at least 1 minute.'
    }
    const order = Number(form.display_order)
    if (!Number.isInteger(order) || order < 0) {
      nextFieldErrors.display_order = 'Display order must be a whole number (0 or more).'
    }
    const nextPriceErrors = validatePrices()
    if (priceRows.length === 0) {
      setFieldErrors(nextFieldErrors)
      setFormError('Add a price for at least one vehicle size.')
      return
    }
    if (Object.keys(nextFieldErrors).length > 0 || Object.keys(nextPriceErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setPriceErrors(nextPriceErrors)
      setFormError('Check the fields marked below.')
      return
    }

    const payable = (row) => {
      const price = Number(row.price)
      const discounted = row.discounted.trim() === '' ? null : Number(row.discounted)
      if (row.active && discounted != null && discounted > 0 && discounted < price) return discounted
      return price
    }
    const activePays = priceRows.filter((row) => row.active).map(payable)
    const base = Math.min(...(activePays.length ? activePays : priceRows.map(payable)))

    setSaving(true)
    setFormError('')
    const payload = {
      categoryId: form.category_id,
      name: form.name_en.trim(),
      nameAr: form.name_ar.trim(),
      shortDescription: form.short_description.trim(),
      shortDescriptionAr: form.short_description_ar.trim(),
      longDescription: description.trim(),
      longDescriptionAr: descriptionAr.trim(),
      icon: form.icon,
      color: form.icon_color,
      basePrice: base.toFixed(2),
      duration: duration,
      displayOrder: order,
      isAddon: form.is_addon,
      isActive: form.is_active,
      imageUrl: form.image_url,
      sizePrices: priceRows.map((row) => ({
        vehicle_size_id: row.vehicle_size_id,
        price: Number(row.price).toFixed(2),
        discounted_price: row.discounted.trim() === '' ? null : Number(row.discounted).toFixed(2),
        is_active: row.active,
      })),
    }

    try {
      let savedId = serviceId
      if (isEdit) {
        await updateService(serviceId, payload)
      } else {
        const created = await createService(payload)
        savedId = created?.id
      }
      if (savedId) await syncAddonSelection(savedId)
      navigate('/admin/services')
    } catch (err) {
      setFormError(err.message || 'Failed to save service')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="service-form-page">
        <PageHeader title={isEdit ? 'Edit Service' : 'Add New Service'} />
        <PageShimmer />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="service-form-page">
        <PageHeader title={isEdit ? 'Edit Service' : 'Add New Service'} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load service</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/services')}>
            Back to services
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="service-form-page">
      <PageHeader
        title={isEdit ? 'Edit Service' : 'Add New Service'}
        subtitle={isEdit ? form.name_en : 'Create a new service in the catalog'}
      />

      <form className="sf-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="sf-alert" role="alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <div className="sf-pair">
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Section 1 – Basic Information</h2>
              <p>Name, category, and the description customers see as what’s included.</p>
            </header>

            <div className="sf-grid sf-grid--2">
              <div className="sf-field">
                <label htmlFor="name_en">Service name <span className="sf-req">*</span></label>
                <input
                  id="name_en"
                  type="text"
                  placeholder="Car Wash Normal"
                  value={form.name_en}
                  onChange={(e) => setField('name_en', e.target.value)}
                  disabled={saving}
                  maxLength={160}
                  aria-invalid={Boolean(fieldErrors.name_en)}
                />
                {fieldErrors.name_en && <span className="sf-hint sf-hint--warn">{fieldErrors.name_en}</span>}
              </div>
              <div className="sf-field">
                <label htmlFor="name_ar">Arabic name <span className="sf-req">*</span></label>
                <input
                  id="name_ar"
                  type="text"
                  dir="rtl"
                  placeholder="غسيل السيارة"
                  value={form.name_ar}
                  onChange={(e) => setField('name_ar', e.target.value)}
                  disabled={saving}
                  maxLength={160}
                  aria-invalid={Boolean(fieldErrors.name_ar)}
                />
                {fieldErrors.name_ar
                  ? <span className="sf-hint sf-hint--warn">{fieldErrors.name_ar}</span>
                  : <span className="sf-hint">Shown in the app when language is Arabic.</span>}
              </div>
            </div>

            <div className="sf-grid sf-grid--2">
              <div className="sf-field">
                <label htmlFor="category_id">Category <span className="sf-req">*</span></label>
                <select
                  id="category_id"
                  value={form.category_id}
                  onChange={(e) => setField('category_id', e.target.value)}
                  disabled={saving || categories.length === 0}
                  aria-invalid={Boolean(fieldErrors.category_id)}
                >
                  <option value="">Select a category…</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title_en}{cat.title_ar ? ` — ${cat.title_ar}` : ''}
                    </option>
                  ))}
                </select>
                {fieldErrors.category_id && <span className="sf-hint sf-hint--warn">{fieldErrors.category_id}</span>}
              </div>
              <div className="sf-field">
                <label htmlFor="duration_min">Duration <span className="sf-req">*</span></label>
                <div className="sf-input-affix sf-input-affix--suffix">
                  <input
                    id="duration_min"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="50"
                    value={form.duration_min}
                    onChange={(e) => setField('duration_min', e.target.value)}
                    disabled={saving}
                    aria-invalid={Boolean(fieldErrors.duration_min)}
                  />
                  <span className="sf-affix">min</span>
                </div>
                {fieldErrors.duration_min && <span className="sf-hint sf-hint--warn">{fieldErrors.duration_min}</span>}
              </div>
            </div>

            <div className="sf-field">
              <label htmlFor="short_description">Short description</label>
              <input
                id="short_description"
                type="text"
                placeholder="Exterior wash and dry"
                value={form.short_description}
                onChange={(e) => setField('short_description', e.target.value)}
                disabled={saving}
                maxLength={300}
              />
              <span className="sf-hint">Shown on service list cards.</span>
            </div>

            <ArabicField
              id="short_description_ar"
              label="Short description"
              placeholder="غسيل وتجفيف خارجي"
              value={form.short_description_ar}
              onChange={(value) => setField('short_description_ar', value)}
              disabled={saving}
              maxLength={300}
            />

            <div className="sf-field">
              <label>Long description / What’s included</label>
              <RichTextEditor
                key={descriptionSeed}
                initialHtml={descriptionSeed}
                onChange={setDescription}
                disabled={saving}
              />
              <span className="sf-hint">Use the list button. Each bullet is what the app shows as included.</span>
            </div>

            <div className="sf-field">
              <label>Long description / What’s included <span className="sf-optional">(Arabic)</span></label>
              <RichTextEditor
                key={`ar-${descriptionArSeed}`}
                initialHtml={descriptionArSeed}
                onChange={setDescriptionAr}
                disabled={saving}
                dir="rtl"
                label="Long description (Arabic)"
                placeholder="اكتب ما تشمله الخدمة"
              />
              <span className="sf-hint">
                Optional. Keep the bullets in the same order as the English list: the 1st Arabic bullet
                translates the 1st English one, and so on. Empty bullets show in English.
              </span>
            </div>

            <ImageUploadField
              label="Image upload"
              folder="services"
              value={form.image_url}
              onChange={(url) => setField('image_url', url)}
              disabled={saving}
              hint="Shown on the service in the app. A wide photo works best."
            />

            <div className="sf-field sf-field--narrow">
              <label htmlFor="display_order">Display order</label>
              <input
                id="display_order"
                type="number"
                min="0"
                step="1"
                value={form.display_order}
                onChange={(e) => setField('display_order', e.target.value)}
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.display_order)}
              />
              {fieldErrors.display_order && <span className="sf-hint sf-hint--warn">{fieldErrors.display_order}</span>}
            </div>

            <span className="sf-toggle-label">Is add-on?</span>
            <label className="sf-toggle">
              <input
                type="checkbox"
                checked={form.is_addon}
                onChange={(e) => setField('is_addon', e.target.checked)}
                disabled={saving}
              />
              <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
              <span className="sf-toggle-copy">
                <strong>{form.is_addon ? 'Yes' : 'No (main service)'}</strong>
                <em>{form.is_addon
                  ? 'Tick the add-ons this service should offer. Create new ones under Add-ons.'
                  : 'Turn this on to choose which add-ons this service offers.'}</em>
              </span>
            </label>
            {form.is_addon && (
              <div className="addon-picks">
                {addonOptions.length === 0 ? (
                  <p className="sf-extra-empty">
                    No add-ons yet. Create them under Add-ons, with a title and one price.
                  </p>
                ) : (
                  addonOptions.map((addon) => (
                    <label key={addon.id} className="addon-pick">
                      <input
                        type="checkbox"
                        checked={selectedAddonIds.includes(addon.id)}
                        onChange={() => toggleAddon(addon.id)}
                        disabled={saving}
                      />
                      <span className="addon-pick-title">{addon.name}</span>
                      <span className="addon-pick-price">
                        <span className="riyal-symbol">&#x20C1;</span>
                        {Number(addon.price || 0).toFixed(2)}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            <span className="sf-toggle-label">Status</span>
            <label className="sf-toggle">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setField('is_active', e.target.checked)}
                disabled={saving}
              />
              <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
              <span className="sf-toggle-copy">
                <strong>{form.is_active ? 'Active' : 'Inactive'}</strong>
                <em>Inactive services stay in the catalog but cannot be booked.</em>
              </span>
            </label>
          </section>

          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Section 2 – Price Index Matrix</h2>
              <p>Add each vehicle size once. Price is required. A discounted price must be lower.</p>
            </header>

            <div className="sf-field pm-add">
              <label htmlFor="add-size">Add size</label>
              <input
                id="add-size"
                type="text"
                role="combobox"
                aria-expanded={sizeMenuOpen}
                aria-controls="add-size-list"
                aria-autocomplete="list"
                placeholder="Type to search sizes…"
                value={sizeQuery}
                onChange={(e) => { setSizeQuery(e.target.value); setSizeMenuOpen(true) }}
                onFocus={() => setSizeMenuOpen(true)}
                onBlur={() => setTimeout(() => setSizeMenuOpen(false), 150)}
                disabled={saving || activeSizes.length === 0}
              />
              {sizeMenuOpen && (
                <ul id="add-size-list" className="pm-menu" role="listbox">
                  {sizeMatches.length === 0 ? (
                    <li className="pm-option is-empty">No matching sizes</li>
                  ) : sizeMatches.map((size) => {
                    const used = addedSizeIds.has(size.id)
                    return (
                      <li key={size.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={false}
                          aria-disabled={used}
                          className={`pm-option ${used ? 'is-used' : ''}`}
                          disabled={used}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addSize(size)}
                        >
                          <span>{size.name}</span>
                          {used && <em>Added</em>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {activeSizes.length === 0 && (
                <span className="sf-hint sf-hint--warn">No active vehicle sizes yet. Add one under Assets first.</span>
              )}
            </div>

            {priceRows.length === 0 ? (
              <p className="sf-extra-empty">No sizes yet. Search above and add the first one.</p>
            ) : (
              <div className="pm-table" role="table" aria-label="Price per vehicle size">
                <div className="pm-row pm-row--head" role="row">
                  <span role="columnheader">Size</span>
                  <span role="columnheader">Price (SAR) *</span>
                  <span role="columnheader">Discounted price</span>
                  <span role="columnheader">Active</span>
                  <span role="columnheader">Action</span>
                </div>
                {priceRows.map((row, index) => {
                  const errors = priceErrors[row.vehicle_size_id] || {}
                  return (
                    <div key={row.vehicle_size_id} className="pm-row" role="row">
                      <div className="pm-size" role="cell">
                        <strong>{row.name}</strong>
                        {row.code && <code>{row.code}</code>}
                      </div>
                      <div className="sf-field pm-money" role="cell">
                        <div className={`sf-input-affix ${errors.price ? 'is-invalid' : ''}`}>
                          <span className="sf-affix riyal-symbol">&#x20C1;</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            aria-label={`${row.name} price`}
                            value={row.price}
                            onChange={(e) => updateRow(row.vehicle_size_id, { price: e.target.value })}
                            disabled={saving}
                            aria-invalid={Boolean(errors.price)}
                          />
                        </div>
                        {errors.price && <span className="pm-error">{errors.price}</span>}
                      </div>
                      <div className="sf-field pm-money" role="cell">
                        <div className={`sf-input-affix ${errors.discounted ? 'is-invalid' : ''}`}>
                          <span className="sf-affix riyal-symbol">&#x20C1;</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="—"
                            aria-label={`${row.name} discounted price`}
                            value={row.discounted}
                            onChange={(e) => updateRow(row.vehicle_size_id, { discounted: e.target.value })}
                            disabled={saving}
                            aria-invalid={Boolean(errors.discounted)}
                          />
                        </div>
                        {errors.discounted && <span className="pm-error">{errors.discounted}</span>}
                      </div>
                      <div className="pm-active" role="cell">
                        <input
                          type="checkbox"
                          aria-label={`${row.name} active`}
                          checked={row.active}
                          onChange={(e) => updateRow(row.vehicle_size_id, { active: e.target.checked })}
                          disabled={saving}
                        />
                      </div>
                      <div role="cell">
                        <button
                          type="button"
                          className="pm-remove"
                          aria-label={`Remove ${row.name}`}
                          onClick={() => removeRow(index)}
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/services')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : 'Save'}
          </button>
        </div>
      </form>

      {undo && (
        <div className="sf-undo" role="status">
          <span>{undo.message}</span>
          <button
            type="button"
            onClick={() => {
              undo.restore()
              clearTimeout(undoTimer.current)
              setUndo(null)
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

export default ServiceForm
