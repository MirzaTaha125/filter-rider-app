import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/signin/SignIn";
import ForgotPassword from "./pages/signin/ForgotPassword";
import ResetPassword from "./pages/signin/ResetPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SessionExpiryModal from "./components/SessionExpiryModal/SessionExpiryModal";
import { ThemeProvider } from "./context/ThemeContext";
import { getAuthToken } from "./api";
import "./App.css";

function ProtectedRoute({ children }) {
  const token = getAuthToken();
  if (!token) return <Navigate to="/signin" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <SessionExpiryModal />
      <Routes>
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
