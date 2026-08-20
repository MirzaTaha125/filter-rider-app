import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "../../contexts/PermissionsContext";
import frLogo from "../../assets/fr_logo.png";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Settings,
  X,
  Wallet,
  UserCheck,
  Wrench,
  DollarSign,
  FolderOpen,
  Tag,
  MessageSquare,
  AlertCircle,
  MapPin,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const isServicesActive = location.pathname.startsWith("/admin/services");
  const isPricingActive = location.pathname.startsWith("/admin/pricing");
  const isAssetsActive = location.pathname.startsWith("/admin/assets");
  const isCommunicationActive = location.pathname.startsWith(
    "/admin/communication",
  );
  const isWalletActive = location.pathname.startsWith("/admin/wallet");
  const isServiceProvidersActive = location.pathname.startsWith(
    "/admin/service-providers",
  );
  const [servicesOpen, setServicesOpen] = useState(isServicesActive);
  const [pricingOpen, setPricingOpen] = useState(isPricingActive);
  const [assetsOpen, setAssetsOpen] = useState(isAssetsActive);
  const [communicationOpen, setCommunicationOpen] = useState(
    isCommunicationActive,
  );
  const [walletOpen, setWalletOpen] = useState(isWalletActive);

  useEffect(() => {
    if (isServicesActive) {
      setServicesOpen(true);
    }
  }, [isServicesActive]);

  useEffect(() => {
    if (isPricingActive) {
      setPricingOpen(true);
    }
  }, [isPricingActive]);

  useEffect(() => {
    if (isAssetsActive) {
      setAssetsOpen(true);
    }
  }, [isAssetsActive]);

  useEffect(() => {
    if (isCommunicationActive) {
      setCommunicationOpen(true);
    }
  }, [isCommunicationActive]);

  useEffect(() => {
    if (isWalletActive) {
      setWalletOpen(true);
    }
  }, [isWalletActive]);


  const menuItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
    { path: "/admin/orders", label: "Orders", icon: ShoppingCart, permission: "orders.view" },
    { path: "/admin/customers", label: "Customers", icon: Users, permission: "customers.view" },
    { path: "/admin/promotions", label: "Promotions", icon: Tag, permission: "promotions.view" },
    { path: "/admin/disputes", label: "Disputes", icon: AlertCircle, permission: "disputes.view" },
    { path: "/admin/zones", label: "Zones", icon: MapPin, permission: "zones.view" },
    { path: "/admin/analytics", label: "Analytics", icon: TrendingUp, permission: "analytics.view" },
    { path: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.view" },
  ];

  const servicesSubItems = [
    { path: "/admin/services", label: "Services", permission: "services.view" },
    { path: "/admin/services/addons", label: "Add-ons", permission: "services.view" },
    { path: "/admin/services/pricing-matrix", label: "Pricing Matrix", permission: "services.view" },
  ];

  const pricingSubItems = [
    { path: "/admin/pricing", label: "Fee Configuration", permission: "pricing.view" },
    { path: "/admin/pricing/surge", label: "Surge Pricing", permission: "pricing.view" },
    { path: "/admin/pricing/regional", label: "Regional Pricing", permission: "pricing.view" },
  ];

  const assetsSubItems = [
    { path: "/admin/assets", label: "Categories", permission: "assets.view" },
    { path: "/admin/assets/sizes", label: "Size Categories", permission: "assets.view" },
  ];

  const communicationSubItems = [
    { path: "/admin/communication", label: "Email/SMS Templates", permission: "communication.view" },
    { path: "/admin/communication/push-notifications", label: "Push Notifications", permission: "communication.view" },
    { path: "/admin/communication/content", label: "Content Management", permission: "communication.view" },
  ];

  const walletSubItems = [
    { path: "/admin/wallet/payment-approval", label: "Payment Approval", permission: "wallet.view" },
    { path: "/admin/wallet/transaction-ledger", label: "Immutable Transaction Ledger", permission: "wallet.view" },
  ];

  const handleLinkClick = () => {
    onClose();
  };

  const toggleServices = () => {
    setServicesOpen(!servicesOpen);
  };

  const togglePricing = () => {
    setPricingOpen(!pricingOpen);
  };

  const toggleAssets = () => {
    setAssetsOpen(!assetsOpen);
  };

  const toggleCommunication = () => {
    setCommunicationOpen(!communicationOpen);
  };

  const toggleWallet = () => {
    setWalletOpen(!walletOpen);
  };


  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <button
        className="sidebar-close-btn"
        onClick={onClose}
        aria-label="Close sidebar"
      >
        <X size={20} />
      </button>
      <div className="sidebar-logo">
        <span
          className="sidebar-brand-logo"
          role="img"
          aria-label="Filter"
          style={{
            WebkitMaskImage: `url(${frLogo})`,
            maskImage: `url(${frLogo})`,
          }}
        />
        <span className="sidebar-brand-tagline">Car Services</span>
      </div>
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.slice(0, 3).filter(item => hasPermission(item.permission)).map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`sidebar-menu-item ${location.pathname === item.path ? "active" : ""
                    }`}
                  onClick={handleLinkClick}
                >
                  <span className="menu-icon">
                    <IconComponent size={20} />
                  </span>
                  <span className="menu-label">{item.label}</span>
                </Link>
              </li>
            );
          })}

          {/* Service Providers — single link; requests live in a tab on that page */}
          {hasPermission("providers.view") && (
            <li>
              <Link
                to="/admin/service-providers"
                className={`sidebar-menu-item ${isServiceProvidersActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <UserCheck size={20} />
                </span>
                <span className="menu-label">Service Providers</span>
              </Link>
            </li>
          )}

          {/* Services Dropdown */}
          {hasPermission("services.view") && <li>
            <button
              className={`sidebar-menu-item sidebar-dropdown-toggle ${isServicesActive ? "active" : ""
                }`}
              onClick={toggleServices}
            >
              <span className="menu-icon">
                <Wrench size={20} />
              </span>
              <span className="menu-label">Services</span>
              <span className={`dropdown-arrow ${servicesOpen ? "open" : ""}`}>
                {servicesOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            </button>
            <ul className={`sidebar-submenu ${servicesOpen ? "open" : ""}`}>
              {servicesSubItems.map((subItem) => (
                <li key={subItem.path}>
                  <Link
                    to={subItem.path}
                    className={`sidebar-submenu-item ${location.pathname === subItem.path ? "active" : ""
                      }`}
                    onClick={handleLinkClick}
                  >
                    {subItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>}

          {/* Pricing & Fees Dropdown */}
          {hasPermission("pricing.view") && <li>
            <button
              className={`sidebar-menu-item sidebar-dropdown-toggle ${isPricingActive ? "active" : ""
                }`}
              onClick={togglePricing}
            >
              <span className="menu-icon">
                <DollarSign size={20} />
              </span>
              <span className="menu-label">Pricing & Fees</span>
              <span className={`dropdown-arrow ${pricingOpen ? "open" : ""}`}>
                {pricingOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            </button>
            <ul className={`sidebar-submenu ${pricingOpen ? "open" : ""}`}>
              {pricingSubItems.map((subItem) => (
                <li key={subItem.path}>
                  <Link
                    to={subItem.path}
                    className={`sidebar-submenu-item ${location.pathname === subItem.path ? "active" : ""
                      }`}
                    onClick={handleLinkClick}
                  >
                    {subItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>}

          {/* Assets Dropdown */}
          {hasPermission("assets.view") && <li>
            <button
              className={`sidebar-menu-item sidebar-dropdown-toggle ${isAssetsActive ? "active" : ""
                }`}
              onClick={toggleAssets}
            >
              <span className="menu-icon">
                <FolderOpen size={20} />
              </span>
              <span className="menu-label">Assets</span>
              <span className={`dropdown-arrow ${assetsOpen ? "open" : ""}`}>
                {assetsOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            </button>
            <ul className={`sidebar-submenu ${assetsOpen ? "open" : ""}`}>
              {assetsSubItems.map((subItem) => (
                <li key={subItem.path}>
                  <Link
                    to={subItem.path}
                    className={`sidebar-submenu-item ${location.pathname === subItem.path ? "active" : ""
                      }`}
                    onClick={handleLinkClick}
                  >
                    {subItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>}

          {/* Communication Dropdown */}
          {hasPermission("communication.view") && <li>
            <button
              className={`sidebar-menu-item sidebar-dropdown-toggle ${isCommunicationActive ? "active" : ""
                }`}
              onClick={toggleCommunication}
            >
              <span className="menu-icon">
                <MessageSquare size={20} />
              </span>
              <span className="menu-label">Communication</span>
              <span
                className={`dropdown-arrow ${communicationOpen ? "open" : ""}`}
              >
                {communicationOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            </button>
            <ul
              className={`sidebar-submenu ${communicationOpen ? "open" : ""}`}
            >
              {communicationSubItems.map((subItem) => (
                <li key={subItem.path}>
                  <Link
                    to={subItem.path}
                    className={`sidebar-submenu-item ${location.pathname === subItem.path ? "active" : ""
                      }`}
                    onClick={handleLinkClick}
                  >
                    {subItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>}

          {/* Wallet Dropdown */}
          {hasPermission("wallet.view") && <li>
            <button
              className={`sidebar-menu-item sidebar-dropdown-toggle ${isWalletActive ? "active" : ""
                }`}
              onClick={toggleWallet}
            >
              <span className="menu-icon">
                <Wallet size={20} />
              </span>
              <span className="menu-label">Wallet</span>
              <span className={`dropdown-arrow ${walletOpen ? "open" : ""}`}>
                {walletOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            </button>
            <ul className={`sidebar-submenu ${walletOpen ? "open" : ""}`}>
              {walletSubItems.map((subItem) => (
                <li key={subItem.path}>
                  <Link
                    to={subItem.path}
                    className={`sidebar-submenu-item ${location.pathname === subItem.path ? "active" : ""
                      }`}
                    onClick={handleLinkClick}
                  >
                    {subItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>}

          {menuItems.slice(3).filter(item => hasPermission(item.permission)).map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`sidebar-menu-item ${location.pathname === item.path ? "active" : ""
                    }`}
                  onClick={handleLinkClick}
                >
                  <span className="menu-icon">
                    <IconComponent size={20} />
                  </span>
                  <span className="menu-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
