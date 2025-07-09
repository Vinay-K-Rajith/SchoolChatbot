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
import { ChevronDown, ChevronUp, Save, Info, Building, DollarSign, FileText, AlertCircle, Bus, Link, Settings } from 'lucide-react';

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
    // Removed Analytics tab
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
  // Extract schoolCode from path and token from query params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const schoolCode = urlParams.get('schoolCode') || location.split("/").filter(Boolean)[0];
  const [authStatus, setAuthStatus] = useState<'pending' | 'success' | 'error'>(token ? 'pending' : 'error');
  const [authError, setAuthError] = useState<string>("");

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

  // Auth validation effect
  useEffect(() => {
    if (!token || !schoolCode) {
      setAuthStatus('error');
      setAuthError('Missing token or school code in URL.');
      return;
    }
    setAuthStatus('pending');
    fetch('https://webapi.entab.info/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, schoolcode: schoolCode })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAuthStatus('success');
        } else {
          setAuthStatus('error');
          setAuthError('Invalid or expired token.');
        }
      })
      .catch(() => {
        setAuthStatus('error');
        setAuthError('Failed to validate token.');
      });
  }, [token, schoolCode]);

  useEffect(() => {
    if (authStatus !== 'success') return;
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
  }, [schoolCode, tab, dateRange, authStatus]);

  useEffect(() => {
    if (authStatus !== 'success') return;
    fetch(`/api/school/${schoolCode}/daily-usage`)
      .then(r => r.json())
      .then(d => setAnalyticsData(d.usage || []));
  }, [schoolCode, authStatus]);

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

  if (authStatus === 'pending') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
        <span style={{ marginLeft: 16 }}>Validating access…</span>
      </Box>
    );
  }
  if (authStatus === 'error') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error">{authError || 'Authentication failed. Please check your link.'}</Alert>
      </Box>
    );
  }
  // Auth success, show dashboard
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf1fb', display: 'flex' }}>
      <Sidebar schoolName={schoolName} schoolCode={schoolCode} tab={tab} setTab={setTab} />
      <Box sx={{ flex: 1, px: 5, py: 4, ml: '220px' }}>
        {/* Top Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" fontWeight={700} color="#0a2540">{schoolName} {tab === "dashboard" ? "Dashboard" : tab === "chat" ? "Chat History" : "Knowledge Base"}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InputBase sx={{ bgcolor: 'white', px: 2, py: 0.5, borderRadius: 2, fontSize: 15, width: 180, border: '1px solid #dbeafe' }} placeholder="Search..." />
            <Avatar sx={{ bgcolor: '#b3c2d6', color: '#0a2540', width: 36, height: 36, fontWeight: 700 }}>{schoolName[0]}</Avatar>
          </Box>
        </Box>
        {/* Metrics Cards */}
        {tab === "dashboard" && (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 3 }}>
            <MetricsCard label="Total Messages" value={metrics.totalMessages ?? "-"} icon={<span role="img" aria-label="messages">💬</span>} color="text-blue-500" />
            <MetricsCard label="Total Sessions" value={metrics.totalSessions ?? "-"} icon={<span role="img" aria-label="sessions">🗂️</span>} color="text-green-500" />
            <MetricsCard label="Total Active Users" value={metrics.totalUsers ?? "-"} icon={<span role="img" aria-label="users">👤</span>} color="text-purple-500" />
          </Box>
        )}
        {/* Analytics Graph */}
        {tab === "dashboard" && (
          <Card sx={{ borderRadius: 3, boxShadow: 1, bgcolor: 'white', maxWidth: 700, mx: 'auto', mb: 4 }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography fontWeight={500} color="text.secondary">Daily Messages (Last 30 Days)</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        )}
        {/* Knowledge Base Editor */}
        {tab === "kb" && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '60vh', bgcolor: '#eaf1fb', py: 6 }}>
            <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen w-full">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">School Data Editor</h1>
                <p className="text-gray-600">Update your school information across all sections</p>
              </div>
              <KnowledgeBaseSectionedEditor schoolCode={schoolCode} />
            </div>
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

function KnowledgeBaseSectionedEditor({ schoolCode }: { schoolCode: string }) {
  type KBSectionKey = 'generalInfo' | 'infrastructure' | 'fees' | 'admissionAndDocuments' | 'importantNotes' | 'bus' | 'links' | 'miscellaneous';
  const [expandedSections, setExpandedSections] = useState<Record<KBSectionKey, boolean>>({
    generalInfo: true,
    infrastructure: false,
    fees: false,
    admissionAndDocuments: false,
    importantNotes: false,
    bus: false,
    links: false,
    miscellaneous: false
  });
  const [fields, setFields] = useState<Record<KBSectionKey, string>>({
    generalInfo: '',
    infrastructure: '',
    fees: '',
    admissionAndDocuments: '',
    importantNotes: '',
    bus: '',
    links: '',
    miscellaneous: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/school/${schoolCode}`)
      .then(res => res.json())
      .then(data => {
        setFields({
          generalInfo: data.generalInfo || '',
          infrastructure: data.infrastructure || '',
          fees: data.fees || '',
          admissionAndDocuments: data.admissionAndDocuments || '',
          importantNotes: data.importantNotes || '',
          bus: data.bus || '',
          links: data.links || '',
          miscellaneous: data.miscellaneous || ''
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load school data.');
        setLoading(false);
      });
  }, [schoolCode]);

  const handleChange = (key: KBSectionKey, value: string) => {
    setFields(f => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`/api/school/${schoolCode}/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Changes saved successfully!');
      } else {
        setError(json.error || 'Failed to save changes.');
      }
    } catch (e) {
      setError('Failed to save changes.');
    }
    setLoading(false);
  };

  const toggleSection = (section: KBSectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const SectionHeader = ({ title, section, icon }: { title: string; section: KBSectionKey; icon: React.ReactNode }) => (
    <div
      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      {expandedSections[section] ?
        <ChevronUp className="w-5 h-5 text-blue-600" /> :
        <ChevronDown className="w-5 h-5 text-blue-600" />
      }
    </div>
  );

  const sections: { key: KBSectionKey; title: string; icon: React.ReactNode; placeholder: string }[] = [
    {
      key: 'generalInfo',
      title: 'General Information',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      placeholder: 'Enter general information about the school including basic details, contact information, mission statement, facilities, etc.'
    },
    {
      key: 'infrastructure',
      title: 'Infrastructure',
      icon: <Building className="w-5 h-5 text-blue-600" />,
      placeholder: 'Enter infrastructure details including campus area, classrooms, laboratories, library, sports facilities, etc.'
    },
    {
      key: 'fees',
      title: 'Fee Structure',
      icon: <DollarSign className="w-5 h-5 text-blue-600" />,
      placeholder: 'Enter fee structure including registration fees, tuition fees, transport charges, payment terms, etc.'
    },
    {
      key: 'admissionAndDocuments',
      title: 'Admission & Documents',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      placeholder: 'Enter admission process details, required documents, application procedures, contact information, etc.'
    },
    {
      key: 'importantNotes',
      title: 'Important Notes',
      icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
      placeholder: 'Enter important policies, guidelines, discipline rules, academic policies, special instructions, etc.'
    },
    {
      key: 'bus',
      title: 'Transportation',
      icon: <Bus className="w-5 h-5 text-blue-600" />,
      placeholder: 'Enter transportation details including bus routes, coverage areas, transport guidelines, contact information, etc.'
    },
    {
      key: 'links',
      title: 'Important Links',
      icon: <Link className="w-5 h-5 text-blue-600" />,
      placeholder: 'Enter important links including online portals, fee payment links, results portal, parent portal, resources, etc.'
    },
    {
      key: 'miscellaneous',
      title: 'Miscellaneous',
      icon: <Settings className="w-5 h-5 text-blue-600" />,
      placeholder: 'Enter miscellaneous information including awards, recognitions, partnerships, special programs, additional information, etc.'
    }
  ];

  return (
    <>
      {loading && <div className="text-center py-4 text-blue-600">Loading...</div>}
      {error && <div className="text-center py-2 text-red-600">{error}</div>}
      {success && <div className="text-center py-2 text-green-600">{success}</div>}
      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader
              title={section.title}
              section={section.key}
              icon={section.icon}
            />
            {expandedSections[section.key] && (
              <div className="p-6">
                <textarea
                  placeholder={section.placeholder}
                  rows={12}
                  value={fields[section.key]}
                  onChange={e => handleChange(section.key, e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm leading-relaxed"
                  disabled={loading}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Save Button */}
      <div className="mt-8 flex justify-center">
        <button
          className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          onClick={handleSave}
          disabled={loading}
        >
          <Save className="w-5 h-5" />
          <span>{loading ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </>
  );
} 