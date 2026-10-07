import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";
import Swal from "sweetalert2";
import { API } from "../config/api";

const SignupURL = API.signup;

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // simple password strength meter
  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s; // 0..4
  })();

  const strengthLabel = ["Too weak", "Weak", "Fair", "Good", "Strong"][
    strength
  ];
  const strengthClass = ["", "weak", "fair", "good", "strong"][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirm) {
      return setError("Please fill in all fields.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Please enter a valid email.");
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (password !== confirm) {
      return setError("Passwords do not match.");
    }
    if (!agree) {
      return setError("You must accept the terms to continue.");
    }

    setLoading(true);

    try {
      const res = await fetch(SignupURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Signup failed");
      }

      // Optional: auto-login if backend returns a token
      if (data.token) {
        localStorage.setItem("token", data.token);
        navigate("/list");
      } else {
        await Swal.fire({
          title: "Registration Successful!",
          text: "Your account has been created. Please login to continue.",
          icon: "success",
          confirmButtonText: "OK",
        });

        navigate("/login");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <header className="signup-header">
          <h1>Create your account</h1>
          <p className="muted">Start organizing your tasks in seconds</p>
        </header>

        {error && <div className="error">{error}</div>}

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <label>
            Full name
            <input
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoComplete="name"
              autoFocus
            />
          </label>

          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </label>

          {password && (
            <div className="strength">
              <div className="strength-bar">
                <span
                  className={`fill ${strengthClass}`}
                  data-level={strength}
                />
              </div>
              <span className={`strength-label ${strengthClass}`}>
                {strengthLabel}
              </span>
            </div>
          )}

          <label>
            Confirm password
            <input
              type="password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={loading}
            />
            <span>
              I agree to the <a href="/terms">Terms</a> &amp;{" "}
              <a href="/privacy">Privacy Policy</a>
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="signup-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
