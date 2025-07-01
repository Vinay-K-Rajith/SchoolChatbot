import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import InputBase from '@mui/material/InputBase';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';

const timeframes = ["Hourly", "Daily", "Weekly", "Monthly", "Yearly"];

function MetricsCard({ label, value, icon, color }: { label: string; value: string | number; icon?: React.ReactNode; color?: string }) {
  return (
    <Card sx={{ minWidth: 180, flex: 1, mx: 1, bgcolor: 'white', borderRadius: 3, boxShadow: 1 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          {icon}
          <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
        </Box>
        <Typography variant="h5" fontWeight={700} color="text.primary">{value}</Typography>
      </CardContent>
    </Card>
  );
}

function Sidebar({ schoolName, schoolCode, tab, setTab }: { schoolName: string; schoolCode: string; tab: string; setTab: (t: string) => void }) {
  const nav = [
    { key: "dashboard", label: "Dashboard", icon: <HomeIcon /> },
    { key: "analytics", label: "Analytics", icon: <BarChartIcon /> },
    { key: "kb", label: "Knowledge Base", icon: <MenuBookIcon /> },
  ];
  return (
    <Drawer
      variant="permanent"
      PaperProps={{
        sx: {
          bgcolor: '#0a2540',
          color: 'white',
          width: 220,
          border: 0,
          boxShadow: 3,
          borderRadius: 0,
        }
      }}
    >
      <Box sx={{ px: 3, py: 4, mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'white', mb: 0.5, lineHeight: 1.1 }}>{schoolName}</Typography>
        <Typography variant="caption" sx={{ color: '#b3c2d6', fontFamily: 'monospace' }}>{schoolCode}</Typography>
      </Box>
      <List>
        {nav.map(n => (
          <ListItem key={n.key} disablePadding sx={{ borderRadius: 2, mb: 0.5 }}>
            <ListItemButton
              selected={tab === n.key}
              onClick={() => setTab(n.key)}
              sx={{
                borderRadius: 2,
                bgcolor: tab === n.key ? 'rgba(255,255,255,0.12)' : 'inherit',
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.18)',
                  color: '#fff',
                },
                '&.Mui-selected:hover': {
                  bgcolor: 'rgba(255,255,255,0.22)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>{n.icon}</ListItemIcon>
              <ListItemText primary={n.label} primaryTypographyProps={{ sx: { color: 'white', fontWeight: 500 } }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

export default function Dashboard() {
  const [location] = useLocation();
  const schoolCode = location.split("/").filter(Boolean)[0];
  const [schoolName, setSchoolName] = useState<string>("");
  const [tab, setTab] = useState("dashboard");
  const [timeframe, setTimeframe] = useState("Hourly");
  const [metrics, setMetrics] = useState<any>({});
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [kbInput, setKbInput] = useState("");
  const [kbImage, setKbImage] = useState<File | null>(null);
  const [kbResult, setKbResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/school/${schoolCode}`)
      .then(r => r.json())
      .then(data => setSchoolName(data.school?.name || schoolCode));
    fetch(`/api/school/${schoolCode}/metrics`).then(r => r.json()).then(setMetrics);
  }, [schoolCode]);

  useEffect(() => {
    fetch(`/api/school/${schoolCode}/analytics?timeframe=${timeframe.toLowerCase()}`)
      .then(r => r.json())
      .then(d => setAnalyticsData(d.data || []));
  }, [schoolCode, timeframe]);

  const handleKbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/school/${schoolCode}/knowledge-base`, {
      method: "POST",
      body: JSON.stringify({ text: kbInput, image: null }),
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    setKbResult(json.message || "Knowledge base updated");
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf1fb', display: 'flex' }}>
      <Sidebar schoolName={schoolName} schoolCode={schoolCode} tab={tab} setTab={setTab} />
      <Box sx={{ flex: 1, px: 5, py: 4, ml: '220px' }}>
        {/* Top Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" fontWeight={700} color="#0a2540">{schoolName} {tab === "dashboard" ? "Dashboard" : tab === "analytics" ? "Analytics" : "Knowledge Base"}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InputBase sx={{ bgcolor: 'white', px: 2, py: 0.5, borderRadius: 2, fontSize: 15, width: 180, border: '1px solid #dbeafe' }} placeholder="Search..." />
            <Avatar sx={{ bgcolor: '#b3c2d6', color: '#0a2540', width: 36, height: 36, fontWeight: 700 }}>{schoolName[0]}</Avatar>
          </Box>
        </Box>
        {/* Metrics Cards */}
        {tab === "dashboard" && (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 3 }}>
            <MetricsCard label="Total Messages" value={metrics.totalMessages ? Math.floor(metrics.totalMessages / 2) : 0} icon={<span role="img" aria-label="messages">💬</span>} color="text-blue-500" />
            <MetricsCard label="Total Sessions" value={metrics.totalSessions ?? "-"} icon={<span role="img" aria-label="sessions">🗂️</span>} color="text-green-500" />
            <MetricsCard label="Total Users" value={metrics.totalUsers ?? "-"} icon={<span role="img" aria-label="users">👤</span>} color="text-purple-500" />
          </Box>
        )}
        {/* Analytics Graph */}
        {(tab === "dashboard" || tab === "analytics") && (
          <Card sx={{ borderRadius: 3, boxShadow: 1, bgcolor: 'white', maxWidth: 700, mx: 'auto', mb: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography fontWeight={500} color="text.secondary">Timeframe:</Typography>
                <select
                  style={{ border: '1px solid #e0e7ef', borderRadius: 6, padding: '4px 10px', background: '#f3f8fd', fontSize: 15 }}
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                >
                  {timeframes.map(tf => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </Box>
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        )}
        {/* Knowledge Base Editor */}
        {tab === "kb" && (
          <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 2 }}>
            <CardContent>
              <form className="space-y-4" onSubmit={handleKbSubmit}>
                <div>
                  <Typography fontWeight={500} mb={0.5}>Text Input</Typography>
                  <InputBase
                    multiline
                    minRows={4}
                    fullWidth
                    value={kbInput}
                    onChange={e => setKbInput(e.target.value)}
                    placeholder="Enter knowledge base text..."
                    sx={{ border: '1px solid #e0e7ef', borderRadius: 2, px: 2, py: 1, bgcolor: '#f3f8fd', fontSize: 15 }}
                  />
                </div>
                <div>
                  <Typography fontWeight={500} mb={0.5}>Or Upload Image</Typography>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setKbImage(e.target.files?.[0] || null)}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-school-blue text-white px-6 py-2 rounded font-semibold disabled:opacity-60"
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  {loading ? "Processing..." : "Update Knowledge Base"}
                </button>
                {kbResult && (
                  <Typography mt={2} color="success.main" fontWeight={500}>{kbResult}</Typography>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
} 