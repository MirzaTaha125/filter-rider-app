import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { resetPassword } from "../../api";
import signinImage from "../../assets/signin/signin_main.webp";
import "./SignIn.css";

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = location.state?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="signin-container">
        <div className="signin-left">
          <div className="signin-content">
            <div className="logo">
              <div className="logo-squares">
                <div className="logo-square"></div>
                <div className="logo-square"></div>
                <div className="logo-square"></div>
                <div className="logo-square"></div>
              </div>
              <span className="logo-text">Filter</span>
            </div>
            <h1 className="welcome-heading">Password reset</h1>
            <p className="welcome-subtext">
              Your password has been reset successfully.
            </p>
            <Link
              to="/signin"
              className="signin-button"
              style={{ display: "block", textAlign: "center" }}
            >
              Sign in
            </Link>
          </div>
        </div>
        <div className="signin-right">
          <div className="signin-image-container">
            <img src={signinImage} alt="Success" className="signin-image" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signin-container">
      <div className="signin-left">
        <div className="signin-content">
          <div className="logo">
            <div className="logo-squares">
              <div className="logo-square"></div>
              <div className="logo-square"></div>
              <div className="logo-square"></div>
              <div className="logo-square"></div>
            </div>
            <span className="logo-text">Filter</span>
          </div>

          <h1 className="welcome-heading">Reset password</h1>
          <p className="welcome-subtext">
            Enter the OTP sent to your email and your new password
          </p>

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="otp">OTP / Verification code</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP from email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={8}
              />
            </div>

            {error && <p className="signin-error">{error}</p>}
            <button type="submit" className="signin-button" disabled={loading}>
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>

          <p className="back-to-signin">
            <Link to="/signin">← Back to sign in</Link>
          </p>
        </div>
      </div>

      <div className="signin-right">
        <div className="signin-image-container">
          <img
            src={signinImage}
            alt="Reset password"
            className="signin-image"
          />
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
