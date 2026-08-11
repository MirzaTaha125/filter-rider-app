import { useState, useEffect } from "react";
import {
  Plus,
  Car,
  Home,
  Edit,
  Trash2,
  X,
  Save,
  Package,
  Box,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  getServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
} from "../../../api";
import "./AssetCategories.css";

const ICON_MAP = { Car, Home, Package, Box, ShoppingBag, Truck };
const DEFAULT_ICON = Car;
const inferIconName = (name = "", nameAr = "") => {
  const value = `${name} ${nameAr}`.toLowerCase();
  if (
    value.includes("home") ||
    value.includes("clean") ||
    value.includes("house") ||
    value.includes("تنظيف") ||
    value.includes("منزل")
  ) {
    return "Home";
  }
  if (
    value.includes("box") ||
    value.includes("package") ||
    value.includes("parcel") ||
    value.includes("delivery")
  ) {
    return "Package";
  }
  if (value.includes("shop") || value.includes("bag")) {
    return "ShoppingBag";
  }
  if (value.includes("truck") || value.includes("transport")) {
    return "Truck";
  }
  return "Car";
};

function AssetCategories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [assetCategories, setAssetCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    iconName: "Car",
    color: "#3b82f6",
  });

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

  const toFrontend = (item) => ({
    id: item.id,
    name: item.title_en || item.name,
    nameAr: item.title_ar || item.nameAr,
    iconName: item.icon || inferIconName(item.title_en || item.name, item.title_ar || item.nameAr),
    color: item.icon_color || item.color || "#3b82f6",
    icon:
      ICON_MAP[item.icon || inferIconName(item.title_en || item.name, item.title_ar || item.nameAr)] ||
      DEFAULT_ICON,
    isActive: item.is_active,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    setError("");
    try {
      const data = await getServiceCategories(true);
      setAssetCategories((Array.isArray(data) ? data : []).map(toFrontend));
    } catch (err) {
      setError(err.message || "Failed to load categories");
      setAssetCategories([]);
    } finally {
      setLoading(false);
    }
  }

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        nameAr: category.nameAr,
        iconName: category.iconName || "Car",
        color: category.color || "#3b82f6",
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        nameAr: "",
        iconName: "Car",
        color: "#3b82f6",
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", nameAr: "", iconName: "Car", color: "#3b82f6" });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingCategory) {
        await updateServiceCategory(editingCategory.id, {
          name: formData.name,
          nameAr: formData.nameAr,
          icon: formData.iconName,
          color: formData.color,
          isActive: true,
        });
      } else {
        await createServiceCategory({
          name: formData.name,
          nameAr: formData.nameAr,
          icon: formData.iconName,
          color: formData.color,
        });
      }
      await loadCategories();
      closeModal();
    } catch (err) {
      setError(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;
    setError("");
    const prev = assetCategories;
    setAssetCategories((c) => c.filter((x) => x.id !== id));
    try {
      await deleteServiceCategory(id);
    } catch (err) {
      setAssetCategories(prev);
      setError(err.message || "Failed to delete category");
    }
  };

  return (
    <div className="asset-categories">
      <div className="asset-categories-header-content">
        <div>
          <h1 className="asset-categories-title">Asset Categories</h1>
          <p className="asset-categories-subtitle">
            Manage asset categories and types
          </p>
        </div>
        <button className="btn-add-asset" onClick={() => openModal()}>
          <Plus size={18} />
          <span>Add Category</span>
        </button>
      </div>

      {error && !isModalOpen && <p className="api-error">{error}</p>}
      {loading ? (
        <p className="loading-message loading-shimmer">Loading categories...</p>
      ) : (
        <div className="categories-grid content-fade-in">
          {assetCategories.map((category) => {
            const IconComponent = category.icon || DEFAULT_ICON;
            return (
              <div key={category.id} className="category-card">
                <div
                  className="category-icon"
                  style={{
                    backgroundColor: `${category.color}15`,
                    color: category.color,
                  }}
                >
                  <IconComponent size={32} />
                </div>
                <div className="category-info">
                  <h3 className="category-name">{category.name}</h3>
                  <p className="category-name-ar">{category.nameAr}</p>
                </div>
                <div className="category-actions">
                  <button
                    className="btn-edit"
                    onClick={() => openModal(category)}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(category.id)}
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
            className="modal-content category-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {error && <p className="api-error">{error}</p>}
              <div className="category-form">
                <div className="form-group">
                  <label htmlFor="category-name">Category Name (English)</label>
                  <input
                    type="text"
                    id="category-name"
                    className="form-input"
                    placeholder="e.g. Vehicle"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category-name-ar">
                    Category Name (Arabic)
                  </label>
                  <input
                    type="text"
                    id="category-name-ar"
                    className="form-input"
                    placeholder="e.g. مركبة"
                    value={formData.nameAr}
                    onChange={(e) =>
                      handleInputChange("nameAr", e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Icon</label>
                  <div className="icon-selector">
                    {availableIcons.map((iconOption) => {
                      const IconComponent = iconOption.component;
                      const isSelected = formData.iconName === iconOption.name;
                      return (
                        <button
                          key={iconOption.name}
                          type="button"
                          className={`icon-option ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleInputChange("iconName", iconOption.name)
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
                        className={`color-option ${
                          formData.color === color ? "selected" : ""
                        }`}
                        onClick={() => handleInputChange("color", color)}
                        style={{
                          backgroundColor: color,
                          borderColor:
                            formData.color === color
                              ? "#1a1a1a"
                              : "transparent",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-preview">
                  <label>Preview</label>
                  <div className="preview-card">
                    <div
                      className="preview-icon"
                      style={{
                        backgroundColor: `${formData.color}15`,
                        color: formData.color,
                      }}
                    >
                      {(() => {
                        const PreviewIconComponent =
                          ICON_MAP[formData.iconName] || DEFAULT_ICON;
                        return <PreviewIconComponent size={32} />;
                      })()}
                    </div>
                    <div className="preview-info">
                      <h3 className="preview-name">
                        {formData.name || "Category Name"}
                      </h3>
                      <p className="preview-name-ar">
                        {formData.nameAr || "اسم الفئة"}
                      </p>
                    </div>
                  </div>
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
                disabled={saving || !formData.name}
              >
                <Save size={18} />
                {saving
                  ? "Saving..."
                  : editingCategory
                  ? "Update Category"
                  : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetCategories;
