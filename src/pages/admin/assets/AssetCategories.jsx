import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Loader2, AlertTriangle, Search, FolderOpen,
} from "lucide-react";
import ConfirmDialog from "../../../components/ConfirmDialog/ConfirmDialog";
import { getServiceCategories, deleteServiceCategory } from "../../../api";
import { DEFAULT_ICON, toCategory } from "./categoryIcons";
import "./AssetCategories.css";

function AssetCategories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);

  const loadCategories = useCallback(async () => {
    setError("");
    try {
      const data = await getServiceCategories(true);
      setCategories((Array.isArray(data) ? data : []).map(toCategory));
    } catch (err) {
      setError(err.message || "Failed to load categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const askDelete = (category) => {
    setConfirm({
      category,
      message: `Delete "${category.name}"? This is blocked if any service still uses the category.`,
    });
  };

  const handleDelete = async (category) => {
    const previous = categories;
    setCategories(list => list.filter(c => c.id !== category.id));
    try {
      await deleteServiceCategory(category.id);
    } catch (err) {
      // The API refuses to delete a category that is still referenced.
      setCategories(previous);
      setError(err.message || "Failed to delete category");
    }
  };

  const term = search.trim().toLowerCase();
  const visibleCategories = categories.filter(category =>
    !term
    || (category.name || "").toLowerCase().includes(term)
    || (category.nameAr || "").toLowerCase().includes(term),
  );

  return (
    <div className="asset-categories">
      <header className="ac-header">
        <div>
          <h1 className="ac-title">Asset Categories</h1>
          <p className="ac-subtitle">Groups the assets a service can be booked against.</p>
        </div>
        <button
          className="ac-btn ac-btn--primary"
          onClick={() => navigate("/admin/assets/add")}
        >
          <Plus size={18} />
          Add Category
        </button>
      </header>

      <div className="ac-toolbar">
        <div className="ac-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="ac-count">
          {loading ? "—" : `${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
        </span>
      </div>

      {error && (
        <div className="ac-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="ac-state">
          <Loader2 size={32} className="spin" />
          <span>Loading categories…</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="ac-state">
          <FolderOpen size={32} />
          <h2>No categories yet</h2>
          <p>Create one to group the assets your services are booked against.</p>
          <button className="ac-btn ac-btn--primary" onClick={() => navigate("/admin/assets/add")}>
            <Plus size={16} /> Add Category
          </button>
        </div>
      ) : visibleCategories.length === 0 ? (
        <div className="ac-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No categories match “{search.trim()}”.</p>
        </div>
      ) : (
        <div className="categories-grid content-fade-in">
          {visibleCategories.map((category) => {
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
                  {category.isActive === false && (
                    <span className="category-inactive">Inactive</span>
                  )}
                </div>
                <div className="category-actions">
                  <button
                    className="ac-icon-btn"
                    onClick={() => navigate(`/admin/assets/${category.id}/edit`)}
                    title={`Edit ${category.name}`}
                    aria-label={`Edit ${category.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="ac-icon-btn ac-icon-btn--danger"
                    onClick={() => askDelete(category)}
                    title={`Delete ${category.name}`}
                    aria-label={`Delete ${category.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete category"
        message={confirm?.message}
        confirmLabel="Delete category"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm;
          setConfirm(null);
          if (pending) handleDelete(pending.category);
        }}
      />
    </div>
  );
}

export default AssetCategories;
