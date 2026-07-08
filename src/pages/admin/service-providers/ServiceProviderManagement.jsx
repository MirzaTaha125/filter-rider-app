import { useState, useEffect } from "react";
import { useSocket } from '../../../contexts/SocketContext';
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  Star,
  CheckCircle,
  X,
  AlertCircle,
  Phone,
  Mail,
  UserCheck,
  Eye,
  FileText,
  Shield,
  Briefcase,
  FileCheck,
  ShoppingCart,
  Wallet,
  MessageSquare,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { getProviders, getProviderDetails, getProviderSummary, updateProviderStatus, assignProviderServices, removeProviderService, getServices } from "../../../api";
import { getAdminOrders } from "../../../api/orders.js";
import { getZones } from "../../../api/zones.js";
import "./ServiceProviderManagement.css";


import { flattenDocs } from '../../../utils/spDocuments'

// Normalise liveStatus from API (ONLINE/OFFLINE/BUSY) to display form (Online/Offline/Busy)
function normalizeAvailability(val) {
  const map = { ONLINE: 'Online', OFFLINE: 'Offline', BUSY: 'Busy', Online: 'Online', Offline: 'Offline', Busy: 'Busy' }
  return map[val] ?? 'Offline'
}

// Map user API response to SP row shape
function mapUserToSP(item) {
  const zoneRaw = item.zone
  const zone = zoneRaw == null ? "—" : typeof zoneRaw === 'object' ? (zoneRaw.name_en ?? zoneRaw.name ?? "—") : zoneRaw
  return {
    id: item.id ?? item._id,
    name: item.full_name ?? item.name ?? "—",
    phone: item.phone ?? "—",
    email: item.email ?? "—",
    status: item.provider_status ?? item.user_status ?? item.status ?? "PENDING",
    availability: normalizeAvailability(item.liveStatus ?? item.live_status ?? item.availability),
    zone,
    rating: item.stats?.rating ?? item.rating ?? 0,
    totalOrders: item.stats?.totalOrders ?? item.total_orders ?? item.totalOrders ?? 0,
    totalEarnings: item.stats?.totalEarnings ?? item.total_earnings ?? item.totalEarnings ?? 0,
    walletBalance: item.wallet_balance ?? item.walletBalance ?? 0,
    verified: item.verification_status === 'VERIFIED' || item.verified === true,
    joinDate: item.created_at ?? item.joinDate ?? item.join_date ?? "—",
    avatar: item.avatar ?? null,
    serviceCount: item.service_count ?? 0,
    documentCount: item.document_count ?? 0,
  };
}

function ServiceProviderManagement() {
  const [filters, setFilters] = useState({
    search: "",
    status: "All",
    zoneId: "All",
    liveStatus: "All",
  });
  const [serviceProviders, setServiceProviders] = useState([]);
  const [spLoading, setSpLoading] = useState(true);
  const [spError, setSpError] = useState("");
  const [spRefreshTrigger] = useState(0);
  const [selectedSP, setSelectedSP] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("performance");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [spOrders, setSpOrders] = useState([]);
  const [spOrdersLoading, setSpOrdersLoading] = useState(false);
  const [zones, setZones] = useState([]);
  const [summary, setSummary] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [showAddService, setShowAddService] = useState(false);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState('');
  const [servicesBusy, setServicesBusy] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const { presenceSocket, connected } = useSocket()
  const wsConnected = connected.presence

  // Real-time provider online/offline updates via presence namespace
  useEffect(() => {
    if (!presenceSocket) return
    const handler = (data) => {
      const providerId   = data.providerId ?? data.id ?? data.provider_id
      const rawStatus    = data.liveStatus ?? data.live_status ?? data.status ?? data.availability
      if (!providerId || !rawStatus) return
      const availability = normalizeAvailability(rawStatus)
      setServiceProviders((prev) =>
        prev.map((sp) => sp.id === providerId ? { ...sp, availability } : sp)
      )
    }
    presenceSocket.on('presence.status.updated', handler)
    return () => presenceSocket.off('presence.status.updated', handler)
  }, [presenceSocket])

  useEffect(() => {
    getZones({ limit: 100 })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.zones ?? data?.items ?? data?.data ?? [])
        setZones(list)
      })
      .catch(() => {})
    getProviderSummary().then(setSummary).catch(() => {})
    getServices(null, true)
      .then((list) => setAllServices(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [])

  // Fetch service providers from users API (role=provider)
  useEffect(() => {
    const fetchProviders = async () => {
      setSpLoading(true);
      setSpError("");
      try {
        const response = await getProviders({
          page: 1,
          limit: 100,
          search: filters.search || undefined,
          status: filters.status !== 'All' ? filters.status : undefined,
          zoneId: filters.zoneId !== 'All' ? filters.zoneId : undefined,
          liveStatus: filters.liveStatus !== 'All' ? filters.liveStatus : undefined,
        });
        // The apiRequest already returns res.data
        const list = Array.isArray(response)
          ? response
          : (response?.items ?? response?.serviceProviders ?? response?.users ?? []);
        // Exclude pending providers — they are managed in SP Requests page
        const nonPending = list.filter(
          (item) => (item.provider_status ?? item.status) !== 'PENDING'
        );
        setServiceProviders(nonPending.map(mapUserToSP));
      } catch (err) {
        setSpError(err.message || "Failed to load service providers");
        setServiceProviders([]);
      } finally {
        setSpLoading(false);
      }
    };
    fetchProviders();
  }, [filters.search, filters.status, filters.zoneId, filters.liveStatus, spRefreshTrigger]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleViewDetails = async (sp) => {
    setSelectedSP(sp);
    setIsModalOpen(true);
    setDetailsLoading(true);
    setSpOrders([]);
    setSpOrdersLoading(true);
    try {
      const [raw, ordersRaw] = await Promise.allSettled([
        getProviderDetails(sp.id),
        getAdminOrders({ providerId: sp.id, limit: 50 }),
      ]);

      if (raw.status === 'fulfilled') {
        const r = raw.value;
        const zoneRaw = r.zone;
        const zone = zoneRaw == null ? sp.zone : typeof zoneRaw === 'object' ? (zoneRaw.name_en ?? zoneRaw.name ?? sp.zone) : zoneRaw;
        setSelectedSP({
          ...sp,
          name: r.user?.full_name ?? sp.name,
          email: r.user?.email ?? sp.email,
          phone: r.user?.phone ?? sp.phone,
          status: r.status ?? r.provider_status ?? sp.status,
          verified: r.verification_status === 'VERIFIED' || sp.verified,
          zone,
          bio: r.profile?.bio ?? r.bio ?? sp.bio,
          walletBalance: r.wallet?.available_balance ?? sp.walletBalance,
          wallet: r.wallet ?? null,
          services: r.services ?? [],
          bankAccounts: r.bank_accounts ?? [],
          ...flattenDocs(r),
        });
      }

      if (ordersRaw.status === 'fulfilled') {
        const d = ordersRaw.value;
        const list = Array.isArray(d) ? d : (d?.items ?? d?.orders ?? d?.data ?? []);
        const allOrders = Array.isArray(list) ? list : [];
        // Client-side filter — only keep orders explicitly assigned to this SP
        const filtered = allOrders.filter(o => {
          const pid = o.provider?.id ?? o.provider?.user_id ?? o.provider_id ?? o.assigned_provider?.id;
          return pid === sp.id;
        });
        setSpOrders(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch provider details:", err);
    } finally {
      setDetailsLoading(false);
      setSpOrdersLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSP(null);
    setActiveTab("performance");
    setSpOrders([]);
    setShowAddService(false);
    setSelectedServiceToAdd('');
    setServicesError('');
  };

  const handleAddService = async () => {
    if (!selectedSP || !selectedServiceToAdd) return;
    setServicesBusy(true);
    setServicesError('');
    try {
      await assignProviderServices(selectedSP.id, [selectedServiceToAdd]);
      const refreshed = await getProviderDetails(selectedSP.id);
      setSelectedSP((prev) => prev ? { ...prev, services: refreshed.services ?? [] } : prev);
      setSelectedServiceToAdd('');
      setShowAddService(false);
    } catch (err) {
      setServicesError(err.message || 'Failed to add service');
    } finally {
      setServicesBusy(false);
    }
  };

  const handleRemoveService = async (serviceId) => {
    if (!selectedSP || !serviceId) return;
    const prevServices = selectedSP.services ?? [];
    setServicesBusy(true);
    setServicesError('');
    setSelectedSP((prev) => prev ? {
      ...prev,
      services: (prev.services ?? []).filter((it) => (it.service?.id ?? it.service_id ?? it.id) !== serviceId),
    } : prev);
    try {
      await removeProviderService(selectedSP.id, serviceId);
    } catch (err) {
      setSelectedSP((prev) => prev ? { ...prev, services: prevServices } : prev);
      setServicesError(err.message || 'Failed to remove service');
    } finally {
      setServicesBusy(false);
    }
  };

  const handleRowClick = (sp) => {
    handleViewDetails(sp);
  };

  const getStatusClass = (status) => {
    const statusMap = {
      Active: "status-active",
      Pending: "status-pending",
      Suspended: "status-suspended",
      Offline: "status-offline",
    };
    return statusMap[status] || "status-default";
  };

  const getAvailabilityClass = (availability) => {
    const availMap = {
      Online: "avail-online", ONLINE: "avail-online",
      Offline: "avail-offline", OFFLINE: "avail-offline",
      Busy: "avail-busy", BUSY: "avail-busy",
    };
    return availMap[availability] || "avail-offline";
  };

  return (
    <div className="sp-management">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-header-content">
          <div>
            <h1 className="sp-title">
              Service Provider Management
              <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 400, color: wsConnected ? '#10b981' : '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: wsConnected ? '#10b981' : '#9ca3af', display: 'inline-block' }} />
                {wsConnected ? 'Live' : 'Connecting…'}
              </span>
            </h1>
            <p className="sp-subtitle">
              Manage and monitor all service providers on the platform
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="sp-stats-grid">
        <div className="sp-stat-card">
          <div className="stat-icon active">
            <UserCheck size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Active SPs</div>
            <div className="stat-value">{summary?.activeProviders ?? "—"}</div>
          </div>
        </div>
        <div className="sp-stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending Requests</div>
            <div className="stat-value">{summary?.pendingRequests ?? "—"}</div>
          </div>
        </div>
        <div className="sp-stat-card">
          <div className="stat-icon online">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Online Now</div>
            <div className="stat-value">
              {serviceProviders.filter((sp) => sp.availability === "Online").length}
            </div>
          </div>
        </div>
        <div className="sp-stat-card">
          <div className="stat-icon earnings">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Providers</div>
            <div className="stat-value">{summary?.totalProviders ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sp-filters-section">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, phone, or email..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </div>
        <div className="filter-dropdowns">
          <div className="filter-dropdown">
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="All">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div className="filter-dropdown">
            <select
              className="filter-select"
              value={filters.zoneId}
              onChange={(e) => handleFilterChange("zoneId", e.target.value)}
            >
              <option value="All">All Zones</option>
              {zones.map((z) => (
                <option key={z.id ?? z._id} value={z.id ?? z._id}>{z.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-dropdown">
            <select
              className="filter-select"
              value={filters.liveStatus}
              onChange={(e) => handleFilterChange("liveStatus", e.target.value)}
            >
              <option value="All">All</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="BUSY">Busy</option>
            </select>
          </div>
        </div>
      </div>

      {/* SP Table */}
      <div className="sp-table-container">
        <table className="sp-table">
          <thead>
            <tr>
              <th>SP PROFILE</th>
              <th>CONTACT</th>
              <th>STATUS</th>
              <th>AVAILABILITY</th>
              <th>ZONE</th>
              <th>RATING</th>
              <th>EARNINGS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {spLoading ? (
              <tr>
                <td colSpan={8} className="loading-message">Loading service providers...</td>
              </tr>
            ) : spError ? (
              <tr>
                <td colSpan={8} className="loading-message">{spError}</td>
              </tr>
            ) : serviceProviders.length === 0 ? (
              <tr>
                <td colSpan={8} className="loading-message">No service providers found.</td>
              </tr>
            ) : (
              serviceProviders.map((sp) => (
                <tr
                  key={sp.id}
                  className="sp-table-row"
                  onClick={() => handleRowClick(sp)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="sp-profile-column">
                    <div className="sp-profile-cell">
                      <div className="sp-avatar">
                        {(sp.name || "—")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "SP"}
                      </div>
                      <div className="sp-info">
                        <div className="sp-name">
                          {sp.name}
                          {sp.verified && (
                            <CheckCircle size={16} className="verified-icon" />
                          )}
                        </div>
                        <div className="sp-id">#{sp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="sp-contact-column">
                    <div className="contact-item">
                      <Phone size={14} />
                      <span>{sp.phone}</span>
                    </div>
                    <div className="contact-item">
                      <Mail size={14} />
                      <span>{sp.email}</span>
                    </div>
                  </td>
                  <td className="sp-status-column">
                    <span className={`status-badge ${getStatusClass(sp.status)}`}>
                      {sp.status}
                    </span>
                  </td>
                  <td className="sp-availability-column">
                    <span
                      className={`availability-badge ${getAvailabilityClass(sp.availability)}`}
                    >
                      <span className="availability-dot"></span>
                      {sp.availability}
                    </span>
                  </td>
                  <td className="sp-zone-column">
                    <div className="zone-cell">
                      <MapPin size={14} />
                      <span>{sp.zone}</span>
                    </div>
                  </td>
                  <td className="sp-rating-column">
                    <div className="rating-cell">
                      <Star size={16} className="star-icon" />
                      <span>{sp.rating}</span>
                      <span className="rating-count">({sp.totalOrders})</span>
                    </div>
                  </td>
                  <td className="sp-earnings-column">
                    <div className="earnings-amount">
                      <span className="riyal-symbol">&#x20C1;</span>
                      {(Number(sp.totalEarnings) || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </td>
                  <td
                    className="sp-actions-column"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="action-buttons">
                      <button
                        className="action-btn view"
                        onClick={() => handleViewDetails(sp)}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SP Detail Modal */}
      {isModalOpen && selectedSP && (
        <div className="sp-detail-modal-overlay" onClick={closeModal}>
          <div
            className="sp-detail-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header */}
            <div className="sp-profile-header">
              <div className="sp-profile-main">
                <div className="sp-profile-avatar-large">
                  {selectedSP.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="sp-profile-info">
                  <div className="sp-profile-name-row">
                    <h2 className="sp-profile-name">{selectedSP.name}</h2>
                    {selectedSP.verified && (
                      <span className="sp-verified-badge">VERIFIED</span>
                    )}
                  </div>
                  <p className="sp-profile-role">Service Provider</p>
                  <div className="sp-profile-meta">
                    <span className="sp-profile-location">
                      <MapPin size={14} />
                      {selectedSP.zone}
                    </span>
                    <span className="sp-profile-join-date">
                      Joined{" "}
                      {new Date(selectedSP.joinDate).toLocaleDateString(
                        "en-US",
                        { month: "long", year: "numeric" },
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="sp-profile-actions">
                <button className="sp-action-btn secondary">
                  <MessageSquare size={18} />
                  Message
                </button>
                <button
                  className="sp-detail-modal-close-btn"
                  onClick={closeModal}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="sp-detail-modal-body">
              {detailsLoading ? (
                <div className="sp-modal-loading">
                  <Loader2 size={48} className="animate-spin" />
                  <p>Fetching full details...</p>
                </div>
              ) : (
                <>
                  {/* Tabs Navigation */}
                  <div className="sp-modal-tabs">
                    <button className={`sp-tab ${activeTab === "performance" ? "active" : ""}`} onClick={() => setActiveTab("performance")}>Performance & Orders</button>
                    <button className={`sp-tab ${activeTab === "bio" ? "active" : ""}`} onClick={() => setActiveTab("bio")}>Bio & Info</button>
                    <button className={`sp-tab ${activeTab === "services" ? "active" : ""}`} onClick={() => setActiveTab("services")}>
                      Services {selectedSP.services?.length > 0 && <span style={{ marginLeft: '4px', background: '#fcc246', color: '#1a1a1a', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>{selectedSP.services.length}</span>}
                    </button>
                    <button className={`sp-tab ${activeTab === "documents" ? "active" : ""}`} onClick={() => setActiveTab("documents")}>Documents</button>
                    <button className={`sp-tab ${activeTab === "wallet" ? "active" : ""}`} onClick={() => setActiveTab("wallet")}>Wallet</button>
                    <button className={`sp-tab ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>Settings</button>
                  </div>

                  {/* Tab Content */}
                  <div className="sp-tab-content">
                    {/* Performance & Orders Tab */}
                    {activeTab === "performance" && (
                      <div className="modal-section">
                        {/* Performance Metrics Cards */}
                        {(() => {
                          const completedOrders = spOrders.filter(o => o.status?.toUpperCase() === 'COMPLETED')
                          const activeOrders = spOrders.filter(o => !['COMPLETED','CANCELLED'].includes(o.status?.toUpperCase()))
                          const totalOrderCount = spOrders.length || selectedSP.totalOrders || 0
                          const totalEarnings = completedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || selectedSP.totalEarnings || 0
                          const rating = selectedSP.rating || 0
                          return (
                            <div className="performance-metrics-grid">
                              <div className="performance-metric-card">
                                <div className="metric-icon-wrapper">
                                  <ShoppingCart size={24} />
                                </div>
                                <div className="metric-content">
                                  <div className="metric-label">TOTAL ORDERS</div>
                                  <div className="metric-value-large">{totalOrderCount}</div>
                                  <div className="metric-change positive">
                                    {completedOrders.length} completed · {activeOrders.length} active
                                  </div>
                                </div>
                              </div>
                              <div className="performance-metric-card">
                                <div className="metric-icon-wrapper">
                                  <Star size={24} />
                                </div>
                                <div className="metric-content">
                                  <div className="metric-label">AVERAGE RATING</div>
                                  <div className="metric-value-large">{rating}</div>
                                  <div className="metric-stars">
                                    {[1,2,3,4,5].map(star => (
                                      <Star
                                        key={star}
                                        size={16}
                                        className={star <= Math.floor(rating) ? "star-filled" : "star-empty"}
                                        fill={star <= rating ? "#FCC246" : "none"}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="performance-metric-card">
                                <div className="metric-icon-wrapper">
                                  <Wallet size={24} />
                                </div>
                                <div className="metric-content">
                                  <div className="metric-label">TOTAL EARNINGS</div>
                                  <div className="metric-value-large">
                                    <span className="riyal-symbol">&#x20C1;</span>
                                    {totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  <div className="metric-change positive">
                                    from {completedOrders.length} completed orders
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })()}

                        {/* All Orders from API */}
                        {spOrdersLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0', color: '#6b7280' }}>
                            <Loader2 size={20} className="animate-spin" />
                            <span>Loading orders...</span>
                          </div>
                        ) : (() => {
                          const activeOrders = spOrders.filter(o =>
                            !['COMPLETED', 'CANCELLED'].includes(o.status?.toUpperCase())
                          )
                          const completedOrders = spOrders.filter(o =>
                            o.status?.toUpperCase() === 'COMPLETED'
                          )
                          return (
                            <>
                              <div className="orders-section">
                                <div className="orders-section-header">
                                  <h3 className="orders-section-title">
                                    Active Orders
                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 500, color: '#6b7280' }}>({activeOrders.length})</span>
                                  </h3>
                                </div>
                                <div className="orders-table-wrapper">
                                  <table className="orders-table">
                                    <thead>
                                      <tr>
                                        <th>ORDER ID</th>
                                        <th>SERVICE</th>
                                        <th>CUSTOMER</th>
                                        <th>DATE</th>
                                        <th>STATUS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {activeOrders.length > 0 ? activeOrders.map((order) => (
                                        <tr key={order.id}>
                                          <td className="order-id-cell">{order.order_no ?? `#${order.id?.slice(0, 8)}`}</td>
                                          <td>{order.service?.name_en ?? order.service?.name ?? '—'}</td>
                                          <td>{order.customer?.profile?.full_name ?? order.customer?.profile?.company_name ?? order.customer?.full_name ?? '—'}</td>
                                          <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td>
                                          <td><span className={`order-status-badge ${order.status?.toLowerCase().replace(/[^a-z]/g, '-')}`}>{order.status}</span></td>
                                        </tr>
                                      )) : (
                                        <tr><td colSpan="5" className="no-orders-message">No active orders</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div className="orders-section">
                                <div className="orders-section-header">
                                  <h3 className="orders-section-title">
                                    Completed Orders
                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 500, color: '#6b7280' }}>({completedOrders.length})</span>
                                  </h3>
                                </div>
                                <div className="orders-table-wrapper">
                                  <table className="orders-table">
                                    <thead>
                                      <tr>
                                        <th>ORDER ID</th>
                                        <th>SERVICE</th>
                                        <th>CUSTOMER</th>
                                        <th>AMOUNT</th>
                                        <th>DATE</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {completedOrders.length > 0 ? completedOrders.map((order) => (
                                        <tr key={order.id}>
                                          <td className="order-id-cell">{order.order_no ?? `#${order.id?.slice(0, 8)}`}</td>
                                          <td>{order.service?.name_en ?? order.service?.name ?? '—'}</td>
                                          <td>{order.customer?.profile?.full_name ?? order.customer?.profile?.company_name ?? order.customer?.full_name ?? '—'}</td>
                                          <td className="order-amount">
                                            <span className="riyal-symbol">&#x20C1;</span>
                                            {Number(order.total_price || 0).toFixed(2)}
                                          </td>
                                          <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td>
                                        </tr>
                                      )) : (
                                        <tr><td colSpan="5" className="no-orders-message">No completed orders</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {/* Bio & Skills Tab */}
                    {activeTab === "bio" && (
                      <div className="modal-section">
                        <div className="modal-info-grid">
                          <div className="modal-info-item">
                            <label>Name</label>
                            <div className="modal-user-info">
                              <div className="sp-avatar">
                                {selectedSP.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <span>{selectedSP.name}</span>
                              {selectedSP.verified && (
                                <CheckCircle size={20} className="verified-icon" />
                              )}
                            </div>
                          </div>
                          <div className="modal-info-item">
                            <label>Status</label>
                            <span
                              className={`status-badge ${getStatusClass(selectedSP.status)}`}
                            >
                              {selectedSP.status}
                            </span>
                          </div>
                          <div className="modal-info-item">
                            <label>Availability</label>
                            <span
                              className={`availability-badge ${getAvailabilityClass(selectedSP.availability)}`}
                            >
                              <span className="availability-dot"></span>
                              {selectedSP.availability}
                            </span>
                          </div>
                          <div className="modal-info-item">
                            <label>Join Date</label>
                            <span>{selectedSP.joinDate}</span>
                          </div>
                          <div className="modal-info-item">
                            <label>Phone</label>
                            <div className="modal-contact">
                              <Phone size={16} />
                              <span>{selectedSP.phone}</span>
                            </div>
                          </div>
                          <div className="modal-info-item">
                            <label>Email</label>
                            <div className="modal-contact">
                              <Mail size={16} />
                              <span>{selectedSP.email}</span>
                            </div>
                          </div>
                          <div className="modal-info-item">
                            <label>Service Zone</label>
                            <div className="modal-contact">
                              <MapPin size={16} />
                              <span>{selectedSP.zone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Wallet Balance Tab */}
                    {activeTab === "wallet" && (
                      <div className="modal-section">
                        {(() => {
                          const w = selectedSP.wallet
                          const fmt = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          return (
                            <>
                              <div className="modal-info-grid">
                                <div className="modal-info-item">
                                  <label>Available Balance</label>
                                  <span className="metric-value earnings">
                                    <span className="riyal-symbol">&#x20C1;</span>{fmt(w?.available_balance ?? selectedSP.walletBalance)}
                                  </span>
                                </div>
                                <div className="modal-info-item">
                                  <label>Locked Balance</label>
                                  <span className="metric-value">
                                    <span className="riyal-symbol">&#x20C1;</span>{fmt(w?.locked_balance)}
                                  </span>
                                </div>
                                <div className="modal-info-item">
                                  <label>Total Credited</label>
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                    <span className="riyal-symbol">&#x20C1;</span>{fmt(w?.total_credited)}
                                  </span>
                                </div>
                                <div className="modal-info-item">
                                  <label>Total Debited</label>
                                  <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                    <span className="riyal-symbol">&#x20C1;</span>{fmt(w?.total_debited)}
                                  </span>
                                </div>
                                <div className="modal-info-item">
                                  <label>Currency</label>
                                  <span>{w?.currency ?? 'SAR'}</span>
                                </div>
                                <div className="modal-info-item">
                                  <label>Wallet Status</label>
                                  <span className={`status-badge ${w?.status === 'ACTIVE' ? 'status-active' : 'status-suspended'}`}>{w?.status ?? '—'}</span>
                                </div>
                              </div>
                              {selectedSP.bankAccounts?.length > 0 && (
                                <div style={{ marginTop: '1.25rem' }}>
                                  <h3 className="modal-section-title">Bank Accounts</h3>
                                  {selectedSP.bankAccounts.map((acc, i) => (
                                    <div key={i} style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                      <div><strong>{acc.bank_name ?? acc.bankName ?? 'Bank'}</strong> — {acc.account_number ?? acc.accountNumber ?? '—'}</div>
                                      {acc.iban && <div style={{ color: '#6b7280' }}>IBAN: {acc.iban}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === "settings" && (
                      <div className="modal-section">
                        <div className="settings-section">
                          <h3 className="modal-section-title">Account Status</h3>
                          <div className="settings-item">
                            <div className="settings-item-content">
                              <div className="settings-item-info">
                                <label className="settings-label">
                                  Deactivate Account
                                </label>
                                <p className="settings-description">
                                  Deactivating this account will prevent the service
                                  provider from accessing the platform and receiving
                                  new orders.
                                </p>
                              </div>
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedSP.status === "INACTIVE" ||
                                    selectedSP.status === "SUSPENDED" ||
                                    selectedSP.status === "Inactive" ||
                                    selectedSP.status === "Suspended"
                                  }
                                  onChange={async (e) => {
                                    const newStatus = e.target.checked ? "INACTIVE" : "ACTIVE";
                                    try {
                                      await updateProviderStatus(selectedSP.id, newStatus);
                                      setSelectedSP({ ...selectedSP, status: newStatus });
                                      setServiceProviders((prev) =>
                                        prev.map((s) => s.id === selectedSP.id ? { ...s, status: newStatus } : s)
                                      );
                                    } catch (err) {
                                      console.error("Failed to update provider status:", err);
                                    }
                                  }}
                                />
                                <span className="toggle-slider"></span>
                              </label>
                            </div>
                          </div>
                          <div className="settings-warning">
                            <AlertCircle size={16} />
                            <span>
                              {["INACTIVE","SUSPENDED","Inactive","Suspended"].includes(selectedSP.status)
                                ? "This account is currently deactivated."
                                : "This account is currently active."}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verified Documents Tab */}
                    {activeTab === "documents" && (
                      <div className="modal-section">
                        <div className="modal-info-grid">
                          <div className="modal-info-item">
                            <label>Government ID</label>
                            {selectedSP.governmentId ? (
                              <a href={selectedSP.governmentId} target="_blank" rel="noopener noreferrer" className="document-link">
                                <FileText size={16} /><span>View Document</span>
                              </a>
                            ) : <span className="document-missing">Not provided</span>}
                          </div>
                          <div className="modal-info-item">
                            <label>Certification</label>
                            {selectedSP.certification ? (
                              <a href={selectedSP.certification} target="_blank" rel="noopener noreferrer" className="document-link">
                                <FileCheck size={16} /><span>View Document</span>
                              </a>
                            ) : <span className="document-missing">Not provided</span>}
                          </div>
                          <div className="modal-info-item">
                            <label>Insurance</label>
                            {selectedSP.insurance ? (
                              <a href={selectedSP.insurance} target="_blank" rel="noopener noreferrer" className="document-link">
                                <Shield size={16} /><span>View Document</span>
                              </a>
                            ) : <span className="document-missing">Not provided</span>}
                          </div>
                          <div className="modal-info-item">
                            <label>Business License</label>
                            {selectedSP.businessLicense ? (
                              <a href={selectedSP.businessLicense} target="_blank" rel="noopener noreferrer" className="document-link">
                                <Briefcase size={16} /><span>View Document</span>
                              </a>
                            ) : <span className="document-missing">Not provided</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SP Services Tab */}
                    {activeTab === "services" && (
                      <div className="modal-section">
                        {(() => {
                          const assignedIds = new Set(
                            (selectedSP.services ?? []).map((it) => (it.service?.id ?? it.service_id ?? it.id))
                          );
                          const available = allServices.filter((s) => !assignedIds.has(s.id));
                          return (
                            <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1a1a1a' }}>Assigned services</h4>
                                {!showAddService ? (
                                  <button
                                    type="button"
                                    onClick={() => { setShowAddService(true); setServicesError(''); }}
                                    disabled={servicesBusy || available.length === 0}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                                      padding: '6px 12px', borderRadius: '8px', border: '1px solid #fcc246',
                                      background: '#fcc246', color: '#1a1a1a', fontWeight: 600, fontSize: '0.82rem',
                                      cursor: available.length === 0 || servicesBusy ? 'not-allowed' : 'pointer',
                                      opacity: available.length === 0 || servicesBusy ? 0.6 : 1,
                                    }}
                                  >
                                    <Plus size={14} /> Add service
                                  </button>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <select
                                      value={selectedServiceToAdd}
                                      onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                                      disabled={servicesBusy}
                                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                    >
                                      <option value="">Select a service…</option>
                                      {available.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name_en ?? s.name ?? s.id}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={handleAddService}
                                      disabled={!selectedServiceToAdd || servicesBusy}
                                      style={{
                                        padding: '6px 12px', borderRadius: '8px', border: 'none',
                                        background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: '0.82rem',
                                        cursor: !selectedServiceToAdd || servicesBusy ? 'not-allowed' : 'pointer',
                                        opacity: !selectedServiceToAdd || servicesBusy ? 0.6 : 1,
                                      }}
                                    >
                                      {servicesBusy ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setShowAddService(false); setSelectedServiceToAdd(''); setServicesError(''); }}
                                      disabled={servicesBusy}
                                      style={{
                                        padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                        background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                              {servicesError && (
                                <div style={{ padding: '6px 10px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.8rem' }}>
                                  {servicesError}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {selectedSP.services && selectedSP.services.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {selectedSP.services.map((item) => {
                              const svc = item.service ?? item
                              const id = svc.id ?? item.service_id
                              return (
                                <div key={id} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '0.875rem 1rem', borderRadius: '10px',
                                  border: '1px solid #e2e8f0', background: '#fafafa'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                    <div style={{
                                      width: '38px', height: '38px', borderRadius: '8px', display: 'flex',
                                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                      background: svc.icon_color ? `${svc.icon_color}20` : '#f1f5f9',
                                    }}>
                                      <Briefcase size={18} style={{ color: svc.icon_color ?? '#64748b' }} />
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a' }}>
                                        {svc.name_en ?? svc.name ?? '—'}
                                      </div>
                                      {svc.name_ar && (
                                        <div style={{ fontSize: '0.78rem', color: '#6b7280', direction: 'rtl' }}>{svc.name_ar}</div>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                    {svc.base_price && (
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Base Price</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a' }}>
                                          <span className="riyal-symbol">&#x20C1;</span>{svc.base_price}
                                        </div>
                                      </div>
                                    )}
                                    {svc.duration_min && (
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Duration</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>{svc.duration_min} min</div>
                                      </div>
                                    )}
                                    <span style={{
                                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                                      background: item.is_active ? '#dcfce7' : '#fee2e2',
                                      color: item.is_active ? '#16a34a' : '#dc2626',
                                    }}>
                                      {item.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <button
                                      type="button"
                                      title="Remove service"
                                      onClick={() => handleRemoveService(id)}
                                      disabled={servicesBusy}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        border: '1px solid #fecaca', background: '#fff', color: '#dc2626',
                                        cursor: servicesBusy ? 'not-allowed' : 'pointer',
                                        opacity: servicesBusy ? 0.6 : 1,
                                      }}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="no-data-message">No services assigned</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceProviderManagement;
