import { useState, useEffect, useRef } from "react";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  FileCheck,
  Shield,
  Briefcase,
  Clock,
  UserCheck,
  Car,
  Home,
  Check,
  X as XIcon,
  Loader2,
  Wind,
  Droplets,
  Sparkles,
} from "lucide-react";
import "./SPRequestManagement.css";
import { getProviderRequests, getProviderRequestDetails, acceptProviderRequest, rejectProviderRequest, getServices } from "../../../api";
import { mapProviderToRequest } from '../../../utils/spDocuments'


function SPRequestManagement() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null); // 'accept' or 'reject'
  const [rejectionReason, setRejectionReason] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "PENDING",
  });

  const [spRequests, setSpRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'warning' }
  const toastTimerRef = useRef(null);

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchRequests();
    fetchServices();
  }, [filters.status, filters.search]);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getProviderRequests({
        status: filters.status,
        search: filters.search || undefined,
        limit: 100
      });
      const list = Array.isArray(response)
        ? response
        : (response?.items ?? response?.requests ?? response?.data ?? []);
      setSpRequests(list.map(mapProviderToRequest));
    } catch (err) {
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const svcs = await getServices(null, true);
      const list = Array.isArray(svcs) ? svcs : (svcs?.data ?? []);
      setAllServices(list.map(s => ({
        id: s.id || s._id,
        name: s.name_en || s.name,
        icon: getServiceIcon(s.icon),
        color: s.icon_color || "#3b82f6"
      })));
    } catch (err) {
      console.error("Failed to fetch services:", err);
    }
  };

  const getServiceIcon = (iconName) => {
    const ICON_MAP = {
      car_wash: Car, car: Car,
      carpet_cleaning: Home, carpet: Home, home: Home,
      ac_cleaning: Wind, ac: Wind,
      toilet_cleaning: Droplets, toilet: Droplets,
      sparkles: Sparkles
    };
    return ICON_MAP[iconName?.toLowerCase()] || Sparkles;
  };


  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReview = async (request) => {
    setSelectedRequest(request);
    setIsReviewModalOpen(true);
    setDetailsLoading(true);
    try {
      const raw = await getProviderRequestDetails(request.id);
      // client.js already unwraps data — raw is the provider request object directly
      setSelectedRequest(mapProviderToRequest(raw));
    } catch (err) {
      console.error("Failed to load provider details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedRequest(null);
  };

  const handleActionClick = (type) => {
    setActionType(type);
    setIsActionModalOpen(true);
  };

  const closeActionModal = () => {
    setIsActionModalOpen(false);
    setActionType(null);
    setRejectionReason("");
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;
    setActionSaving(true);
    try {
      await acceptProviderRequest(selectedRequest.id);
      showToast(`${selectedRequest.fullName} has been accepted and activated!`, 'success');
      closeActionModal();
      closeReviewModal();
      fetchRequests();
    } catch (err) {
      showToast("Failed to accept request: " + err.message, 'error');
    } finally {
      setActionSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      showToast("Please provide a reason for rejection", 'warning');
      return;
    }
    setActionSaving(true);
    try {
      await rejectProviderRequest(selectedRequest.id, rejectionReason);
      showToast(`${selectedRequest.fullName} has been rejected.`, 'success');
      closeActionModal();
      closeReviewModal();
      setRejectionReason("");
      fetchRequests();
    } catch (err) {
      showToast("Failed to reject request: " + err.message, 'error');
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div className="sp-request-management">
      {/* Toast Notification */}
      {toast && (
        <div className={`spr-toast spr-toast--${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'error' && <XCircle size={18} />}
          {toast.type === 'warning' && <Clock size={18} />}
          <span>{toast.message}</span>
          <button className="spr-toast-close" onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}

      {/* Header */}
      <div className="spr-header">
        <div className="spr-header-content">
          <div>
            <h1 className="spr-title">SP Requests</h1>
            <p className="spr-subtitle">
              Review and verify new service provider registration requests
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="spr-stats-grid">
        <div className="spr-stat-card">
          <div className="spr-stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="spr-stat-content">
            <div className="spr-stat-label">Shown Requests</div>
            <div className="spr-stat-value">
              {loading ? "..." : spRequests.length}
            </div>
          </div>
        </div>
        <div className="spr-stat-card">
          <div className="spr-stat-icon total">
            <UserCheck size={24} />
          </div>
          <div className="spr-stat-content">
            <div className="spr-stat-label">Filtered Status</div>
            <div className="spr-stat-value">{filters.status}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="spr-filters-section">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or phone..."
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
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="spr-table-container">
        <table className="spr-table">
          <thead>
            <tr>
              <th>REQUEST ID</th>
              <th>NAME</th>
              <th>CONTACT</th>
              <th>ZONE</th>
              <th>SUBMITTED DATE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="loading-message">Loading requests...</td></tr>
            ) : error ? (
              <tr><td colSpan="7" className="loading-message error">{error}</td></tr>
            ) : spRequests.length > 0 ? (
              spRequests.map((request) => (
                <tr key={request.id} className="spr-table-row">
                  <td className="spr-id-column">#{request.id}</td>
                  <td className="spr-name-column">
                    <div className="spr-name-cell">
                      <div className="spr-avatar">
                        {(request.fullName || "SP")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span>{request.fullName}</span>
                    </div>
                  </td>
                  <td className="spr-contact-column">
                    <div className="contact-item">
                      <Phone size={14} />
                      <span>{request.phone}</span>
                    </div>
                    <div className="contact-item">
                      <Mail size={14} />
                      <span>{request.email}</span>
                    </div>
                  </td>
                  <td className="spr-zone-column">
                    <div className="zone-cell">
                      <MapPin size={14} />
                      <span>{request.zone}</span>
                    </div>
                  </td>
                  <td className="spr-date-column">
                    {request.submittedDate !== "—" ? new Date(request.submittedDate).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    ) : "—"}
                  </td>
                  <td className="spr-status-column">
                    <span className={`status-badge status-${request.status?.toLowerCase()}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="spr-actions-column">
                    <button
                      className="action-btn review"
                      onClick={() => handleReview(request)}
                    >
                      <Eye size={16} />
                      Review
                    </button>
                    {request.status?.toUpperCase() === 'PENDING' && (
                      <>
                        <button
                          className="action-btn accept"
                          onClick={() => {
                            setSelectedRequest(request);
                            setActionType('accept');
                            setIsActionModalOpen(true);
                          }}
                        >
                          <Check size={16} />
                          Accept
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={() => {
                            setSelectedRequest(request);
                            setActionType('reject');
                            setIsActionModalOpen(true);
                          }}
                        >
                          <XIcon size={16} />
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-requests-message">
                  No requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && selectedRequest && (
        <div className="spr-review-modal-overlay" onClick={closeReviewModal}>
          <div
            className="spr-review-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="spr-review-modal-header">
              <div>
                <h2 className="spr-review-modal-title">Review SP Request</h2>
                <p className="spr-review-modal-subtitle">
                  #{selectedRequest.id}
                </p>
              </div>
              <button
                className="spr-review-modal-close-btn"
                onClick={closeReviewModal}
              >
                <X size={24} />
              </button>
            </div>

            <div className="spr-review-modal-body">
              {detailsLoading ? (
                <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}>
                  <Loader2 className="animate-spin" size={40} />
                  <p>Loading provider details...</p>
                </div>
              ) : (
                <>
                  {/* Personal Information Section */}
                  <div className="review-section">
                    <h3 className="review-section-title">Personal Information</h3>
                    <div className="review-info-grid">
                      <div className="review-info-item">
                        <label>Full Name</label>
                        <span>{selectedRequest.personalInfo.fullName}</span>
                      </div>
                      <div className="review-info-item">
                        <label>Email</label>
                        <span>{selectedRequest.personalInfo.email}</span>
                      </div>
                      <div className="review-info-item">
                        <label>Phone</label>
                        <span>{selectedRequest.personalInfo.phone}</span>
                      </div>
                      <div className="review-info-item">
                        <label>Zone</label>
                        <span>{selectedRequest.personalInfo.zone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="review-section">
                    <h3 className="review-section-title">Documents</h3>
                    <div className="review-info-grid">
                      <div className="review-info-item">
                        <label>Government ID</label>
                        {selectedRequest.documents.governmentId ? (
                          <a href={selectedRequest.documents.governmentId} target="_blank" rel="noopener noreferrer" className="document-link">
                            <FileText size={16} /><span>View Document</span>
                          </a>
                        ) : (
                          <span className="document-missing">Not provided</span>
                        )}
                      </div>
                      <div className="review-info-item">
                        <label>Certification</label>
                        {selectedRequest.documents.certification ? (
                          <a href={selectedRequest.documents.certification} target="_blank" rel="noopener noreferrer" className="document-link">
                            <FileCheck size={16} /><span>View Document</span>
                          </a>
                        ) : (
                          <span className="document-missing">Not provided</span>
                        )}
                      </div>
                      <div className="review-info-item">
                        <label>Insurance</label>
                        {selectedRequest.documents.insurance ? (
                          <a href={selectedRequest.documents.insurance} target="_blank" rel="noopener noreferrer" className="document-link">
                            <Shield size={16} /><span>View Document</span>
                          </a>
                        ) : (
                          <span className="document-missing">Not provided</span>
                        )}
                      </div>
                      <div className="review-info-item">
                        <label>Business License</label>
                        {selectedRequest.documents.businessLicense ? (
                          <a href={selectedRequest.documents.businessLicense} target="_blank" rel="noopener noreferrer" className="document-link">
                            <Briefcase size={16} /><span>View Document</span>
                          </a>
                        ) : (
                          <span className="document-missing">Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Services Section */}
                  <div className="review-section">
                    <h3 className="review-section-title">Selected Services</h3>
                    <div className="review-services">
                      {(() => {
                        const list = selectedRequest.selectedServices?.length > 0
                          ? selectedRequest.selectedServices
                          : selectedRequest.services ?? [];
                        if (list.length === 0) return <p className="no-data-message">No services selected</p>;
                        return list.map((item) => {
                          const svc = item.service ?? item;
                          const id = svc.id ?? item.service_id;
                          return (
                            <div key={id} className="review-service-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                              <div style={{ width: 32, height: 32, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: svc.icon_color ? `${svc.icon_color}20` : '#f1f5f9', color: svc.icon_color ?? '#64748b', flexShrink: 0, fontSize: '1rem', fontWeight: 700 }}>
                                {(svc.name_en ?? svc.name ?? '?')[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{svc.name_en ?? svc.name ?? '—'}</div>
                                {svc.base_price && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Base: {svc.base_price} {svc.currency ?? 'SAR'} · {svc.duration_min} min</div>}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="spr-review-modal-footer">
              <button
                className="btn-action-secondary"
                onClick={closeReviewModal}
                disabled={detailsLoading}
              >
                Cancel
              </button>
              {!detailsLoading && selectedRequest.status?.toUpperCase() === 'PENDING' && (
                <div className="action-buttons-group">
                  <button
                    className="btn-action-reject"
                    onClick={() => handleActionClick("reject")}
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                  <button
                    className="btn-action-accept"
                    onClick={() => handleActionClick("accept")}
                  >
                    <CheckCircle size={18} />
                    Accept
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accept/Reject Action Modal */}
      {isActionModalOpen && (
        <div className="spr-action-modal-overlay" onClick={closeActionModal}>
          <div
            className="spr-action-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="spr-action-modal-header">
              <h3 className="spr-action-modal-title">
                {actionType === "accept" ? "Accept Request" : "Reject Request"}
              </h3>
              <button
                className="spr-action-modal-close-btn"
                onClick={closeActionModal}
              >
                <X size={24} />
              </button>
            </div>

            <div className="spr-action-modal-body">
              {actionType === "accept" ? (
                <div className="action-confirm-message">
                  <CheckCircle size={48} className="confirm-icon accept" />
                  <p>
                    Are you sure you want to accept this service provider
                    request?
                  </p>
                  <p className="confirm-details">
                    <strong>{selectedRequest?.fullName}</strong> will be
                    verified and activated.
                  </p>
                </div>
              ) : (
                <div className="action-confirm-message">
                  <XCircle size={48} className="confirm-icon reject" />
                  <p>Please provide a reason for rejecting this request:</p>
                  <textarea
                    className="rejection-reason-input"
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>

            <div className="spr-action-modal-footer">
              <button
                className="btn-action-secondary"
                onClick={closeActionModal}
                disabled={actionSaving}
              >
                Cancel
              </button>
              <button
                className={
                  actionType === "accept"
                    ? "btn-action-accept"
                    : "btn-action-reject"
                }
                onClick={actionType === "accept" ? handleAccept : handleReject}
                disabled={actionSaving}
              >
                {actionType === "accept" ? (
                  <>
                    {actionSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    {actionSaving ? "Processing..." : "Confirm Accept"}
                  </>
                ) : (
                  <>
                    {actionSaving ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                    {actionSaving ? "Processing..." : "Confirm Reject"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SPRequestManagement;
