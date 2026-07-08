import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";
import {
  getServices,
  getServiceAddons,
  createServiceAddon,
  updateServiceAddon,
  deleteServiceAddon,
} from "../../../api";
import "./AddonsManagement.css";

function AddonsManagement() {
  const [services, setServices] = useState([]);
  const [addonsByService, setAddonsByService] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    serviceId: "",
    name: "",
    nameAr: "",
    price: "",
    duration: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const svcs = await getServices(null, true);
      const list = Array.isArray(svcs) ? svcs : [];
      setServices(list);
      setAddonsByService({});
      setLoading(false);
      Promise.all(
        list.map(async (s) => {
          try {
            const addons = await getServiceAddons(s.id, true);
            return { id: s.id, addons: Array.isArray(addons) ? addons : [] };
          } catch {
            return { id: s.id, addons: [] };
          }
        })
      ).then((results) => {
        setAddonsByService(
          Object.fromEntries(results.map((r) => [r.id, r.addons]))
        );
      });
    } catch (err) {
      setError(err.message || "Failed to load add-ons");
      setServices([]);
      setAddonsByService({});
    } finally {
      setLoading(false);
    }
  }

  const toFrontendAddon = (item) => ({
    id: item.id,
    name: item.name_en || item.name,
    nameAr: item.name_ar || item.nameAr,
    price: parseFloat(item.price || 0),
    duration: parseInt(item.additional_duration || item.duration || 0, 10),
  });

  const openModal = (addon = null, serviceId = null) => {
    if (addon && serviceId) {
      setEditingAddon(addon);
      setSelectedServiceId(serviceId);
      setFormData({
        serviceId,
        name: addon.name,
        nameAr: addon.nameAr || "",
        price: String(addon.price ?? ""),
        duration: String(addon.duration ?? ""),
      });
    } else {
      setEditingAddon(null);
      setSelectedServiceId(null);
      setFormData({
        serviceId: services[0]?.id || "",
        name: "",
        nameAr: "",
        price: "",
        duration: "",
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAddon(null);
    setSelectedServiceId(null);
    setFormData({
      serviceId: "",
      name: "",
      nameAr: "",
      price: "",
      duration: "",
    });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.serviceId || !formData.name) return;
    setSaving(true);
    setError("");
    try {
      if (editingAddon && selectedServiceId) {
        await updateServiceAddon(editingAddon.id, {
          name: formData.name,
          nameAr: formData.nameAr,
          price: formData.price,
          duration: formData.duration,
        });
      } else {
        await createServiceAddon({
          serviceId: formData.serviceId,
          name: formData.name,
          nameAr: formData.nameAr,
          price: formData.price,
          duration: formData.duration,
        });
      }
      await loadData();
      closeModal();
    } catch (err) {
      setError(err.message || "Failed to save add-on");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addonId, serviceId) => {
    if (!window.confirm("Are you sure you want to delete this add-on?")) return;
    setError("");
    const prev = { ...addonsByService };
    setAddonsByService((p) => ({
      ...p,
      [serviceId]: (p[serviceId] || []).filter((a) => a.id !== addonId),
    }));
    try {
      await deleteServiceAddon(addonId);
    } catch (err) {
      setAddonsByService(prev);
      setError(err.message || "Failed to delete add-on");
    }
  };

  return (
    <div className="addons-management">
      <div className="addons-header-content">
        <div>
          <h1 className="addons-title">Service Add-ons</h1>
          <p className="addons-subtitle">Manage add-ons for each service</p>
        </div>
        <button
          className="btn-add-addon"
          onClick={() => openModal()}
          disabled={services.length === 0}
        >
          <Plus size={18} />
          <span>Add Add-on</span>
        </button>
      </div>

      {error && !isModalOpen && <p className="api-error">{error}</p>}
      {loading ? (
        <p className="loading-message loading-shimmer">Loading add-ons...</p>
      ) : (
        <div className="addons-sections content-fade-in">
          {services.map((service) => {
            const addons = (addonsByService[service.id] || []).map(
              toFrontendAddon
            );
            return (
              <div key={service.id} className="addon-section">
                <h3 className="addon-section-title">
                  {service.name_en || service.name}
                </h3>
                <div className="addons-table-wrapper">
                  <table className="addons-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Name (Arabic)</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addons.length === 0 ? (
                        <tr>
                          <td colSpan="5">No add-ons</td>
                        </tr>
                      ) : (
                        addons.map((addon) => (
                          <tr key={addon.id}>
                            <td>{addon.name}</td>
                            <td>{addon.nameAr}</td>
                            <td>
                              <span className="riyal-symbol">&#x20C1;</span>
                              {(addon.price ?? 0).toFixed(2)}
                            </td>
                            <td>{addon.duration ?? 0} min</td>
                            <td>
                              <button
                                className="btn-edit"
                                onClick={() => openModal(addon, service.id)}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() =>
                                  handleDelete(addon.id, service.id)
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  className="btn-add-addon-small"
                  onClick={() => {
                    setFormData({
                      serviceId: service.id,
                      name: "",
                      nameAr: "",
                      price: "",
                      duration: "",
                    });
                    setEditingAddon(null);
                    setSelectedServiceId(null);
                    setError("");
                    setIsModalOpen(true);
                  }}
                >
                  <Plus size={14} />
                  Add Add-on
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingAddon ? "Edit Add-on" : "Add Add-on"}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {error && <p className="api-error">{error}</p>}
              <div className="form-group">
                <label>Service</label>
                <select
                  className="form-select"
                  value={formData.serviceId}
                  onChange={(e) =>
                    handleInputChange("serviceId", e.target.value)
                  }
                  disabled={!!editingAddon}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name_en || s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Name (English)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g. Wax"
                />
              </div>
              <div className="form-group">
                <label>Name (Arabic)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nameAr}
                  onChange={(e) => handleInputChange("nameAr", e.target.value)}
                  placeholder="e.g. تلميع"
                />
              </div>
              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Duration (min)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.duration}
                  onChange={(e) =>
                    handleInputChange("duration", e.target.value)
                  }
                  placeholder="15"
                  min="0"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !formData.name}
              >
                {saving ? "Saving..." : editingAddon ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddonsManagement;
