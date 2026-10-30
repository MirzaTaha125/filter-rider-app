import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useSocket } from "../../contexts/SocketContext";
import { getChatUnreadCount } from "../../api";
import frLogo from "../../assets/fr_logo.png";
import {
  Star,
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
  Percent,
  FolderOpen,
  Tag,
  MessageSquare,
  MessagesSquare,
  AlertCircle,
  MapPin,
  ChevronDown,
  ChevronRight,
  BookOpen,
  CarFront,
  Calculator,
  Car,
  PackagePlus,
} from "lucide-react";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const {
    hasPermission,
    loadingPermissions,
    permissionsError,
    reloadPermissions,
  } = usePermissions();
  const isCategoryRoute =
    location.pathname === "/admin/assets" ||
    location.pathname === "/admin/assets/add" ||
    /^\/admin\/assets\/[^/]+\/edit$/.test(location.pathname);
  const isAddonsActive = location.pathname.startsWith("/admin/services/addons");
  const isServicesActive =
    location.pathname.startsWith("/admin/services") && !isAddonsActive;
  const isCommissionActive = location.pathname === "/admin/pricing";
  const isRewardsActive = location.pathname.startsWith("/admin/pricing/rewards");
  const isVehicleSizesActive = location.pathname.startsWith("/admin/assets/vehicle-sizes");
  const isVehicleTypesActive = location.pathname.startsWith("/admin/assets/vehicle-types");
  const isVehicleCatalogActive = location.pathname.startsWith("/admin/assets/vehicles");
  const isPriceSimulatorActive = location.pathname.startsWith("/admin/price-simulator");
  // Chat has its own top-level entry now, so it must not also open and
  // highlight the Communication dropdown.
  const isCommunicationActive =
    location.pathname.startsWith("/admin/communication") &&
    !location.pathname.startsWith("/admin/communication/chat");
  const isWalletActive = location.pathname.startsWith("/admin/wallet");
  const isServiceProvidersActive = location.pathname.startsWith(
    "/admin/service-providers",
  );
  const [communicationOpen, setCommunicationOpen] = useState(
    isCommunicationActive,
  );
  const [walletOpen, setWalletOpen] = useState(isWalletActive);
  const [chatUnread, setChatUnread] = useState(0);
  const { chatSocket } = useSocket();

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
    { path: "/admin/analytics", label: "Analytics", icon: TrendingUp, permission: "analytics.view" },
    { path: "/admin/customers", label: "Customers", icon: Users, permission: "customers.view" },
    { path: "/admin/promotions", label: "Promotions", icon: Tag, permission: "promotions.view" },
    // Chat is its own destination rather than a Communication sub-item: it is
    // something support lives in all day, and it carries the unread badge.
    { path: "/admin/communication/chat", label: "Chat", icon: MessagesSquare, permission: "chat.view", badge: "chat" },
    // Hidden for now — the /admin/disputes routes and their pages are all still
    // in place, so restoring this means uncommenting the line below and adding
    // AlertCircle back to the lucide-react import at the top.
    // { path: "/admin/disputes", label: "Disputes", icon: AlertCircle, permission: "disputes.view" },
    // Hidden for now — the /admin/zones routes and pages are still in place;
    // restoring this is just uncommenting the line below.
    // { path: "/admin/zones", label: "Zones", icon: MapPin, permission: "zones.view" },
    { path: "/admin/zone-settings", label: "Zone Settings", icon: MapPin, permission: "zones.view" },
    // ERP products / services copied for workshop orders (read-only; managed in the ERP).
    { path: "/admin/master-catalog", label: "Master Catalog", icon: BookOpen, permission: "services.view" },
    { path: "/admin/reviews", label: "Reviews", icon: Star, permission: "reviews.view" },
  ];

  // Add-ons and Pricing Matrix stay hidden. Their routes are still in place.
  // Pricing Matrix stays hidden. Its routes are still in place.

  const communicationSubItems = [
    { path: "/admin/communication", label: "Email/SMS Templates", permission: "templates.view" },
    { path: "/admin/communication/push-notifications", label: "Push Notifications", permission: "push_notifications.view" },
    { path: "/admin/communication/content", label: "Content Management", permission: "content_pages.view" },
  ];

  const walletSubItems = [
    { path: "/admin/wallet/payment-approval", label: "Payment Approval", permission: "wallet.approvals.view" },
    { path: "/admin/wallet/transaction-ledger", label: "Immutable Transaction Ledger", permission: "wallet.ledger.view" },
    { path: "/admin/wallet/penalties", label: "Penalties", permission: "wallet.penalties.view" },
    { path: "/admin/wallet/rules", label: "Wallet Rules", permission: "wallet.view" },
  ];

  // Unread chat count for the menu badge — refreshed on every new message and
  // whenever the route changes (opening a thread clears its count).
  const canSeeChat = hasPermission("chat.view");
  useEffect(() => {
    if (!canSeeChat) return
    let alive = true
    const refresh = () => {
      getChatUnreadCount()
        .then((res) => { if (alive) setChatUnread(Number(res?.unread) || 0) })
        .catch(() => {})
    }
    refresh()
    // The admin firehose, not the room event — room events only reach sockets
    // that joined that order, so the badge would never move unless the matching
    // thread happened to be open.
    chatSocket?.on("chat.admin.new_message", refresh)
    // Opening a conversation only changes a query param, so the route-change
    // refresh above never fires — ChatThread announces the read instead.
    window.addEventListener("admin:chat-read", refresh)
    return () => {
      alive = false
      chatSocket?.off("chat.admin.new_message", refresh)
      window.removeEventListener("admin:chat-read", refresh)
    }
  }, [canSeeChat, chatSocket, location.pathname]);

  // A dropdown is only worth showing when at least one of its children is.
  const visible = (items) => items.filter((item) => hasPermission(item.permission));
  const visibleCommunication = visible(communicationSubItems);
  const visibleWallet = visible(walletSubItems);

  const handleLinkClick = () => {
    onClose();
  };

  const isSubActive = (path) =>
    location.pathname === path ||
    (path !== "/admin/pricing" &&
      path !== "/admin/services" &&
      path !== "/admin/communication" &&
      path !== "/admin/wallet" &&
      location.pathname.startsWith(`${path}/`));

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
        {/* Menu gating is fail-closed, so an unloaded/failed permission fetch
            would otherwise render as a silently empty sidebar. */}
        {loadingPermissions && (
          <div className="shimmer-menu" aria-busy="true" aria-label="Loading menu">
            {Array.from({ length: 16 }, (_, index) => (
              <span key={index} className="shimmer shimmer-menu-item" />
            ))}
          </div>
        )}
        {!loadingPermissions && permissionsError && (
          <div className="sidebar-nav-notice sidebar-nav-notice--warn">
            <span>
              Couldn&apos;t load your permissions — showing the full menu.
              Is the API running?
            </span>
            <button type="button" onClick={reloadPermissions}>Retry</button>
          </div>
        )}
        <ul className="sidebar-menu">
          {menuItems.slice(0, 4).filter(item => hasPermission(item.permission)).map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`sidebar-menu-item ${
                    item.path === "/admin/analytics"
                      ? location.pathname.startsWith("/admin/analytics")
                      : location.pathname === item.path
                        ? "active"
                        : ""
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

          {/* Categories sits above Services, not inside it */}
          {hasPermission("asset_categories.view") && (
            <li>
              <Link
                to="/admin/assets"
                className={`sidebar-menu-item ${isCategoryRoute ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <FolderOpen size={20} />
                </span>
                <span className="menu-label">Categories</span>
              </Link>
            </li>
          )}

          {hasPermission("vehicle_sizes.view") && (
            <li>
              <Link
                to="/admin/assets/vehicle-sizes"
                className={`sidebar-menu-item ${isVehicleSizesActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <Package size={20} />
                </span>
                <span className="menu-label">Vehicle Size Master</span>
              </Link>
            </li>
          )}

          {hasPermission("vehicle_types.view") && (
            <li>
              <Link
                to="/admin/assets/vehicle-types"
                className={`sidebar-menu-item ${isVehicleTypesActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <CarFront size={20} />
                </span>
                <span className="menu-label">Vehicle Types</span>
              </Link>
            </li>
          )}

          {hasPermission("vehicle_catalog.view") && (
            <li>
              <Link
                to="/admin/assets/vehicles"
                className={`sidebar-menu-item ${isVehicleCatalogActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <Car size={20} />
                </span>
                <span className="menu-label">Vehicles</span>
              </Link>
            </li>
          )}

          {hasPermission("services.view") && (
            <li>
              <Link
                to="/admin/price-simulator"
                className={`sidebar-menu-item ${isPriceSimulatorActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <Calculator size={20} />
                </span>
                <span className="menu-label">Price Simulator</span>
              </Link>
            </li>
          )}

          {hasPermission("services.view") && (
            <li>
              <Link
                to="/admin/services"
                className={`sidebar-menu-item ${isServicesActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <Wrench size={20} />
                </span>
                <span className="menu-label">Services</span>
              </Link>
            </li>
          )}

          {(hasPermission("addons.view") || hasPermission("services.view")) && (
            <li>
              <Link
                to="/admin/services/addons"
                className={`sidebar-menu-item ${isAddonsActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <PackagePlus size={20} />
                </span>
                <span className="menu-label">Add-ons</span>
              </Link>
            </li>
          )}

          {hasPermission("rewards.view") && (
            <li>
              <Link
                to="/admin/pricing/rewards"
                className={`sidebar-menu-item ${isRewardsActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <DollarSign size={20} />
                </span>
                <span className="menu-label">Rewards</span>
              </Link>
            </li>
          )}

          {/* Communication Dropdown */}
          {visibleCommunication.length > 0 && <li>
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
              {visibleCommunication.map((subItem) => (
                <li key={subItem.path}>
                  <Link
                    to={subItem.path}
                    className={`sidebar-submenu-item ${isSubActive(subItem.path) ? "active" : ""}`}
                    onClick={handleLinkClick}
                  >
                    {subItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>}

          {/* Wallet Dropdown */}
          {visibleWallet.length > 0 && <li>
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
              {visibleWallet.map((subItem) => (
                <li key={subItem.path}>
                  <Link
                    to={subItem.path}
                    className={`sidebar-submenu-item ${isSubActive(subItem.path) ? "active" : ""}`}
                    onClick={handleLinkClick}
                  >
                    {subItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>}

          {menuItems.slice(4).filter(item => hasPermission(item.permission)).map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`sidebar-menu-item ${
                    item.path === "/admin/analytics"
                      ? location.pathname.startsWith("/admin/analytics")
                      : location.pathname === item.path
                        ? "active"
                        : ""
                  }`}
                  onClick={handleLinkClick}
                >
                  <span className="menu-icon">
                    <IconComponent size={20} />
                  </span>
                  <span className="menu-label">{item.label}</span>
                  {item.badge === "chat" && chatUnread > 0 && (
                    <span className="sidebar-badge">
                      {chatUnread > 99 ? "99+" : chatUnread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}

          {hasPermission("pricing_fees.view") && (
            <li>
              <Link
                to="/admin/pricing"
                className={`sidebar-menu-item ${isCommissionActive ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <Percent size={20} />
                </span>
                <span className="menu-label">Commission</span>
              </Link>
            </li>
          )}

          {hasPermission("settings.view") && (
            <li>
              <Link
                to="/admin/settings"
                className={`sidebar-menu-item ${location.pathname.startsWith("/admin/settings") ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="menu-icon">
                  <Settings size={20} />
                </span>
                <span className="menu-label">Settings</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
