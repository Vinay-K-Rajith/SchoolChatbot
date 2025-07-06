import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SchoolAdminDashboard() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/school-admin/check-auth").then(r => r.json()).then(data => {
      if (!data.authenticated) setLocation("/school-admin");
    });
  }, [setLocation]);

  const handleLogout = async () => {
    document.cookie = "schoolAdmin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setLocation("/school-admin");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#eaf1fb" }}>
      <div style={{ background: "white", padding: 32, borderRadius: 12, boxShadow: "0 2px 16px #0001", minWidth: 320 }}>
        <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 24, color: "#0a2540" }}>Welcome, School Admin!</h2>
        <button onClick={handleLogout} style={{ width: "100%", padding: 10, borderRadius: 6, background: "#e11d48", color: "white", fontWeight: 600, fontSize: 16, border: 0 }}>Logout</button>
      </div>
    </div>
  );
} 