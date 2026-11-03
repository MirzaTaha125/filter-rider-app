import Pager from '../../../components/DataTable/Pager'
import { usePagedRows } from '../../../components/DataTable/usePagedRows'
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, AlertTriangle, Search, FolderOpen, CheckCircle2, ImageOff,
} from "lucide-react";
import MasterCatalogPicker, { FromMasterCatalogButton } from "../catalog/MasterCatalogPicker";
import ConfirmDialog from "../../../components/ConfirmDialog/ConfirmDialog";
import { getServiceCategories, updateServiceCategory } from "../../../api";
import { toCategory } from "./categoryIcons";
// Same card layout as the Services page.
import "../services/ServiceManagement.css";
import "./AssetCategories.css";
import { ServiceCardsShimmer } from '../../../components/Shimmer/Shimmer'

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function formatPrice(value) {
  return Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PriceRange({ from, to }) {
  if (from == null || to == null) return <span className="ac-muted">Not set</span>;
  if (Number(from) === Number(to)) {
    return <><span className="riyal-symbol">&#x20C1;</span>{formatPrice(from)}</>;
  }
  return (
    <>
      <span className="riyal-symbol">&#x20C1;</span>{formatPrice(from)}
      {" – "}
      <span className="riyal-symbol">&#x20C1;</span>{formatPrice(to)}
    </>
  );
}

function AssetCategories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState("");

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

  const setActive = async (category, isActive) => {
    setBusyId(category.id);
    setError("");
    try {
      await updateServiceCategory(category.id, { isActive });
      setCategories(list => list.map(c => (c.id === category.id ? { ...c, isActive } : c)));
    } catch (err) {
      setError(err.message || "Failed to change the category status");
    } finally {
      setBusyId(null);
    }
  };

  // Deactivating hides the category from customers, so it asks first.
  const handleStatusClick = (category) => {
    if (category.isActive !== false) setConfirm({ category });
    else setActive(category, true);
  };

  const term = search.trim().toLowerCase();
  const visibleCategories = categories.filter(category => {
    const matchesSearch = !term
      || (category.name || "").toLowerCase().includes(term)
      || (category.nameAr || "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "active" ? category.isActive !== false : category.isActive === false);
    return matchesSearch && matchesStatus;
  });
  const { pageRows, pagerProps } = usePagedRows(visibleCategories, {
    defaultLimit: 20,
    resetKey: `${statusFilter}|${term}`,
  })

  return (
    <div className="service-management">
      <header className="sm-header">
        <div>
          <p className="sm-subtitle">Group services into categories, set their order and the price range customers see.</p>
        </div>
        <div className="mcp-head-actions">
          <FromMasterCatalogButton label="Add Category from Master Catalog" onClick={() => setPickerOpen(true)} />
          <button className="sm-btn sm-btn--primary" onClick={() => navigate("/admin/assets/add")}>
            <Plus size={18} />
            Add Category
          </button>
        </div>
      </header>

      {notice && (
        <div className="mcp-notice" role="status">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      <div className="sm-toolbar">
        <div className="sm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="sm-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <span className="sm-count">
          {loading ? "—" : `${visibleCategories.length} of ${categories.length}`}
        </span>
      </div>

      {error && (
        <div className="sm-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button className="ac-dismiss" onClick={() => setError("")} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <ServiceCardsShimmer />
      ) : visibleCategories.length === 0 ? (
        <div className="sm-state">
          {categories.length === 0 ? <FolderOpen size={32} /> : <Search size={32} />}
          <h2>{categories.length === 0 ? "No categories yet" : "No matches"}</h2>
          <p>
            {categories.length === 0
              ? "Create a category to group your services."
              : "Try a different search term or status."}
          </p>
          {categories.length === 0 && (
            <button className="sm-btn sm-btn--primary" onClick={() => navigate("/admin/assets/add")}>
              <Plus size={16} /> Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="sm-grid content-fade-in">
          {pageRows.map((category) => {
            const isActive = category.isActive !== false;
            return (
              <article key={category.id} className="sm-card" style={{ "--accent": category.color }}>
                {category.imageUrl ? (
                  <div className="sm-card-cover">
                    <img src={category.imageUrl} alt="" loading="lazy" />
                  </div>
                ) : (
                  <div className="sm-card-cover sm-card-cover--empty">
                    <ImageOff size={22} />
                    <span>No image</span>
                  </div>
                )}
                <div className="sm-card-body">
                  <div className="sm-card-names">
                    <h2 className="sm-card-title">{category.name}</h2>
                    <span className={`sm-badge ${isActive ? "is-active" : "is-inactive"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="sm-card-category">Display order #{category.displayOrder}</span>

                  <dl className="sm-stats">
                    {category.priceBySize?.length > 0 ? (
                      category.priceBySize.map((size) => (
                        <div key={size.id}>
                          <dt>{size.name || 'Size'}</dt>
                          <dd><PriceRange from={size.priceFrom} to={size.priceTo} /></dd>
                        </div>
                      ))
                    ) : (
                      <div>
                        <dt>Price range</dt>
                        <dd><PriceRange from={category.priceFrom} to={category.priceTo} /></dd>
                      </div>
                    )}
                    <div>
                      <dt>Price source</dt>
                      <dd>
                        <span className={`ac-source ${category.priceSource === "MANUAL" ? "is-manual" : "is-auto"}`}>
                          {category.priceSource === "MANUAL" ? "Manual override" : "Automatic"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Services</dt>
                      <dd>
                        {category.servicesCount ?? "—"}
                        {category.servicesCount != null && category.activeServicesCount !== category.servicesCount && (
                          <span className="ac-muted"> ({category.activeServicesCount} active)</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <footer className="sm-card-actions">
                  <button
                    className="sm-btn sm-btn--primary"
                    onClick={() => navigate(`/admin/assets/${category.id}/edit`)}
                    aria-label={`Edit ${category.name}`}
                  >
                    Edit
                  </button>
                  <button
                    className={`sm-btn sm-btn--secondary sm-btn--status ${isActive ? "is-deactivate" : "is-activate"}`}
                    onClick={() => handleStatusClick(category)}
                    disabled={busyId === category.id}
                    aria-label={`${isActive ? "Deactivate" : "Activate"} ${category.name}`}
                  >
                    {isActive ? "Deactivate" : "Activate"}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
      {pageRows.length > 0 && (
        <div className="dt-pager-wrap">
          <Pager {...pagerProps} unit="categories" />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate category"
        message={confirm ? `Deactivate "${confirm.category.name}"? It will be hidden from customers until you activate it again. Its services are not changed.` : ""}
        confirmLabel="Deactivate"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm;
          setConfirm(null);
          if (pending) setActive(pending.category, false);
        }}
      />

      {pickerOpen && (
        <MasterCatalogPicker
          mode="category"
          onClose={() => setPickerOpen(false)}
          onAdded={(res) => {
            const name = res?.category?.title_en ?? "Category";
            setNotice(res?.created === false ? `${name} was already added.` : `${name} added.`);
            loadCategories();
          }}
        />
      )}
    </div>
  );
}

export default AssetCategories;
