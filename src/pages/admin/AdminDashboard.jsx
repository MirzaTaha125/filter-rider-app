import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { AppSettingsProvider } from "../../contexts/AppSettingsContext";
import { PermissionsProvider } from "../../contexts/PermissionsContext";
import { SocketProvider } from "../../contexts/SocketContext";
import Dashboard from "./dashboard/Dashboard";
import OrderManagement from "./orders/OrderManagement";
import OrderDetail from "./orders/OrderDetail";
import CustomerManagement from "./customers/CustomerManagement";
import CustomerAdd from "./customers/CustomerAdd";
import CustomerDetail from "./customers/CustomerDetail";
import WalletManagement from "./wallet/WalletManagement";
import PaymentApproval from "./wallet/PaymentApproval";
import PaymentApprovalDetail from "./wallet/PaymentApprovalDetail";
import TransactionLedger from "./wallet/TransactionLedger";
import {
  ProviderLedgerDetail,
  CustomerLedgerDetail,
} from "./wallet/LedgerAccountDetail";
import Penalties from "./wallet/Penalties";
import ApplyPenalty from "./wallet/ApplyPenalty";
import WalletRules from "./wallet/WalletRules";
import Reviews from "./reviews/Reviews";
import ServiceProviderManagement from "./service-providers/ServiceProviderManagement";
import ServiceProviderDetail from "./service-providers/ServiceProviderDetail";
import ProviderRequestDetail from "./service-providers/ProviderRequestDetail";
import ServiceManagement from "./services/ServiceManagement";
import ServiceForm from "./services/ServiceForm";
import ServiceSettings from "./services/ServiceSettings";
import AddonsManagement from "./services/AddonsManagement";
import AddonForm from "./services/AddonForm";
import PricingMatrix from "./services/PricingMatrix";
import PricingForm from "./services/PricingForm";
import FeeConfiguration from "./pricing/FeeConfiguration";
import SurgePricing from "./pricing/SurgePricing";
import SurgeConfigure from "./pricing/SurgeConfigure";
import RegionalPricing from "./pricing/RegionalPricing";
import RegionForm from "./pricing/RegionForm";
import RewardsManagement from "./pricing/RewardsManagement";
import RewardForm from "./pricing/RewardForm";
import AssetCategories from "./assets/AssetCategories";
import AssetCategoryForm from "./assets/AssetCategoryForm";
// import AssetDefinitions from "./assets/AssetDefinitions";
import VehicleSizes from "./assets/VehicleSizes";
import VehicleSizeForm from "./assets/VehicleSizeForm";
import VehicleTypes from "./assets/VehicleTypes";
import VehicleTypeForm from "./assets/VehicleTypeForm";
import VehicleCatalog from "./assets/VehicleCatalog";
import PriceSimulator from "./services/PriceSimulator";
import PromotionsManagement from "./promotions/PromotionsManagement";
import CreatePromotion from "./promotions/CreatePromotion";
import EmailSmsTemplates from "./communication/EmailSmsTemplates";
import PushNotifications from "./communication/PushNotifications";
import ContentManagement from "./communication/ContentManagement";
import ChatMonitor from "./communication/ChatMonitor";
import DisputeManagement from "./disputes/DisputeManagement";
import DisputeDetail from "./disputes/DisputeDetail";
import Analytics from "./analytics/Analytics";
import AnalyticsProviderOrders from "./analytics/AnalyticsProviderOrders";
import AnalyticsCustomerOrders from "./analytics/AnalyticsCustomerOrders";
import AnalyticsZoneOrders from "./analytics/AnalyticsZoneOrders";
import AnalyticsServiceOrders from "./analytics/AnalyticsServiceOrders";
import Settings from "./settings/Settings";
import AdminUserForm from "./settings/AdminUserForm";
import RoleForm from "./settings/RoleForm";
import UserRolesForm from "./settings/UserRolesForm";
import PermissionForm from "./settings/PermissionForm";
import ZoneManagement from "./zones/ZoneManagement";
import MasterCatalog from "./catalog/MasterCatalog";
import ZoneSettings from "./zones/ZoneSettings";
import ZoneForm from "./zones/ZoneForm";
import AccountSettings from "./account/AccountSettings";
import "./AdminDashboard.css";

function AdminDashboard() {
  return (
    <AppSettingsProvider>
      <SocketProvider>
      <PermissionsProvider>
      <Routes>
      <Route path="*" element={
      <Layout>
        <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<OrderManagement />} />
        <Route path="/orders/:orderId" element={<OrderDetail />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/customers" element={<CustomerManagement />} />
        <Route path="/customers/add" element={<CustomerAdd />} />
        <Route path="/customers/:customerId" element={<CustomerDetail />} />
        <Route path="/wallet" element={<WalletManagement />} />
        <Route path="/wallet/payment-approval" element={<PaymentApproval />} />
        <Route
          path="/wallet/payment-approval/:approvalId"
          element={<PaymentApprovalDetail />}
        />
        <Route
          path="/wallet/transaction-ledger"
          element={<TransactionLedger />}
        />
        <Route
          path="/wallet/transaction-ledger/providers/:providerId"
          element={<ProviderLedgerDetail />}
        />
        <Route
          path="/wallet/transaction-ledger/customers/:customerId"
          element={<CustomerLedgerDetail />}
        />
        <Route path="/wallet/penalties" element={<Penalties />} />
        <Route path="/wallet/penalties/apply" element={<ApplyPenalty />} />
        <Route path="/wallet/rules" element={<WalletRules />} />
        <Route
          path="/service-providers"
          element={<ServiceProviderManagement />}
        />
        {/* The requests list is a tab on the providers page now — keep the old
            path working for bookmarks. */}
        <Route
          path="/service-providers/requests"
          element={<Navigate to="/admin/service-providers?tab=requests" replace />}
        />
        <Route
          path="/service-providers/requests/:requestId"
          element={<ProviderRequestDetail />}
        />
        <Route
          path="/service-providers/:providerId"
          element={<ServiceProviderDetail />}
        />
        <Route path="/services" element={<ServiceManagement />} />
        <Route path="/services/addons" element={<AddonsManagement />} />
        <Route path="/services/addons/add" element={<AddonForm />} />
        <Route path="/services/addons/:addonId/edit" element={<AddonForm />} />
        <Route path="/services/pricing-matrix" element={<PricingMatrix />} />
        <Route path="/services/pricing-matrix/add" element={<PricingForm />} />
        <Route
          path="/services/pricing-matrix/:serviceId/:sizeCategoryId/edit"
          element={<PricingForm />}
        />
        <Route path="/services/add" element={<ServiceForm />} />
        <Route path="/services/:serviceId/edit" element={<ServiceForm />} />
        <Route path="/services/:serviceId/settings" element={<ServiceSettings />} />
        <Route path="/pricing" element={<FeeConfiguration />} />
        <Route path="/pricing/surge" element={<SurgePricing />} />
        <Route path="/pricing/surge/configure" element={<SurgeConfigure />} />
        <Route path="/pricing/regional" element={<RegionalPricing />} />
        <Route path="/pricing/regional/add" element={<RegionForm />} />
        <Route path="/pricing/regional/:regionId/edit" element={<RegionForm />} />
        <Route path="/pricing/rewards" element={<RewardsManagement />} />
        <Route path="/pricing/rewards/new" element={<RewardForm />} />
        <Route path="/pricing/rewards/:rewardId/edit" element={<RewardForm />} />
        <Route path="/assets" element={<AssetCategories />} />
        <Route path="/assets/add" element={<AssetCategoryForm />} />
        <Route path="/assets/:categoryId/edit" element={<AssetCategoryForm />} />
        {/* <Route path="/assets/definitions" element={<AssetDefinitions />} /> */}
        <Route path="/assets/vehicle-sizes" element={<VehicleSizes />} />
        <Route path="/assets/vehicle-sizes/add" element={<VehicleSizeForm />} />
        <Route path="/assets/vehicle-sizes/:sizeId/edit" element={<VehicleSizeForm />} />
        <Route path="/assets/vehicle-types" element={<VehicleTypes />} />
        <Route path="/assets/vehicle-types/add" element={<VehicleTypeForm />} />
        <Route path="/assets/vehicle-types/:typeId/edit" element={<VehicleTypeForm />} />
        <Route path="/assets/vehicles" element={<VehicleCatalog />} />
        <Route path="/price-simulator" element={<PriceSimulator />} />
        <Route path="/promotions" element={<PromotionsManagement />} />
        <Route path="/promotions/create" element={<CreatePromotion />} />
        <Route path="/promotions/edit/:id" element={<CreatePromotion />} />
        <Route path="/communication/chat" element={<ChatMonitor />} />
        <Route path="/communication" element={<EmailSmsTemplates />} />
        <Route
          path="/communication/push-notifications"
          element={<PushNotifications />}
        />
        <Route path="/communication/content" element={<ContentManagement />} />
        <Route path="/disputes" element={<DisputeManagement />} />
        <Route path="/disputes/:disputeId" element={<DisputeDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route
          path="/analytics/providers/:providerId"
          element={<AnalyticsProviderOrders />}
        />
        <Route
          path="/analytics/customers/:customerId"
          element={<AnalyticsCustomerOrders />}
        />
        <Route
          path="/analytics/zones/:zoneId"
          element={<AnalyticsZoneOrders />}
        />
        <Route
          path="/analytics/services/:serviceId"
          element={<AnalyticsServiceOrders />}
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/admin-users/new" element={<AdminUserForm />} />
        <Route path="/settings/roles/new" element={<RoleForm />} />
        <Route path="/settings/roles/users/:userId" element={<UserRolesForm />} />
        <Route path="/settings/permissions/new" element={<PermissionForm />} />
        <Route path="/zones" element={<ZoneManagement />} />
        <Route path="/master-catalog" element={<MasterCatalog />} />
        <Route path="/zone-settings" element={<ZoneSettings />} />
        <Route path="/zones/add" element={<ZoneForm />} />
        <Route path="/zones/:zoneId/edit" element={<ZoneForm />} />
        <Route path="/account" element={<AccountSettings />} />
        </Routes>
      </Layout>
      } />
      </Routes>
      </PermissionsProvider>
      </SocketProvider>
    </AppSettingsProvider>
  );
}

export default AdminDashboard;
