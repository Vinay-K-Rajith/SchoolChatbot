import SchoolAdminLogin from "./school-admin-login";
import SchoolAdminDashboard from "./school-admin-dashboard";
import { useLocation } from "wouter";
 
export default function SchoolAdminRouter() {
  const [location] = useLocation();
  if (location === "/school-admin/dashboard") return <SchoolAdminDashboard />;
  return <SchoolAdminLogin />;
} 