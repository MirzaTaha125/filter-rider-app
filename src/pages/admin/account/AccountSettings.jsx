import { useState, useEffect } from "react";
import {
  Save,
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  X,
  CheckCircle,
} from "lucide-react";
import {
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
} from "../../../api";
import "./AccountSettings.css";

function AccountSettings() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    countryCode: "",
    role: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    bio: "",
    status: "",
    isEmailVerified: false,
    isPhoneVerified: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileApiAvailable, setProfileApiAvailable] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    "Your account settings have been updated successfully."
  );

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const profile = await getAdminProfile();
      if (profile) {
        setProfileApiAvailable(true);
        const rawRole = profile.roles?.[0] ?? profile.role ?? profile.admin_role ?? "";
        const formattedRole = rawRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        setFormData((prev) => ({
          ...prev,
          fullName: profile.full_name ?? profile.fullName ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          countryCode: profile.country_code ?? "",
          role: formattedRole,
          address: profile.address ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          zipCode: profile.zip_code ?? profile.zipCode ?? "",
          country: profile.country ?? "",
          bio: profile.admin?.bio ?? profile.bio ?? "",
          status: profile.status ?? "",
          isEmailVerified: profile.is_email_verified ?? false,
          isPhoneVerified: profile.is_phone_verified ?? false,
        }));
      } else {
        setProfileApiAvailable(false);
        setFormData((prev) => ({
          ...prev,
          fullName: "Admin User",
          email: "",
          phone: "",
          role: "Administrator",
          department: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
          bio: "Manage account via API when available.",
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to load profile");
      setProfileApiAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSave = async () => {
    if (!profileApiAvailable) {
      setShowSuccessModal(true);
      setSuccessMessage(
        "Profile API is not available. Settings saved locally."
      );
      setIsEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateAdminProfile({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        countryCode: formData.countryCode,
        role: formData.role,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        bio: formData.bio,
      });
      setSuccessMessage(
        "Your account settings have been updated successfully."
      );
      setShowSuccessModal(true);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadProfile();
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (!formData.newPassword || formData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      await changeAdminPassword(formData.currentPassword, formData.newPassword);
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setSuccessMessage("Your password has been changed successfully.");
      setShowSuccessModal(true);
    } catch (err) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="account-settings">
      <div className="account-settings-header">
        <div>
          <h1 className="account-settings-title">Account Settings</h1>
          <p className="account-settings-subtitle">
            Manage your account information and preferences
          </p>
        </div>
        {activeTab !== "security" &&
          (!isEditing ? (
            <button
              className="btn-edit-profile"
              onClick={() => setIsEditing(true)}
            >
              <User size={18} />
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="btn-cancel" onClick={handleCancel}>
                <X size={18} />
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={saving || loading}
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ))}
      </div>

      {error && activeTab !== "security" && (
        <p className="account-error">{error}</p>
      )}

      {loading ? (
        <p className="account-loading">Loading account...</p>
      ) : (
        <div className="account-settings-container">
          <div className="settings-tabs">
            <button
              className={`settings-tab ${
                activeTab === "profile" ? "active" : ""
              }`}
              onClick={() => setActiveTab("profile")}
            >
              <User size={18} />
              Profile
            </button>
            <button
              className={`settings-tab ${
                activeTab === "contact" ? "active" : ""
              }`}
              onClick={() => setActiveTab("contact")}
            >
              <Mail size={18} />
              Contact
            </button>
            <button
              className={`settings-tab ${
                activeTab === "security" ? "active" : ""
              }`}
              onClick={() => setActiveTab("security")}
            >
              <Lock size={18} />
              Security
            </button>
          </div>

          <div className="settings-content">
            {activeTab === "profile" && (
              <div className="settings-section">
                <div className="profile-picture-section">
                  <div className="profile-picture-wrapper">
                    <div className="profile-picture">
                      <User size={48} />
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        className="btn-change-picture"
                        disabled
                      >
                        <Camera size={18} />
                        Change Photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">Personal Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="fullName">Full Name</label>
                      <input
                        type="text"
                        id="fullName"
                        className="form-input"
                        value={formData.fullName}
                        onChange={(e) =>
                          handleInputChange("fullName", e.target.value)
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="role">Role</label>
                      <input
                        type="text"
                        id="role"
                        className="form-input"
                        value={formData.role}
                        onChange={(e) =>
                          handleInputChange("role", e.target.value)
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="bio">Bio</label>
                      <textarea
                        id="bio"
                        className="form-textarea"
                        value={formData.bio}
                        onChange={(e) =>
                          handleInputChange("bio", e.target.value)
                        }
                        disabled={!isEditing}
                        rows="4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "contact" && (
              <div className="settings-section">
                <div className="form-section">
                  <h3 className="section-title">Contact Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="email">
                        <Mail size={16} />
                        Email Address
                        {formData.isEmailVerified
                          ? <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>✓ Verified</span>
                          : <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>✗ Unverified</span>}
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="form-input"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">
                        <Phone size={16} />
                        Phone Number
                        {formData.isPhoneVerified
                          ? <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>✓ Verified</span>
                          : <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>✗ Unverified</span>}
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        className="form-input"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="countryCode">Country Code</label>
                      <input
                        type="text"
                        id="countryCode"
                        className="form-input"
                        value={formData.countryCode}
                        onChange={(e) => handleInputChange("countryCode", e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g. SA"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="status">Account Status</label>
                      <input
                        type="text"
                        id="status"
                        className="form-input"
                        value={formData.status}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="settings-section">
                <div className="form-section">
                  <h3 className="section-title">Change Password</h3>
                  {passwordError && (
                    <p className="account-error">{passwordError}</p>
                  )}
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label htmlFor="currentPassword">Current Password</label>
                      <input
                        type="password"
                        id="currentPassword"
                        className="form-input"
                        value={formData.currentPassword}
                        onChange={(e) => {
                          handleInputChange("currentPassword", e.target.value);
                          setPasswordError("");
                        }}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="newPassword">New Password</label>
                      <input
                        type="password"
                        id="newPassword"
                        className="form-input"
                        value={formData.newPassword}
                        onChange={(e) => {
                          handleInputChange("newPassword", e.target.value);
                          setPasswordError("");
                        }}
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="confirmPassword">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        className="form-input"
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          handleInputChange("confirmPassword", e.target.value);
                          setPasswordError("");
                        }}
                        placeholder="Confirm new password"
                      />
                    </div>

                    <div className="form-group full-width">
                      <button
                        type="button"
                        className="btn-change-password"
                        onClick={handleChangePassword}
                        disabled={
                          passwordSaving ||
                          !formData.currentPassword ||
                          !formData.newPassword ||
                          !formData.confirmPassword
                        }
                      >
                        {passwordSaving ? "Changing..." : "Change Password"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="modal-content success-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="success-modal-content">
              <div className="success-icon-wrapper">
                <CheckCircle size={48} />
              </div>
              <h3 className="success-title">Settings Saved</h3>
              <p className="success-message">{successMessage}</p>
              <button
                className="btn-success-close"
                onClick={() => setShowSuccessModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountSettings;
