import { useState, useEffect, useRef } from "react";
import { useSocket } from '../../../contexts/SocketContext';
import {
  Plus,
  Edit,
  Settings,
  Trash2,
  Car,
  Home,
  CheckCircle,
  XCircle,
  X,
  Package,
  Box,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  getServiceCategories,
  getServices,
  createService,
  updateService,
  deleteService,
  getServiceAddons,
  getServiceProperties,
  createServiceProperty,
  deleteServiceProperty,
  getServiceTypes,
  createServiceType,
  updateServiceType,
  getChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
} from "../../../api";
import "./ServiceManagement.css";

const ICON_MAP = { Car, Home, Package, Box, ShoppingBag, Truck };
const DEFAULT_ICON = Car;

function ServiceManagement() {
  const { catalogSocket } = useSocket()
  const [assetCategories, setAssetCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceProperties, setServiceProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState("");
  const [propertySaving, setPropertySaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    categoryId: "",
    icon: Car,
    color: "#3b82f6",
    basePrice: "",
    duration: "",
    isActive: true,
  });
  const [newProperty, setNewProperty] = useState({ name: "", type: "STRING" });
  const [serviceTypes, setServiceTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState(null);
  const [checklistItems, setChecklistItems] = useState({});
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({ name_en: "", name_ar: "", price_mode: "DELTA", price_value: "0", duration_min: "" });
  const [editingType, setEditingType] = useState(null);
  const [editTypeForm, setEditTypeForm] = useState({});
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [editingChecklistItemId, setEditingChecklistItemId] = useState(null);
  const [editChecklistTitle, setEditChecklistTitle] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const openConfirm = (message, onConfirm) => setConfirmModal({ message, onConfirm });
  const closeConfirm = () => setConfirmModal(null);

  const availableIcons = [
    { name: "Car", component: Car },
    { name: "Home", component: Home },
    { name: "Package", component: Package },
    { name: "Box", component: Box },
    { name: "ShoppingBag", component: ShoppingBag },
    { name: "Truck", component: Truck },
  ];

  const availableColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
  ];

  const toFrontendCategory = (item) => ({
    id: item.id,
    name: item.title_en || item.name,
    nameAr: item.title_ar || item.nameAr,
    color: item.icon_color || item.color || "#3b82f6",
  });

  const toFrontendService = (item) => ({
    id: item.id,
    name: item.name_en || item.name,
    nameAr: item.name_ar || item.nameAr,
    categoryId: item.category_id || item.categoryId,
    color: item.icon_color || item.color || "#3b82f6",
    icon: ICON_MAP[item.icon] || DEFAULT_ICON,
    basePrice: parseFloat(item.base_price || item.basePrice || 0),
    duration: parseInt(item.duration_min || item.duration || 60, 10),
    isActive: item.is_active !== false,
    addons: item.addons || [],
  });

  useEffect(() => {
    loadData();
  }, []);

  // Reload services/categories on any catalog change event
  useEffect(() => {
    if (!catalogSocket) return
    const CATALOG_EVENTS = [
      'catalog.category.created', 'catalog.category.updated', 'catalog.category.toggled',
      'catalog.service.created',  'catalog.service.updated',  'catalog.service.toggled',
      'catalog.pricing.created',  'catalog.pricing.updated',  'provider.services.updated',
    ]
    const handler = () => loadData()
    CATALOG_EVENTS.forEach((ev) => catalogSocket.on(ev, handler))
    return () => CATALOG_EVENTS.forEach((ev) => catalogSocket.off(ev, handler))
  }, [catalogSocket]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [cats, svcs] = await Promise.all([
        getServiceCategories(true),
        getServices(null, true),
      ]);
      const categories = (Array.isArray(cats) ? cats : []).map(
        toFrontendCategory
      );
      setAssetCategories(categories);
      let servicesList = (Array.isArray(svcs) ? svcs : []).map(
        toFrontendService
      );
      setServices(servicesList);
      setLoading(false);
      Promise.all(
        servicesList.map(async (s) => {
          try {
            const addons = await getServiceAddons(s.id, true);
            return { id: s.id, addons: Array.isArray(addons) ? addons : [] };
          } catch {
            return { id: s.id, addons: [] };
          }
        })
      ).then((addonsByService) => {
        const addonMap = Object.fromEntries(
          addonsByService.map((a) => [a.id, a.addons])
        );
        setServices((prev) =>
          prev.map((s) => ({ ...s, addons: addonMap[s.id] || [] }))
        );
      });
    } catch (err) {
      setError(err.message || "Failed to load data");
      setServices([]);
      setAssetCategories([]);
    } finally {
      setLoading(false);
    }
  }

  const openModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        nameAr: service.nameAr,
        categoryId: service.categoryId || assetCategories[0]?.id || "",
        icon: service.icon || Car,
        color: service.color || "#3b82f6",
        basePrice: String(service.basePrice ?? ""),
        duration: String(service.duration ?? ""),
        isActive: service.isActive,
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        nameAr: "",
        categoryId: assetCategories[0]?.id || "",
        icon: Car,
        color: "#3b82f6",
        basePrice: "",
        duration: "",
        isActive: true,
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setFormData({
      name: "",
      nameAr: "",
      categoryId: assetCategories[0]?.id || "",
      icon: Car,
      color: "#3b82f6",
      basePrice: "",
      duration: "",
      isActive: true,
    });
  };

  const openSettingsModal = async (service) => {
    setEditingService(service);
    setIsSettingsModalOpen(true);
    setServiceProperties([]);
    setPropertiesError("");
    setPropertiesLoading(true);
    setServiceTypes([]);
    setTypesError("");
    setTypesLoading(true);
    setActiveTypeTab(null);
    setChecklistItems({});

    try {
      const [props, types] = await Promise.all([
        getServiceProperties(service.id),
        getServiceTypes(service.id),
      ]);
      setServiceProperties(Array.isArray(props) ? props : []);
      setServiceTypes(Array.isArray(types) ? types : []);
      if (types.length > 0) {
        handleTypeTabClick(types[0].id);
      }
    } catch (err) {
      setPropertiesError(err.message || "Failed to load properties");
      setTypesError(err.message || "Failed to load service types");
    } finally {
      setPropertiesLoading(false);
      setTypesLoading(false);
    }
  };

  const handleTypeTabClick = async (typeId) => {
    setActiveTypeTab(typeId);
    if (!checklistItems[typeId]) {
      setChecklistLoading(true);
      try {
        const items = await getChecklistItems(typeId);
        setChecklistItems(prev => ({ ...prev, [typeId]: Array.isArray(items) ? items : [] }));
      } catch (err) {
        console.error("Failed to load checklist:", err);
      } finally {
        setChecklistLoading(false);
      }
    }
  };

  const handleAddServiceType = async () => {
    if (!newTypeForm.name_en.trim() || !editingService) return;
    setTypesLoading(true);
    try {
      const newType = await createServiceType({
        serviceId: editingService.id,
        name: newTypeForm.name_en.trim(),
        nameAr: newTypeForm.name_ar.trim() || newTypeForm.name_en.trim(),
        priceMode: newTypeForm.price_mode,
        priceValue: newTypeForm.price_value || "0",
        duration: newTypeForm.duration_min ? Number(newTypeForm.duration_min) : undefined,
        isActive: true,
      });
      setServiceTypes(prev => [...prev, newType]);
      setNewTypeForm({ name_en: "", name_ar: "", price_mode: "DELTA", price_value: "0", duration_min: "" });
      handleTypeTabClick(newType.id);
    } catch (err) {
      setTypesError(err.message || "Failed to add service type");
    } finally {
      setTypesLoading(false);
    }
  };

  const handleStartEditType = (type) => {
    setEditingType(type);
    setEditTypeForm({
      name_en: type.name_en || type.name || "",
      name_ar: type.name_ar || "",
      price_mode: type.price_mode || "DELTA",
      price_value: String(type.price_value ?? "0"),
      duration_min: String(type.duration_min ?? ""),
      is_active: type.is_active !== false,
    });
  };

  const handleUpdateType = async () => {
    if (!editingType) return;
    setTypesLoading(true);
    try {
      const updated = await updateServiceType(editingType.id, {
        name: editTypeForm.name_en.trim(),
        nameAr: editTypeForm.name_ar.trim(),
        priceMode: editTypeForm.price_mode,
        priceValue: editTypeForm.price_value,
        duration: editTypeForm.duration_min ? Number(editTypeForm.duration_min) : undefined,
        isActive: editTypeForm.is_active,
      });
      setServiceTypes(prev => prev.map(t => t.id === editingType.id ? { ...t, ...updated } : t));
      setEditingType(null);
      setEditTypeForm({});
    } catch (err) {
      setTypesError(err.message || "Failed to update service type");
    } finally {
      setTypesLoading(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim() || !activeTypeTab) return;
    setChecklistLoading(true);
    try {
      const newItem = await createChecklistItem(activeTypeTab, newChecklistItem.trim(), (checklistItems[activeTypeTab]?.length || 0));
      setChecklistItems(prev => ({
        ...prev,
        [activeTypeTab]: [...(prev[activeTypeTab] || []), newItem]
      }));
      setNewChecklistItem("");
    } catch (err) {
      showToast(err.message || "Failed to add checklist item", 'error');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleDeleteChecklistItem = (itemId) => {
    openConfirm("Delete this checklist item?", async () => {
      closeConfirm();
      try {
        await deleteChecklistItem(itemId);
        setChecklistItems(prev => ({
          ...prev,
          [activeTypeTab]: prev[activeTypeTab].filter(i => i.id !== itemId)
        }));
        showToast("Checklist item deleted.", 'success');
      } catch (err) {
        showToast(err.message || "Failed to delete checklist item", 'error');
      }
    });
  };

  const handleToggleChecklistItem = async (item) => {
    try {
      const updated = await toggleChecklistItem(item.id, !item.is_active);
      setChecklistItems(prev => ({
        ...prev,
        [activeTypeTab]: prev[activeTypeTab].map(i => i.id === item.id ? { ...i, ...updated } : i)
      }));
    } catch (err) {
      console.error("Failed to toggle checklist item:", err);
    }
  };

  const handleStartEditChecklist = (item) => {
    setEditingChecklistItemId(item.id);
    setEditChecklistTitle(item.title);
  };

  const handleUpdateChecklistItem = async (itemId) => {
    if (!editChecklistTitle.trim()) return;
    try {
      const updated = await updateChecklistItem(itemId, { title: editChecklistTitle.trim() });
      setChecklistItems(prev => ({
        ...prev,
        [activeTypeTab]: prev[activeTypeTab].map(i => i.id === itemId ? { ...i, ...updated } : i)
      }));
      setEditingChecklistItemId(null);
      setEditChecklistTitle("");
    } catch (err) {
      console.error("Failed to update checklist item:", err);
    }
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
    setEditingService(null);
    setServiceProperties([]);
    setNewProperty({ name: "", type: "STRING" });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingService) {
        await updateService(editingService.id, {
          name: formData.name,
          nameAr: formData.nameAr,
          categoryId: formData.categoryId,
          color: formData.color,
          basePrice: formData.basePrice,
          duration: formData.duration,
          isActive: formData.isActive,
        });
      } else {
        await createService({
          categoryId: formData.categoryId,
          name: formData.name,
          nameAr: formData.nameAr,
          color: formData.color,
          basePrice: formData.basePrice,
          duration: formData.duration,
          isActive: formData.isActive,
        });
      }
      await loadData();
      closeModal();
    } catch (err) {
      setError(err.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleAddProperty = async () => {
    if (!newProperty.name.trim() || !editingService) return;
    setPropertySaving(true);
    setPropertiesError("");
    try {
      await createServiceProperty({
        serviceId: editingService.id,
        name: newProperty.name.trim(),
        type: newProperty.type || "STRING",
      });
      const props = await getServiceProperties(editingService.id);
      setServiceProperties(Array.isArray(props) ? props : []);
      setNewProperty({ name: "", type: "STRING" });
    } catch (err) {
      setPropertiesError(err.message || "Failed to add property");
    } finally {
      setPropertySaving(false);
    }
  };

  const handleDeleteProperty = (propertyId) => {
    openConfirm("Delete this property?", async () => {
      closeConfirm();
      try {
        await deleteServiceProperty(propertyId);
        setServiceProperties((prev) => prev.filter((p) => p.id !== propertyId));
        showToast("Property deleted.", 'success');
      } catch (err) {
        showToast(err.message || "Failed to delete property", 'error');
      }
    });
  };

  const handleDelete = (service) => {
    openConfirm(`Delete "${service.name}"? This cannot be undone.`, async () => {
      closeConfirm();
      const prev = services;
      setServices((s) => s.filter((x) => x.id !== service.id));
      try {
        await deleteService(service.id);
        showToast(`"${service.name}" deleted successfully.`, 'success');
      } catch (err) {
        setServices(prev);
        showToast(err.message || "Failed to delete service", 'error');
      }
    });
  };

  return (
    <div className="service-management">
      {/* Toast */}
      {toast && (
        <div className={`svc-toast svc-toast--${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={17} /> : <XCircle size={17} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="svc-toast-close"><X size={15} /></button>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm</h3>
              <button className="modal-close-btn" onClick={closeConfirm}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: '#374151' }}>{confirmModal.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeConfirm}>Cancel</button>
              <button className="btn-danger" onClick={confirmModal.onConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="service-header-content">
        <div>
          <h1 className="service-title">Services</h1>
          <p className="service-subtitle">Manage services and configurations</p>
        </div>
        <button
          className="btn-add-service"
          onClick={() => openModal()}
          disabled={assetCategories.length === 0}
        >
          <Plus size={18} />
          <span>Add Service</span>
        </button>
      </div>

      {error && !isModalOpen && <p className="api-error">{error}</p>}
      {loading ? (
        <p className="loading-message loading-shimmer">Loading services...</p>
      ) : (
        <div className="services-grid content-fade-in">
          {services.map((service) => {
            const IconComponent = service.icon || DEFAULT_ICON;
            return (
              <div key={service.id} className="service-card">
                <div className="service-card-header">
                  <div
                    className="service-icon-wrapper"
                    style={{
                      backgroundColor: `${service.color}15`,
                      color: service.color,
                    }}
                  >
                    <IconComponent size={24} />
                  </div>
                  <div className="service-status">
                    {service.isActive ? (
                      <CheckCircle size={20} className="status-active" />
                    ) : (
                      <XCircle size={20} className="status-inactive" />
                    )}
                  </div>
                </div>
                <div className="service-card-body">
                  <h3 className="service-name">{service.name}</h3>
                  <p className="service-name-ar">{service.nameAr}</p>
                  <div className="service-details">
                    {service.categoryId && (
                      <div className="service-detail-item">
                        <span className="detail-label">Category:</span>
                        <span className="detail-value">
                          {assetCategories.find(
                            (c) => c.id === service.categoryId
                          )?.name || "N/A"}
                        </span>
                      </div>
                    )}
                    <div className="service-detail-item">
                      <span className="detail-label">Base Price:</span>
                      <span className="detail-value">
                        <span className="riyal-symbol">&#x20C1;</span>
                        {(service.basePrice ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="service-detail-item">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">
                        {service.duration ?? 0} min
                      </span>
                    </div>
                    <div className="service-detail-item">
                      <span className="detail-label">Add-ons:</span>
                      <span className="detail-value">
                        {(service.addons || []).length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="service-card-footer">
                  <button
                    className="btn-edit"
                    onClick={() => openModal(service)}
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    className="btn-settings"
                    onClick={() => openSettingsModal(service)}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(service)}
                    title="Delete service"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content service-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingService ? "Edit Service" : "Add New Service"}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {error && <p className="api-error">{error}</p>}
              <div className="service-form">
                <div className="form-group">
                  <label htmlFor="service-category">Category *</label>
                  <select
                    id="service-category"
                    className="form-select"
                    value={formData.categoryId}
                    onChange={(e) =>
                      handleInputChange("categoryId", e.target.value)
                    }
                  >
                    {assetCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.nameAr})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="service-name">Service Name (English)</label>
                  <input
                    type="text"
                    id="service-name"
                    className="form-input"
                    placeholder="e.g. Car Wash"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="service-name-ar">Service Name (Arabic)</label>
                  <input
                    type="text"
                    id="service-name-ar"
                    className="form-input"
                    placeholder="e.g. غسيل السيارات"
                    value={formData.nameAr}
                    onChange={(e) =>
                      handleInputChange("nameAr", e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <div className="icon-selector">
                    {availableIcons.map((ico) => {
                      const IconComponent = ico.component;
                      const isSelected = formData.icon === ico.component;
                      return (
                        <button
                          key={ico.name}
                          type="button"
                          className={`icon-option ${isSelected ? "selected" : ""
                            }`}
                          onClick={() =>
                            handleInputChange("icon", ico.component)
                          }
                          style={{
                            backgroundColor: isSelected
                              ? `${formData.color}15`
                              : "#f9fafb",
                            color: isSelected ? formData.color : "#6b7280",
                            borderColor: isSelected
                              ? formData.color
                              : "#e5e7eb",
                          }}
                        >
                          <IconComponent size={24} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <div className="color-selector">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${formData.color === color ? "selected" : ""
                          }`}
                        onClick={() => handleInputChange("color", color)}
                        style={{
                          backgroundColor: color,
                          borderColor:
                            formData.color === color ? color : "#e5e7eb",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="service-base-price">
                    Base Price (&#x20C1;)
                  </label>
                  <div className="input-with-prefix">
                    <span className="input-prefix riyal-symbol">&#x20C1;</span>
                    <input
                      type="number"
                      id="service-base-price"
                      className="form-input"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={formData.basePrice}
                      onChange={(e) =>
                        handleInputChange("basePrice", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="service-duration">Duration (minutes)</label>
                  <input
                    type="number"
                    id="service-duration"
                    className="form-input"
                    placeholder="60"
                    min="1"
                    value={formData.duration}
                    onChange={(e) =>
                      handleInputChange("duration", e.target.value)
                    }
                  />
                </div>
                {editingService && (
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          handleInputChange("isActive", e.target.checked)
                        }
                      />
                      <span>Active</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.categoryId}
              >
                {saving
                  ? "Saving..."
                  : editingService
                    ? "Update Service"
                    : "Add Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsModalOpen && editingService && (
        <div className="modal-overlay" onClick={closeSettingsModal}>
          <div className="modal-content service-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Service Settings - {editingService.name}
              </h2>
              <button className="modal-close-btn" onClick={closeSettingsModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Service Properties</label>
                <p className="helper-text">
                  Add properties like &quot;Has Balcony&quot;, &quot;Number of
                  Rooms&quot;, etc.
                </p>
              </div>
              {propertiesError && (
                <p className="api-error">{propertiesError}</p>
              )}
              {propertiesLoading ? (
                <p className="loading-message">Loading properties...</p>
              ) : (
                <>
                  <div className="properties-list">
                    {serviceProperties.map((prop) => (
                      <div
                        key={prop.id}
                        className="property-item"
                        data-type={(prop.type || "STRING").toLowerCase()}
                      >
                        <div className="property-info">
                          <span className="property-name">{prop.name}</span>
                          <span
                            className="property-type-badge"
                            data-type={(prop.type || "STRING").toLowerCase()}
                          >
                            {prop.type || "STRING"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-delete-property"
                          onClick={() => handleDeleteProperty(prop.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="add-property-form">
                    <label className="add-property-label">
                      Add new property
                    </label>
                    <div className="property-inputs">
                      <input
                        type="text"
                        className="property-name-input"
                        placeholder="e.g. Has Balcony"
                        value={newProperty.name}
                        onChange={(e) =>
                          setNewProperty((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                      />
                      <select
                        className="property-type-select"
                        value={newProperty.type}
                        onChange={(e) =>
                          setNewProperty((p) => ({
                            ...p,
                            type: e.target.value,
                          }))
                        }
                      >
                        <option value="STRING">STRING</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="NUMBER">NUMBER</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn-add-property"
                      onClick={handleAddProperty}
                      disabled={propertySaving || !newProperty.name.trim()}
                    >
                      <Plus size={16} />
                      {propertySaving ? "Adding..." : "Add Property"}
                    </button>
                  </div>
                </>
              )}

              {/* Service Types & Checklists */}
              <div className="settings-section">
                <h3 className="section-title">
                  <Package size={18} />
                  Service Types &amp; Checklists
                </h3>

                {typesError && <p className="api-error">{typesError}</p>}

                {/* Add new type form */}
                <div className="add-type-form-full">
                  <div className="type-form-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Name (English) *"
                      value={newTypeForm.name_en}
                      onChange={(e) => setNewTypeForm(p => ({ ...p, name_en: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Name (Arabic)"
                      value={newTypeForm.name_ar}
                      onChange={(e) => setNewTypeForm(p => ({ ...p, name_ar: e.target.value }))}
                    />
                  </div>
                  <div className="type-form-row">
                    <select
                      className="form-select"
                      value={newTypeForm.price_mode}
                      onChange={(e) => setNewTypeForm(p => ({ ...p, price_mode: e.target.value }))}
                    >
                      <option value="DELTA">DELTA (add to base)</option>
                      <option value="FIXED">FIXED (flat price)</option>
                      <option value="OVERRIDE">OVERRIDE (replace base)</option>
                    </select>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Price value"
                      min="0"
                      step="0.01"
                      value={newTypeForm.price_value}
                      onChange={(e) => setNewTypeForm(p => ({ ...p, price_value: e.target.value }))}
                    />
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Duration (min)"
                      min="1"
                      value={newTypeForm.duration_min}
                      onChange={(e) => setNewTypeForm(p => ({ ...p, duration_min: e.target.value }))}
                    />
                  </div>
                  <button
                    className="btn-add-type"
                    onClick={handleAddServiceType}
                    disabled={typesLoading || !newTypeForm.name_en.trim()}
                  >
                    <Plus size={16} />
                    {typesLoading ? "..." : "Add Type"}
                  </button>
                </div>

                {serviceTypes.length > 0 ? (
                  <>
                    <div className="type-tabs">
                      {serviceTypes.map(type => (
                        <div key={type.id} className="type-tab-wrapper">
                          <button
                            className={`type-tab ${activeTypeTab === type.id ? 'active' : ''}`}
                            onClick={() => { setEditingType(null); handleTypeTabClick(type.id); }}
                          >
                            {type.name_en || type.name}
                          </button>
                          <button
                            className="type-tab-edit-btn"
                            title="Edit type"
                            onClick={() => { handleTypeTabClick(type.id); handleStartEditType(type); }}
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Inline edit form */}
                    {editingType && (
                      <div className="edit-type-form">
                        <div className="type-form-row">
                          <input type="text" className="form-input" placeholder="Name (English)" value={editTypeForm.name_en}
                            onChange={(e) => setEditTypeForm(p => ({ ...p, name_en: e.target.value }))} />
                          <input type="text" className="form-input" placeholder="Name (Arabic)" value={editTypeForm.name_ar}
                            onChange={(e) => setEditTypeForm(p => ({ ...p, name_ar: e.target.value }))} />
                        </div>
                        <div className="type-form-row">
                          <select className="form-select" value={editTypeForm.price_mode}
                            onChange={(e) => setEditTypeForm(p => ({ ...p, price_mode: e.target.value }))}>
                            <option value="DELTA">DELTA</option>
                            <option value="FIXED">FIXED</option>
                            <option value="OVERRIDE">OVERRIDE</option>
                          </select>
                          <input type="number" className="form-input" placeholder="Price value" min="0" step="0.01"
                            value={editTypeForm.price_value}
                            onChange={(e) => setEditTypeForm(p => ({ ...p, price_value: e.target.value }))} />
                          <input type="number" className="form-input" placeholder="Duration (min)" min="1"
                            value={editTypeForm.duration_min}
                            onChange={(e) => setEditTypeForm(p => ({ ...p, duration_min: e.target.value }))} />
                        </div>
                        <div className="type-form-row">
                          <label className="checkbox-label">
                            <input type="checkbox" checked={editTypeForm.is_active}
                              onChange={(e) => setEditTypeForm(p => ({ ...p, is_active: e.target.checked }))} />
                            <span>Active</span>
                          </label>
                          <button className="btn-primary" onClick={handleUpdateType} disabled={typesLoading}>Save</button>
                          <button className="btn-secondary" onClick={() => setEditingType(null)}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {activeTypeTab && (
                      <div className="checklist-container">
                        <div className="checklist-header">
                          <h4 className="checklist-title">Checklist Items</h4>
                          {checklistLoading && <span className="loading-shimmer">...</span>}
                        </div>

                        <div className="checklist-list">
                          {(checklistItems[activeTypeTab] || []).length === 0 && !checklistLoading ? (
                            <p className="no-checklist">No questions added yet.</p>
                          ) : (
                            (checklistItems[activeTypeTab] || []).map(item => (
                              <div key={item.id} className={`checklist-item ${!item.is_active ? 'checklist-item--inactive' : ''}`}>
                                {editingChecklistItemId === item.id ? (
                                  <div className="checklist-item-edit">
                                    <input
                                      className="checklist-edit-input"
                                      value={editChecklistTitle}
                                      onChange={(e) => setEditChecklistTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateChecklistItem(item.id);
                                        if (e.key === 'Escape') setEditingChecklistItemId(null);
                                      }}
                                      autoFocus
                                    />
                                    <button className="btn-save-checklist" onClick={() => handleUpdateChecklistItem(item.id)}>Save</button>
                                    <button className="btn-cancel-checklist" onClick={() => setEditingChecklistItemId(null)}>✕</button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="checklist-item-content">
                                      <button
                                        className="checklist-toggle-btn"
                                        title={item.is_active ? "Deactivate" : "Activate"}
                                        onClick={() => handleToggleChecklistItem(item)}
                                      >
                                        <CheckCircle size={16} color={item.is_active ? "#10b981" : "#d1d5db"} />
                                      </button>
                                      <span className="checklist-item-text">{item.title}</span>
                                    </div>
                                    <div className="checklist-item-actions">
                                      <button className="btn-edit-item" title="Edit" onClick={() => handleStartEditChecklist(item)}>
                                        <Edit size={13} />
                                      </button>
                                      <button className="btn-delete-item" title="Delete" onClick={() => handleDeleteChecklistItem(item.id)}>
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        <div className="add-item-form">
                          <input
                            type="text"
                            className="add-item-input"
                            placeholder="Add a new checklist item..."
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                          />
                          <button className="btn-add-item" onClick={handleAddChecklistItem}
                            disabled={checklistLoading || !newChecklistItem.trim()}>
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : !typesLoading && (
                  <p className="helper-text">Add at least one service type to manage checklists.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceManagement;
