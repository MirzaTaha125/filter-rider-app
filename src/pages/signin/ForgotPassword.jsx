import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../../api";
import signinImage from "../../assets/signin/signin_main.webp";
import "./SignIn.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess(false);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToReset = () => {
    navigate("/reset-password", { state: { email } });
  };

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

          <h1 className="welcome-heading">Forgot password?</h1>
          <p className="welcome-subtext">
            Enter your email and we'll send you a reset link
          </p>

          {success ? (
            <div className="forgot-success">
              <p className="success-message">
                Check your email for the password reset link or OTP.
              </p>
              <button
                type="button"
                className="signin-button"
                onClick={handleGoToReset}
              >
                Enter OTP to reset password
              </button>
              <p className="success-hint">
                Didn't receive the email?{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setSuccess(false);
                    setError("");
                  }}
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
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
                  autoFocus
                />
              </div>

              {error && <p className="signin-error">{error}</p>}
              <button
                type="submit"
                className="signin-button"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <p className="back-to-signin">
            <Link to="/signin">← Back to sign in</Link>
          </p>
        </div>
      </div>

      <div className="signin-right">
        <div className="signin-image-container">
          <img
            src={signinImage}
            alt="Forgot password"
            className="signin-image"
          />
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
