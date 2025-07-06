import { useState } from "react";
import { useLocation } from "wouter";
import "@lottiefiles/lottie-player";

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
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #eaf1fb 0%, #f8fafc 100%)"
    }}>
      <div style={{
        display: "flex",
        width: 700,
        minHeight: 420,
        background: "white",
        borderRadius: 18,
        boxShadow: "0 4px 32px #0002",
        overflow: "hidden"
      }}>
        {/* Left: Animation and tagline */}
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg, #c7e0f7 0%, #eaf1fb 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32
        }}>
          <lottie-player
            src="/Animation-1751771429287.json"
            background="transparent"
            speed="1"
            style={{ width: "180px", height: "180px", marginBottom: 18 }}
            loop
            autoplay
          ></lottie-player>
          <div style={{
            color: "#334155",
            fontWeight: 600,
            fontSize: 18,
            textAlign: "center",
            marginTop: 12
          }}>
            Welcome School Admin!<br />
            Please login to continue.
          </div>
        </div>
        {/* Right: Login form */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "40px 32px"
        }}>
          <h2 style={{
            marginBottom: 24,
            fontWeight: 800,
            fontSize: 26,
            color: "#1e293b",
            letterSpacing: 0.5,
            textAlign: "center"
          }}>Admin Login</h2>
          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 7, fontWeight: 600, color: "#334155" }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                style={{
                  width: "100%", padding: 10, borderRadius: 8,
                  border: "1.5px solid #dbeafe", fontSize: 16, background: "#f8fafc"
                }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 7, fontWeight: 600, color: "#334155" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                style={{
                  width: "100%", padding: 10, borderRadius: 8,
                  border: "1.5px solid #dbeafe", fontSize: 16, background: "#f8fafc"
                }} />
            </div>
            {error && <div style={{
              color: "#e11d48", marginBottom: 14, fontWeight: 500, textAlign: "center"
            }}>{error}</div>}
            <button type="submit" style={{
              width: "100%", padding: 12, borderRadius: 8,
              background: "linear-gradient(90deg, #2563eb 0%, #1e40af 100%)",
              color: "white", fontWeight: 700, fontSize: 17, border: 0,
              boxShadow: "0 2px 8px #2563eb22", letterSpacing: 0.5, marginTop: 6,
              transition: "background 0.2s"
            }}>Login</button>
          </form>
        </div>
      </div>
    </div>
  );
} 