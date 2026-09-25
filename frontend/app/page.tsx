"use client";

import { useState } from "react";

export default function Home() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-page">
      <section className="login-card">
        {/* Header */}
        <div className="login-header">
          

          <p className="welcome-text">Welcome to</p>

          <h1>InternSetu</h1>

          <p className="subtitle">
            Your pathway to meaningful internship opportunities.
          </p>
        </div>

        {/* Login Form */}
        <form className="login-form">
          <div className="form-field">
            <label htmlFor="username">Username</label>

            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>

          <div className="form-field">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>

              <button
                type="button"
                className="forgot-button"
                onClick={() => alert("Forgot password functionality coming soon.")}
              >
                Forgot password?
              </button>
            </div>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            onClick={(event) => {
              event.preventDefault();
              alert("Login functionality will be connected later.");
            }}
          >
            Login
          </button>
        </form>

        {/* Register */}
        <div className="register-section">
          <span>Don't have an account?</span>

          <button
            type="button"
            className="register-button"
            onClick={() => alert("Registration page coming soon.")}
          >
            Register
          </button>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <span className="footer-dot"></span>
          Secure &amp; simple access to InternSetu
        </div>
      </section>
    </main>
  );
}