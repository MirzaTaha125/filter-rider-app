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
import AssetCategories from "./assets/AssetCategories";
// import AssetDefinitions from "./assets/AssetDefinitions";
import SizeCategories from "./assets/SizeCategories";
import SizeCategoryForm from "./assets/SizeCategoryForm";
import PromotionsManagement from "./promotions/PromotionsManagement";
import CreatePromotion from "./promotions/CreatePromotion";
import EmailSmsTemplates from "./communication/EmailSmsTemplates";
import PushNotifications from "./communication/PushNotifications";
import ContentManagement from "./communication/ContentManagement";
import DisputeManagement from "./disputes/DisputeManagement";
import DisputeDetail from "./disputes/DisputeDetail";
import Analytics from "./analytics/Analytics";
import Settings from "./settings/Settings";
import ZoneManagement from "./zones/ZoneManagement";
import ZoneForm from "./zones/ZoneForm";
import AccountSettings from "./account/AccountSettings";
import "./AdminDashboard.css";

function AdminDashboard() {
  return (
    <AppSettingsProvider>
      <SocketProvider>
      <PermissionsProvider>
      <Layout>
        <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<OrderManagement />} />
        <Route path="/orders/:orderId" element={<OrderDetail />} />
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
        <Route path="/assets" element={<AssetCategories />} />
        {/* <Route path="/assets/definitions" element={<AssetDefinitions />} /> */}
        <Route path="/assets/sizes" element={<SizeCategories />} />
        <Route path="/assets/sizes/add" element={<SizeCategoryForm />} />
        <Route path="/assets/sizes/:sizeId/edit" element={<SizeCategoryForm />} />
        <Route path="/promotions" element={<PromotionsManagement />} />
        <Route path="/promotions/create" element={<CreatePromotion />} />
        <Route path="/promotions/edit/:id" element={<CreatePromotion />} />
        <Route path="/communication" element={<EmailSmsTemplates />} />
        <Route
          path="/communication/push-notifications"
          element={<PushNotifications />}
        />
        <Route path="/communication/content" element={<ContentManagement />} />
        <Route path="/disputes" element={<DisputeManagement />} />
        <Route path="/disputes/:disputeId" element={<DisputeDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/zones" element={<ZoneManagement />} />
        <Route path="/zones/add" element={<ZoneForm />} />
        <Route path="/zones/:zoneId/edit" element={<ZoneForm />} />
        <Route path="/account" element={<AccountSettings />} />
        </Routes>
      </Layout>
      </PermissionsProvider>
      </SocketProvider>
    </AppSettingsProvider>
  );
}

export default AdminDashboard;
