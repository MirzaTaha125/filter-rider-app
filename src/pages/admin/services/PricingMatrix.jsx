import { useState, useEffect } from "react";
import { Edit, Plus, Trash2, X } from "lucide-react";
import {
  getServices,
  getPricingMatrix,
  getAllPricingMatrix,
  getSizeCategories,
  createPricingMatrix,
  updatePricingMatrix,
  deletePricingMatrix,
} from "../../../api";
import "./PricingMatrix.css";

function PricingMatrix() {
  const [services, setServices] = useState([]);
  const [sizeCategories, setSizeCategories] = useState([]);
  const [pricingMatrix, setPricingMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    serviceId: "",
    sizeCategoryId: "",
    basePrice: "",
    duration: "",
    status: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [svcs, sizes] = await Promise.all([
        getServices(null, true),
        getSizeCategories(),
      ]);
      setServices(Array.isArray(svcs) ? svcs : []);
      setSizeCategories(Array.isArray(sizes) ? sizes : []);

      const matrix = await getAllPricingMatrix(svcs || []);
      setPricingMatrix(
        matrix.map((row) => ({
          id: `${row.service_id}-${row.size_category_id}`,
          serviceId: row.service_id,
          serviceName:
            row._serviceName ||
            row.service?.name_en ||
            row.service?.name ||
            "—",
          sizeCategoryId: row.size_category_id,
          sizeCategoryName:
            row.size_category?.name ||
            row.size_category?.title_en ||
            sizes?.find((s) => s.id === row.size_category_id)?.name ||
            row.size_category_id,
          basePrice: parseFloat(row.base_price || 0),
          duration: parseInt(row.duration_min || row.duration || 0, 10),
          status: row.status !== false ? "ACTIVE" : "INACTIVE",
        }))
      );
    } catch (err) {
      setError(err.message || "Failed to load pricing matrix");
      setPricingMatrix([]);
    } finally {
      setLoading(false);
    }
  }

  const openModal = (pricing = null) => {
    if (pricing) {
      setEditingPricing(pricing);
      setFormData({
        serviceId: pricing.serviceId,
        sizeCategoryId: pricing.sizeCategoryId,
        basePrice: String(pricing.basePrice ?? ""),
        duration: String(pricing.duration ?? ""),
        status: pricing.status === "ACTIVE",
      });
    } else {
      setEditingPricing(null);
      setFormData({
        serviceId: services[0]?.id || "",
        sizeCategoryId: sizeCategories[0]?.id || "",
        basePrice: "",
        duration: "",
        status: true,
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPricing(null);
    setFormData({
      serviceId: "",
      sizeCategoryId: "",
      basePrice: "",
      duration: "",
      status: true,
    });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingPricing) {
        await updatePricingMatrix(
          editingPricing.serviceId,
          editingPricing.sizeCategoryId,
          {
            basePrice: formData.basePrice,
            duration: formData.duration,
            status: formData.status,
          }
        );
      } else {
        await createPricingMatrix({
          serviceId: formData.serviceId,
          sizeCategoryId: formData.sizeCategoryId,
          basePrice: formData.basePrice,
          duration: formData.duration,
          status: formData.status,
        });
      }
      await loadData();
      closeModal();
    } catch (err) {
      setError(err.message || "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pricing) => {
    if (!window.confirm("Delete this pricing entry?")) return;
    setError("");
    const prev = pricingMatrix;
    setPricingMatrix((m) => m.filter((p) => p.id !== pricing.id));
    try {
      await deletePricingMatrix(pricing.serviceId, pricing.sizeCategoryId);
    } catch (err) {
      setPricingMatrix(prev);
      setError(err.message || "Failed to delete pricing");
    }
  };

  return (
    <div className="pricing-matrix">
      <div className="pricing-matrix-header-content">
        <div>
          <h1 className="pricing-matrix-title">Pricing Matrix</h1>
          <p className="pricing-matrix-subtitle">
            Configure pricing based on asset size categories
          </p>
        </div>
        <button
          className="btn-add-pricing"
          onClick={() => openModal()}
          disabled={services.length === 0 || sizeCategories.length === 0}
        >
          <Plus size={18} />
          <span>Add New Pricing</span>
        </button>
      </div>

      {error && !isModalOpen && <p className="api-error">{error}</p>}
      {sizeCategories.length === 0 && !loading && (
        <p className="helper-message">
          No size categories found. Add size categories in the Assets section
          first.
        </p>
      )}
      {loading ? (
        <p className="loading-message loading-shimmer">
          Loading pricing matrix...
        </p>
      ) : (
        <div className="pricing-table-container content-fade-in">
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Size Category</th>
                <th>Base Price</th>
                <th>Duration (min)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pricingMatrix.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No pricing entries. Add one to get started.
                  </td>
                </tr>
              ) : (
                pricingMatrix.map((pricing) => (
                  <tr key={pricing.id}>
                    <td>{pricing.serviceName}</td>
                    <td>{pricing.sizeCategoryName}</td>
                    <td>
                      <span className="riyal-symbol">&#x20C1;</span>
                      {(pricing.basePrice ?? 0).toFixed(2)}
                    </td>
                    <td>{pricing.duration ?? 0}</td>
                    <td>
                      <span
                        className={`status-badge ${(
                          pricing.status || "ACTIVE"
                        ).toLowerCase()}`}
                      >
                        {pricing.status || "ACTIVE"}
                      </span>
                    </td>
                    <td>
                      <div className="pricing-actions">
                        <button
                          className="btn-edit-small"
                          onClick={() => openModal(pricing)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn-delete-small"
                          onClick={() => handleDelete(pricing)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content pricing-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {editingPricing ? "Edit Pricing" : "Add New Pricing"}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {error && <p className="api-error">{error}</p>}
              <div className="pricing-form">
                <div className="form-group">
                  <label htmlFor="pricing-service">Service</label>
                  <select
                    id="pricing-service"
                    className="form-select"
                    value={formData.serviceId}
                    onChange={(e) =>
                      handleInputChange("serviceId", e.target.value)
                    }
                    disabled={!!editingPricing}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name_en || s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="pricing-size">Size Category</label>
                  <select
                    id="pricing-size"
                    className="form-select"
                    value={formData.sizeCategoryId}
                    onChange={(e) =>
                      handleInputChange("sizeCategoryId", e.target.value)
                    }
                    disabled={!!editingPricing}
                  >
                    {sizeCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.title_en || s.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="pricing-base-price">
                    Base Price (<span className="riyal-symbol">&#x20C1;</span>)
                  </label>
                  <div className="input-with-prefix">
                    <span className="input-prefix riyal-symbol">&#x20C1;</span>
                    <input
                      type="number"
                      id="pricing-base-price"
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
                  <label htmlFor="pricing-duration">Duration (minutes)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="pricing-duration"
                      className="form-input"
                      placeholder="60"
                      min="1"
                      value={formData.duration}
                      onChange={(e) =>
                        handleInputChange("duration", e.target.value)
                      }
                    />
                    <span className="input-suffix">min</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="pricing-status">Status</label>
                  <select
                    id="pricing-status"
                    className="form-select"
                    value={formData.status ? "ACTIVE" : "INACTIVE"}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value === "ACTIVE")
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={
                  saving ||
                  !formData.serviceId ||
                  !formData.sizeCategoryId ||
                  !formData.basePrice
                }
              >
                {saving
                  ? "Saving..."
                  : editingPricing
                  ? "Update Pricing"
                  : "Add Pricing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingMatrix;
