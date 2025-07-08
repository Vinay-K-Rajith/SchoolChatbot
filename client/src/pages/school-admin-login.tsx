import { useState } from "react";
import { useLocation } from "wouter";
import "@lottiefiles/lottie-player";

// Icon SVGs
const UserIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#94a3b8" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z"/></svg>
);
const PasswordIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#94a3b8" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 5a3 3 0 1 1 6 0v3H9V7Zm-3 5h12v8H6v-8Zm6 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>
);

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "lottie-player": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        background?: string;
        speed?: string | number;
        loop?: boolean | string;
        autoplay?: boolean | string;
        style?: React.CSSProperties;
      };
    }
  }
}

export default function SchoolAdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/school-admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      setLocation("/school-admin/dashboard");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "row",
      background: "#fff",
    }}>
      {/* Left: Logo and Animations */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
      }}>
        {/* ENTAB Logo Block */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <img
            src="https://www.entab.in/images-latest/logo.webp"
            alt="ENTAB Logo"
            style={{ width: 220, height: "auto", marginBottom: 8 }}
          />
          <div style={{ fontWeight: 600, fontSize: 18, color: "#1e293b", letterSpacing: 0.5, textAlign: "center" }}>
           
          </div>
        </div>
        {/* Animations Row */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <lottie-player
            src="/Animation-1751866810559.json"
            background="transparent"
            speed="1"
            style={{ width: "420px", height: "420px", margin: "0 auto" }}
            loop
            autoplay
          ></lottie-player>
          <lottie-player
            src="/Animation-1751771429287.json"
            background="transparent"
            speed="1"
            style={{ width: "420px", height: "420px", margin: "0 auto" }}
            loop
            autoplay
          ></lottie-player>
        </div>
      </div>
      {/* Right: Background image with centered card */}
      <div style={{
        flex: 1,
        minHeight: "100vh",
        background: `url('https://images.unsplash.com/photo-1749877217773-6c844c38c874?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D') center center / cover no-repeat`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}>
        <div style={{
          width: 370,
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 4px 32px #0002",
          padding: "38px 32px 32px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <h2 style={{ fontWeight: 800, fontSize: 28, color: "#1e293b", marginBottom: 28, letterSpacing: 0.5 }}>School Admin</h2>
          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <div style={{ marginBottom: 18, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: 13 }}>{<UserIcon />}</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 44px",
                  borderRadius: 24,
                  border: "1.5px solid #dbeafe",
                  fontSize: 16,
                  background: "#f8fafc",
                  outline: "none",
                }}
                required
              />
            </div>
            <div style={{ marginBottom: 18, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: 13 }}>{<PasswordIcon />}</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 44px",
                  borderRadius: 24,
                  border: "1.5px solid #dbeafe",
                  fontSize: 16,
                  background: "#f8fafc",
                  outline: "none",
                }}
                required
              />
            </div>
            {error && <div style={{ color: "#e11d48", marginBottom: 14, fontWeight: 500, textAlign: "center" }}>{error}</div>}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 24,
                background: "linear-gradient(90deg, #00897b 0%, #004d40 100%)",
                color: "white",
                fontWeight: 700,
                fontSize: 17,
                border: 0,
                boxShadow: "0 2px 8px #2563eb22",
                letterSpacing: 0.5,
                marginTop: 6,
                transition: "background 0.2s",
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </form>
          <div style={{ marginTop: 18, width: "100%", textAlign: "center" }}>
            <a href="#" style={{ color: "#64748b", fontSize: 15, textDecoration: "none" }}>Forgot Password</a>
          </div>
        </div>
      </div>
    </div>
  );
} 