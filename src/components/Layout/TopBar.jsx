import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  User,
  ChevronDown,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { logout, getAdminProfile } from "../../api";
import { useTheme } from "../../context/ThemeContext";
import "./TopBar.css";

function TopBar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("Administrator");
  const dropdownRef = useRef(null);

  useEffect(() => {
    getAdminProfile().then((data) => {
      if (!data) return;
      const name = data.full_name ?? data.fullName ?? data.name ?? data.username ?? "";
      const roles = data.roles ?? [];
      setAdminName(name);
      if (roles.length > 0) {
        const r = roles[0];
        const raw = typeof r === "string" ? r : (r.name ?? "Administrator");
        setAdminRole(raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
      }
    });
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/admin" || path === "/admin/") return "Dashboard";
    const pathParts = path.split("/").filter(Boolean);
    if (pathParts.length > 1) {
      const segment = pathParts[1].replace(/-/g, " ");
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    return "Dashboard";
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate("/signin");
    setIsDropdownOpen(false);
  };

  const handleAccountSettings = () => {
    navigate("/admin/account");
    setIsDropdownOpen(false);
  };

  const initials = adminName
    ? adminName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : null;

  return (
    <header className="topbar">
      <div className="topbar-content">
        <div className="topbar-left">
          <button className="hamburger-btn" onClick={onMenuClick} aria-label="Toggle menu">
            <Menu size={24} />
          </button>
          <div className="page-title-section">
            <h1 className="page-title">{getPageTitle()}</h1>
            <p className="page-subtitle">Welcome back{adminName ? `, ${adminName.split(" ")[0]}` : ""}</p>
          </div>
        </div>

        <div className="topbar-right">
          <button 
            className="topbar-icon-btn theme-toggle-btn" 
            onClick={toggleTheme} 
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="topbar-divider"></div>
          <div className="profile-section" ref={dropdownRef}>
            <div
              className="profile-section-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-label="Profile menu"
            >
              <div className="topbar-profile-btn">
                <div className="profile-avatar">
                  {initials ?? <User size={20} />}
                </div>
              </div>
              <div className="profile-info">
                <span className="profile-name">{adminName || "Admin"}</span>
                <span className="profile-role">{adminRole}</span>
              </div>
              <div className="profile-dropdown-btn">
                <ChevronDown size={16} className={isDropdownOpen ? "rotated" : ""} />
              </div>
            </div>

            {isDropdownOpen && (
              <div className="profile-dropdown">
                <button className="dropdown-item" onClick={handleAccountSettings}>
                  <Settings size={18} />
                  <span>Account Settings</span>
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout-item" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
