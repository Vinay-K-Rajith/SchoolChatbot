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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { MessageBubble } from "../components/chatbot/message-bubble";
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

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
    { key: "chat", label: "Chat History", icon: <MenuBookIcon /> },
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
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [currentKb, setCurrentKb] = useState<any>(null);
  const [formattedKb, setFormattedKb] = useState<string>("");
  const [formattedKbLoading, setFormattedKbLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/school/${schoolCode}`)
      .then(r => r.json())
      .then(data => {
        setSchoolName(data.school?.name || schoolCode);
        setCurrentKb(data.knowledgeBase || null);
      });
    fetch(`/api/school/${schoolCode}/metrics`).then(r => r.json()).then(setMetrics);
    if (tab === 'chat') {
      let url = `/api/school/${schoolCode}/sessions`;
      if (dateRange.start && dateRange.end) {
        url += `?startDate=${encodeURIComponent(dateRange.start)}&endDate=${encodeURIComponent(dateRange.end)}`;
      }
      fetch(url).then(r => r.json()).then(d => setChatSessions(d.sessions || []));
    }
    if (tab === 'kb') {
      setFormattedKbLoading(true);
      fetch(`/api/school/${schoolCode}/knowledge-base-formatted`)
        .then(r => r.json())
        .then(data => setFormattedKb(data.formatted || ""))
        .catch(() => setFormattedKb("Failed to load formatted knowledge base."))
        .finally(() => setFormattedKbLoading(false));
    }
  }, [schoolCode, tab, dateRange]);

  useEffect(() => {
    fetch(`/api/school/${schoolCode}/analytics?timeframe=${timeframe.toLowerCase()}`)
      .then(r => r.json())
      .then(d => setAnalyticsData(d.data || []));
  }, [schoolCode, timeframe]);

  const handleKbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setKbResult(null);
    let imageUrl = null;
    if (kbImage) {
      // For now, just use a local preview. In production, upload to a server or S3 and get the URL.
      imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(kbImage);
      });
    }
    const res = await fetch(`/api/school/${schoolCode}/knowledge-base`, {
      method: "POST",
      body: JSON.stringify({ text: kbInput, image: imageUrl }),
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    setKbResult(json.message || "Knowledge base updated");
    setLoading(false);
    if (json.knowledgeBase) setCurrentKb(json.knowledgeBase);
    setKbInput("");
    setKbImage(null);
  };

  const handleViewChat = (session: any) => {
    setSelectedSession(session);
    fetch(`/api/school/${schoolCode}/session/${session.sessionId}/messages`).then(r => r.json()).then(d => {
      setSessionMessages(d.messages || []);
      setChatDialogOpen(true);
    });
  };

  const handleCloseChatDialog = () => {
    setChatDialogOpen(false);
    setSelectedSession(null);
    setSessionMessages([]);
  };

  // Calculate metrics from chatSessions if in chat tab
  const totalSessionsFromTable = chatSessions.length;
  const totalMessagesFromTable = chatSessions.reduce((sum, s) => sum + (typeof s.totalMessages === 'number' ? s.totalMessages : 0), 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf1fb', display: 'flex' }}>
      <Sidebar schoolName={schoolName} schoolCode={schoolCode} tab={tab} setTab={setTab} />
      <Box sx={{ flex: 1, px: 5, py: 4, ml: '220px' }}>
        {/* Top Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" fontWeight={700} color="#0a2540">{schoolName} {tab === "dashboard" ? "Dashboard" : tab === "analytics" ? "Analytics" : tab === "chat" ? "Chat History" : "Knowledge Base"}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InputBase sx={{ bgcolor: 'white', px: 2, py: 0.5, borderRadius: 2, fontSize: 15, width: 180, border: '1px solid #dbeafe' }} placeholder="Search..." />
            <Avatar sx={{ bgcolor: '#b3c2d6', color: '#0a2540', width: 36, height: 36, fontWeight: 700 }}>{schoolName[0]}</Avatar>
          </Box>
        </Box>
        {/* Metrics Cards */}
        {tab === "dashboard" && (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 3 }}>
            <MetricsCard label="Total Messages" value={Math.floor(totalMessagesFromTable / 2)} icon={<span role="img" aria-label="messages">💬</span>} color="text-blue-500" />
            <MetricsCard label="Total Sessions" value={totalSessionsFromTable} icon={<span role="img" aria-label="sessions">🗂️</span>} color="text-green-500" />
            <MetricsCard label="Total Active Users" value={metrics.totalUsers ?? "-"} icon={<span role="img" aria-label="users">👤</span>} color="text-purple-500" />
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
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '60vh', bgcolor: '#eaf1fb', py: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', bgcolor: 'white', borderRadius: 3, boxShadow: 1, maxWidth: 1200, width: '100%', mx: 2, p: 4, gap: 4 }}>
              {/* Current Knowledge Base */}
              <Box sx={{ flex: 1, minWidth: 0, borderRight: { md: '1px solid #e0e7ef' }, pr: { md: 4 }, mb: { xs: 3, md: 0 } }}>
                <Typography variant="h5" fontWeight={700} mb={2}>Current Knowledge Base</Typography>
                {formattedKbLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
                    <CircularProgress />
                  </Box>
                ) : formattedKb ? (
                  <Box sx={{ bgcolor: '#f3f8fd', borderRadius: 2, p: 2, fontSize: 16, minHeight: 180, maxHeight: 350, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                    <div dangerouslySetInnerHTML={{ __html: formattedKb.replace(/\n/g, '<br/>') }} />
                  </Box>
                ) : (
                  <Typography color="text.secondary">No knowledge base found for this school.</Typography>
                )}
              </Box>
              {/* Update Form */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" fontWeight={700} mb={2}>Update Knowledge Base</Typography>
                <form className="space-y-4" onSubmit={handleKbSubmit}>
                  <TextField
                    label="Text Input"
                    multiline
                    minRows={4}
                    fullWidth
                    value={kbInput}
                    onChange={e => setKbInput(e.target.value)}
                    placeholder="Enter knowledge base text..."
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ mb: 2 }}>
                    <Typography fontWeight={500} mb={0.5}>Upload Image</Typography>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'block', marginBottom: 8 }}
                      onChange={e => setKbImage(e.target.files?.[0] || null)}
                    />
                    {kbImage && (
                      <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
                        <img
                          src={URL.createObjectURL(kbImage)}
                          alt="Preview"
                          style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: '1px solid #e0e7ef' }}
                        />
                        <Button size="small" color="error" sx={{ position: 'absolute', top: 0, right: 0, minWidth: 0, p: 0.5 }} onClick={() => setKbImage(null)}>Remove</Button>
                      </Box>
                    )}
                  </Box>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading || !kbInput.trim()}
                    sx={{ minWidth: 180, fontWeight: 600 }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Update Knowledge Base"}
                  </Button>
                  {kbResult && (
                    <Alert severity={kbResult.toLowerCase().includes('fail') ? 'error' : 'success'} sx={{ mt: 2 }}>{kbResult}</Alert>
                  )}
                </form>
              </Box>
            </Box>
          </Box>
        )}
        {/* Chat History Tab */}
        {tab === "chat" && (
          <Paper sx={{ maxWidth: 900, mx: 'auto', mt: 2, p: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Chat Sessions</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dateRange.start}
                onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dateRange.end}
                onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
              />
            </Box>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Session ID</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Total Interactions</TableCell>
                    <TableCell>Datetime</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chatSessions.map((session) => (
                    <TableRow key={session.sessionId}>
                      <TableCell>{session.sessionId}</TableCell>
                      <TableCell>{session.ip || '-'}</TableCell>
                      <TableCell>{typeof session.totalMessages === 'number' ? Math.floor(session.totalMessages / 2) : '-'}</TableCell>
                      <TableCell>{session.createdAt ? new Date(session.createdAt).toLocaleString() : '-'}</TableCell>
                      <TableCell>
                        <Button variant="outlined" size="small" onClick={() => handleViewChat(session)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {chatSessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">No sessions found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Dialog open={chatDialogOpen} onClose={handleCloseChatDialog} maxWidth="md" fullWidth>
              <DialogTitle>Chat History for Session {selectedSession?.sessionId}</DialogTitle>
              <DialogContent>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>User/Bot</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessionMessages.map((msg, i) => (
                      <TableRow key={i}>
                        <TableCell>{new Date(msg.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{msg.isUser ? 'User' : 'Bot'}</TableCell>
                        <TableCell>
                          <MessageBubble
                            content={msg.content}
                            isUser={msg.isUser}
                            timestamp={new Date(msg.timestamp)}
                            schoolCode={schoolCode}
                            availableKeywords={[]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {sessionMessages.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No messages found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          </Paper>
        )}
      </Box>
    </Box>
  );
} 