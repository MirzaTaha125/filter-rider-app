import { Routes, Route } from "react-router-dom";
import Layout from "../../components/Layout";
import { AppSettingsProvider } from "../../contexts/AppSettingsContext";
import { PermissionsProvider } from "../../contexts/PermissionsContext";
import { SocketProvider } from "../../contexts/SocketContext";
import Dashboard from "./dashboard/Dashboard";
import OrderManagement from "./orders/OrderManagement";
import CustomerManagement from "./customers/CustomerManagement";
import WalletManagement from "./wallet/WalletManagement";
import PaymentApproval from "./wallet/PaymentApproval";
import TransactionLedger from "./wallet/TransactionLedger";
import ServiceProviderManagement from "./service-providers/ServiceProviderManagement";
import SPRequestManagement from "./service-providers/SPRequestManagement";
import ServiceManagement from "./services/ServiceManagement";
import AddonsManagement from "./services/AddonsManagement";
import PricingMatrix from "./services/PricingMatrix";
import FeeConfiguration from "./pricing/FeeConfiguration";
import SurgePricing from "./pricing/SurgePricing";
import RegionalPricing from "./pricing/RegionalPricing";
import AssetCategories from "./assets/AssetCategories";
// import AssetDefinitions from "./assets/AssetDefinitions";
import SizeCategories from "./assets/SizeCategories";
import PromotionsManagement from "./promotions/PromotionsManagement";
import CreatePromotion from "./promotions/CreatePromotion";
import EmailSmsTemplates from "./communication/EmailSmsTemplates";
import PushNotifications from "./communication/PushNotifications";
import ContentManagement from "./communication/ContentManagement";
import DisputeManagement from "./disputes/DisputeManagement";
import Analytics from "./analytics/Analytics";
import Settings from "./settings/Settings";
import ZoneManagement from "./zones/ZoneManagement";
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
        <Route path="/customers" element={<CustomerManagement />} />
        <Route path="/wallet" element={<WalletManagement />} />
        <Route path="/wallet/payment-approval" element={<PaymentApproval />} />
        <Route
          path="/wallet/transaction-ledger"
          element={<TransactionLedger />}
        />
        <Route
          path="/service-providers"
          element={<ServiceProviderManagement />}
        />
        <Route
          path="/service-providers/requests"
          element={<SPRequestManagement />}
        />
        <Route path="/services" element={<ServiceManagement />} />
        <Route path="/services/addons" element={<AddonsManagement />} />
        <Route path="/services/pricing-matrix" element={<PricingMatrix />} />
        <Route path="/pricing" element={<FeeConfiguration />} />
        <Route path="/pricing/surge" element={<SurgePricing />} />
        <Route path="/pricing/regional" element={<RegionalPricing />} />
        <Route path="/assets" element={<AssetCategories />} />
        {/* <Route path="/assets/definitions" element={<AssetDefinitions />} /> */}
        <Route path="/assets/sizes" element={<SizeCategories />} />
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
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/zones" element={<ZoneManagement />} />
        <Route path="/account" element={<AccountSettings />} />
        </Routes>
      </Layout>
      </PermissionsProvider>
      </SocketProvider>
    </AppSettingsProvider>
  );
}

export default AdminDashboard;
