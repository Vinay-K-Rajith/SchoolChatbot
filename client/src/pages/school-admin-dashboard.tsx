import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Plus, School, BarChart3, List, ChevronDown, ChevronUp, Users, BookOpen, Award, MapPin, Settings, LogOut, Bell, Search, User, MessageSquare, Key, FileText, AlertCircle } from 'lucide-react';
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
import { Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';

const topTabs = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "newproject", label: "New School", icon: Plus },
];

const schoolTabs = [
  { key: "webchat", label: "Webchat/API Key", icon: Key },
  { key: "chat", label: "Conversation History", icon: MessageSquare },
  { key: "kb", label: "Knowledge Base", icon: BookOpen },
  { key: "unanswered", label: "Unanswered Qs", icon: AlertCircle },
  { key: "reports", label: "Reports/Usage", icon: BarChart3 },
];

export default function SchoolAdminDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSchool, setExpandedSchool] = useState<number | null>(null);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [projects, setProjects] = useState<any[]>([]); // List of schools/projects
  const [apiKey, setApiKey] = useState("");
  const [newProject, setNewProject] = useState({ code: "", name: "", geminiApiKey: "" });
  const [newProjectResult, setNewProjectResult] = useState<string | null>(null);

  // Real schools data from database
  const [schools, setSchools] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [newSchool, setNewSchool] = useState({
    code: '',
    name: '',
    overview: '',
    webchat: 'Available',
    apiKey: '',
    conversationHistory: '0 conversations',
    knowledgeBase: '',
    questions: '',
    remarks: ''
  });

  // Change selectedSchoolId to selectedSchoolCode
  const [selectedSchoolCode, setSelectedSchoolCode] = useState<string | null>(null);
  const selectedSchool = schools.find(s => s.code === selectedSchoolCode) || null;

  // School-specific data states
  const [schoolMetrics, setSchoolMetrics] = useState<any>(null);
  const [schoolKnowledgeBase, setSchoolKnowledgeBase] = useState<string>("");
  const [schoolSessions, setSchoolSessions] = useState<any[]>([]);
  const [schoolLoading, setSchoolLoading] = useState(false);

  // Add state for schoolDataList for dropdown
  const [schoolDataList, setSchoolDataList] = useState<{ schoolCode: string, name: string }[]>([]);

  // Add state for selected session and its messages
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Helper to get selected school name from schoolDataList
  const selectedSchoolName = schoolDataList.find(s => s.schoolCode === selectedSchoolCode)?.name || selectedSchoolCode || '';

  // Add state for daily usage and pie chart data
  const [dailyUsage, setDailyUsage] = useState<{ date: string, count: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string, value: number, color: string }[]>([]);

  // Add state for unanswered messages
  const [unansweredMessages, setUnansweredMessages] = useState<any[]>([]);
  const [unansweredLoading, setUnansweredLoading] = useState(false);

  // Add local state for editable Gemini API key and update status
  const [editableGeminiApiKey, setEditableGeminiApiKey] = useState('');
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // Add state for embed code copy feedback
  const [copied, setCopied] = useState(false);

  // Fetch daily usage and update pie chart data when schools change
  useEffect(() => {
    // Fetch daily usage
    fetch('/api/school-admin/daily-usage')
      .then(r => r.json())
      .then(data => setDailyUsage(data.usage || []));
    // Generate pie chart data from schools
    const colors = [
      '#3B82F6', '#1E40AF', '#60A5FA', '#F59E42', '#10B981', '#6366F1', '#F43F5E', '#FBBF24', '#A21CAF', '#0EA5E9', '#F472B6', '#22D3EE', '#F87171', '#34D399', '#FACC15', '#A3E635', '#FDE68A', '#C026D3', '#FCD34D', '#4ADE80'
    ];
    setPieData(
      schools.map((school, i) => ({
        name: school.name,
        value: school.totalMessages ?? 0,
        color: colors[i % colors.length]
      }))
    );
  }, [schools]);

  // Fetch school-specific data when school changes
  useEffect(() => {
    if (!selectedSchoolCode) return;
    setSchoolLoading(true);
    Promise.all([
      fetch(`/api/school/${selectedSchoolCode}/metrics`).then(r => r.json()),
      fetch(`/api/school/${selectedSchoolCode}/knowledge-base-formatted`).then(r => r.json()),
      fetch(`/api/school/${selectedSchoolCode}/sessions`).then(r => r.json())
    ]).then(([metrics, kb, sessions]) => {
      setSchoolMetrics(metrics);
      setSchoolKnowledgeBase(kb.formatted || "");
      setSchoolSessions(sessions.sessions || []);
      setSchoolLoading(false);
    }).catch(err => {
      setSchoolLoading(false);
    });
  }, [selectedSchoolCode]);

  // In useEffect, fetch schoolDataList from /api/school-admin/school-data-list
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication
        const authResponse = await fetch("/api/school-admin/check-auth");
        const authData = await authResponse.json();
        if (!authData.authenticated) {
          setLocation("/school-admin");
          return;
        }

        // Fetch school list for dropdown from school_data
        const schoolDataListResponse = await fetch("/api/school-admin/school-data-list");
        const schoolDataListJson = await schoolDataListResponse.json();
        setSchoolDataList(schoolDataListJson.schools || []);

        // Fetch schools data for rest of dashboard (for details, metrics, etc.)
        const schoolsResponse = await fetch("/api/school-admin/schools");
        const schoolsData = await schoolsResponse.json();
        setSchools(schoolsData.schools || []);

        // Fetch analytics data
        const analyticsResponse = await fetch("/api/school-admin/analytics");
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.metrics || {});

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [setLocation]);

  // Fetch unanswered messages when selectedSchoolCode changes and tab is 'unanswered'
  useEffect(() => {
    if (activeTab === 'unanswered' && selectedSchoolCode) {
      setUnansweredLoading(true);
      fetch(`/api/school/${selectedSchoolCode}/unanswered-messages`)
        .then(r => r.json())
        .then(data => setUnansweredMessages(data.messages || []))
        .catch(() => setUnansweredMessages([]))
        .finally(() => setUnansweredLoading(false));
    }
  }, [activeTab, selectedSchoolCode]);

  // Fetch Gemini API key when selectedSchoolCode changes
  useEffect(() => {
    if (!selectedSchoolCode) {
      setEditableGeminiApiKey('');
      return;
    }
    // Fetch school info from backend
    fetch(`/api/school/${selectedSchoolCode}`)
      .then(r => r.json())
      .then(data => {
        setEditableGeminiApiKey(data.geminiApiKey || '');
      });
  }, [selectedSchoolCode]);

  // Update Gemini API key handler
  const handleUpdateGeminiApiKey = async () => {
    if (!selectedSchoolCode) return;
    setUpdateStatus(null);
    try {
      const res = await fetch(`/api/school/${selectedSchoolCode}/gemini-api-key`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: editableGeminiApiKey })
      });
      if (res.ok) {
        setUpdateStatus('Gemini API key updated successfully!');
      } else {
        const err = await res.json();
        setUpdateStatus('Error: ' + (err.error || 'Failed to update'));
      }
    } catch (err) {
      setUpdateStatus('Error: Failed to update');
    }
  };

  const handleLogout = async () => {
    document.cookie = "schoolAdmin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setLocation("/school-admin");
  };

  const handleNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewProjectResult(null);
    try {
      const response = await fetch("/api/admin/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: newProject.code,
          name: newProject.name,
          geminiApiKey: newProject.geminiApiKey
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setNewProjectResult(`School created successfully! API Key: ${result.apiKey}`);
        setNewProject({ code: "", name: "", geminiApiKey: "" });
        
        // Refresh schools data
        const schoolsResponse = await fetch("/api/school-admin/schools");
        const schoolsData = await schoolsResponse.json();
        setSchools(schoolsData.schools || []);
      } else {
        const errorData = await response.json();
        setNewProjectResult(`Error creating school: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error creating school:", error);
      setNewProjectResult("Error creating school");
    }
  };

  const handleAddSchool = async () => {
    if (newSchool.name && newSchool.code) {
      try {
        const response = await fetch("/api/admin/schools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: newSchool.code,
            name: newSchool.name,
            geminiApiKey: newSchool.apiKey || "default_key"
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // Refresh schools data
          const schoolsResponse = await fetch("/api/school-admin/schools");
          const schoolsData = await schoolsResponse.json();
          setSchools(schoolsData.schools || []);
          
          setNewSchool({
            code: '',
            name: '',
            overview: '',
            webchat: 'Available',
            apiKey: '',
            conversationHistory: '0 conversations',
            knowledgeBase: '',
            questions: '',
            remarks: ''
          });
          setShowAddSchool(false);
        } else {
          console.error("Failed to create school");
        }
      } catch (error) {
        console.error("Error creating school:", error);
      }
    }
  };

  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  const handleViewMessages = async (sessionId: string) => {
    setMessagesLoading(true);
    setSelectedSessionId(sessionId);
    try {
      const res = await fetch(`/api/school/${selectedSchoolCode}/session/${sessionId}/messages`);
      const data = await res.json();
      setSessionMessages(data.messages || []);
      setChatDialogOpen(true);
    } catch (err) {
      setSessionMessages([]);
      setChatDialogOpen(true);
    }
    setMessagesLoading(false);
  };

  const handleCloseChatDialog = () => {
    setChatDialogOpen(false);
    setSelectedSessionId(null);
    setSessionMessages([]);
  };

  const renderSidebar = () => (
    <div className="w-64 bg-slate-800 text-white flex flex-col h-screen sticky top-0 left-0 overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">ENTAB</h1>
            <p className="text-xs text-slate-400">School Management</p>
          </div>
        </div>
      </div>
      {/* Top Tabs: Overview and New School */}
      <nav className="p-4 border-b border-slate-700">
        <div className="space-y-2">
          {topTabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === item.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {/* School Selector */}
      <div className="p-4 border-b border-slate-700">
        <label className="block text-xs text-slate-400 mb-1">Select School</label>
        <select
          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={selectedSchoolCode || ''}
          onChange={e => setSelectedSchoolCode(e.target.value || null)}
        >
          <option value="">-- Choose a school --</option>
          {schoolDataList.map(school => (
            <option key={school.schoolCode} value={school.schoolCode}>{school.name}</option>
          ))}
        </select>
      </div>
      {/* School-specific Tabs */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {schoolTabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === item.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              disabled={!selectedSchoolCode}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {/* User Section */}
      <div className="p-4 border-t border-slate-700">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log out</span>
        </button>
      </div>
    </div>
  );

  const renderTopBar = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {activeTab === 'overview' ? 'Dashboard' : activeTab === 'webchat' ? 'Webchat/API Key' : activeTab === 'chat' ? 'Conversation History' : activeTab === 'kb' ? 'Knowledge Base' : activeTab === 'unanswered' ? 'Unanswered Questions' : activeTab === 'reports' ? 'Reports/Usage' : activeTab === 'newproject' ? 'New Project' : 'Dashboard'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search anything..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="relative p-2 text-gray-400 hover:text-gray-600">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{analytics?.totalUsers || 0}</h3>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{analytics?.totalMessages || 0}</h3>
              <p className="text-sm text-gray-500">Total Messages</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{schools.length}</h3>
              <p className="text-sm text-gray-500">Total Schools</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Daily Usage</h3>
            <span className="text-sm text-gray-500">Total usage per day (last 30 days)</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" />
              <Tooltip contentStyle={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Usage by School</h3>
            <span className="text-sm text-gray-500">Messages</span>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schools Usage Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">School Usage (Most Active on Top)</h3>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Search
              </button>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Filter
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sessions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Messages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{school.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{school.totalSessions ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{school.totalMessages ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${school.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {school.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400">No schools found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderConversationHistory = () => (
    !selectedSchoolCode ? (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500">Please select a school to view conversation history.</p>
      </div>
    ) : schoolLoading ? (
      <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
    ) : (
      <Paper sx={{ maxWidth: 900, mx: 'auto', mt: 2, p: 2 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Chat Sessions</Typography>
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
              {schoolSessions.map((session) => (
                <TableRow key={session.sessionId}>
                  <TableCell>{session.sessionId}</TableCell>
                  <TableCell>{session.ip || '-'}</TableCell>
                  <TableCell>{typeof session.totalMessages === 'number' ? Math.floor(session.totalMessages / 2) : '-'}</TableCell>
                  <TableCell>{session.createdAt ? new Date(session.createdAt).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" onClick={() => handleViewMessages(session.sessionId)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
              {schoolSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No sessions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Dialog open={chatDialogOpen} onClose={handleCloseChatDialog} maxWidth="md" fullWidth>
          <DialogTitle>Chat History for Session {selectedSessionId}</DialogTitle>
          <DialogContent>
            {messagesLoading ? (
              <div className="flex items-center justify-center h-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
            ) : (
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
                      <TableCell>{msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '-'}</TableCell>
                      <TableCell>{msg.isUser ? 'User' : 'Bot'}</TableCell>
                      <TableCell>
                        <MessageBubble
                          content={msg.content}
                          isUser={msg.isUser}
                          timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date(0)}
                          schoolCode={selectedSchoolCode}
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
            )}
          </DialogContent>
        </Dialog>
          </Paper>
    )
  );

  const renderKnowledgeBase = () => (
    !selectedSchoolCode ? (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500">Please select a school to view the knowledge base.</p>
      </div>
    ) : schoolLoading ? (
      <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
    ) : (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Knowledge Base</h3>
          <p className="text-sm text-gray-500 mb-6">Knowledge base for <b>{selectedSchoolName}</b>:</p>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: schoolKnowledgeBase }} />
        </div>
      </div>
    )
  );

  const renderUnansweredQuestions = () => (
    !selectedSchool ? (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500">Please select a school to view unanswered questions.</p>
      </div>
    ) : (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Unanswered Questions</h3>
          <p className="text-sm text-gray-500 mb-6">Unanswered questions for <b>{selectedSchool.name}</b>.</p>
          {unansweredLoading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : unansweredMessages.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No unanswered questions</h4>
              <p className="text-sm text-gray-500">Great! All questions have been answered successfully.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unansweredMessages.map((msg, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 flex flex-col gap-2 shadow-sm border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">{msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</div>
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-blue-900">User asked:</div>
                    <div className="bg-white rounded-md px-3 py-2 text-gray-800 border border-blue-100 shadow-sm">{msg.question}</div>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="font-semibold text-purple-900">Bot replied:</div>
                    <div className="bg-purple-50 rounded-md px-4 py-3 text-gray-900 border border-purple-200 shadow-sm text-base leading-relaxed" style={{wordBreak: 'break-word'}}>
                      <ReactMarkdown>{msg.answer}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  );

  const renderReports = () => (
    !selectedSchool ? (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500">Please select a school to view reports and usage.</p>
      </div>
    ) : schoolLoading ? (
      <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
    ) : (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports / Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Total Users</div>
              <div className="text-2xl font-bold">{schoolMetrics?.totalUsers ?? '-'}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Total Sessions</div>
              <div className="text-2xl font-bold">{schoolMetrics?.totalSessions ?? '-'}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Total Messages</div>
              <div className="text-2xl font-bold">{schoolMetrics?.totalMessages ?? '-'}</div>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const renderNewProject = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New School Addition</h3>
        <form onSubmit={handleNewProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Code</label>
            <input
              type="text"
              value={newProject.code}
              onChange={e => setNewProject(p => ({ ...p, code: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., SXSRB"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
            <input
              type="text"
              value={newProject.name}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter school name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
            <input
              type="password"
                value={newProject.geminiApiKey}
                onChange={e => setNewProject(p => ({ ...p, geminiApiKey: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your Gemini API key"
                required
              />
          </div>
          
          <button 
            type="submit" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add School
          </button>
          
          {newProjectResult && (
            <div
              className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"
              style={{ wordBreak: 'break-all' }}
            >
              {newProjectResult.includes('API Key:') ? (
                <>
                  {newProjectResult.split('API Key:')[0]}<br />
                  <span style={{ display: 'block', fontFamily: 'monospace', marginTop: 4 }}>
                    {newProjectResult.split('API Key:')[1]}
                  </span>
                </>
              ) : newProjectResult}
            </div>
          )}
            </form>
      </div>
    </div>
  );

  const renderSchoolsList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Schools Directory</h3>
          <p className="text-sm text-gray-500">Manage all educational institutions</p>
        </div>
        <button 
          onClick={() => setShowAddSchool(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New School
        </button>
      </div>
      
      <div className="space-y-4">
        {schools.map((school) => (
          <div key={school.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedSchool(expandedSchool === school.id ? null : school.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <School className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{school.name}</h3>
                    <p className="text-sm text-gray-500">Code: {school.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {school.webchat}
                  </span>
                  {expandedSchool === school.id ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </div>
            </div>
            
            {expandedSchool === school.id && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Overview</label>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{school.overview}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conversation History</label>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{school.conversationHistory}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg font-mono">{school.apiKey}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Base</label>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{school.knowledgeBase}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAddSchool = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Add New School</h3>
        <button 
          onClick={() => setShowAddSchool(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">School Code</label>
          <input
            type="text"
            value={newSchool.code}
            onChange={(e) => setNewSchool({...newSchool, code: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., SCH004"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
          <input
            type="text"
            value={newSchool.name}
            onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter school name"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Overview</label>
          <textarea
            value={newSchool.overview}
            onChange={(e) => setNewSchool({...newSchool, overview: e.target.value})}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief description of the school"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <input
            type="text"
            value={newSchool.apiKey}
            onChange={(e) => setNewSchool({...newSchool, apiKey: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Generated API key"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Base</label>
          <input
            type="text"
            value={newSchool.knowledgeBase}
            onChange={(e) => setNewSchool({...newSchool, knowledgeBase: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Knowledge base description"
          />
        </div>
      </div>
      
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleAddSchool}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Add School
        </button>
        <button
          onClick={() => setShowAddSchool(false)}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderWebchat = () => {
    const embedCode = selectedSchoolCode
      ? `<script src="https://chat.entab.net/${selectedSchoolCode}/inject.js"></script>`
      : "";

    const handleCopyEmbed = () => {
      if (embedCode) {
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      }
    };

    return (
      !selectedSchoolCode ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">Please select a school to view Webchat/API Key info.</p>
        </div>
      ) : schoolLoading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Webchat / API Key / Embed</h3>
            <p className="text-sm text-gray-500 mb-6">Manage your API keys and get the embed code for your webchat widget.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
                <input
                  type="text"
                  value={editableGeminiApiKey}
                  onChange={e => setEditableGeminiApiKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Your Gemini API key will appear here"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Embed Code</label>
                <div className="relative">
                  <textarea
                    value={embedCode}
                    readOnly
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                    placeholder="Your embed code will appear here"
                  />
                  <button
                    onClick={handleCopyEmbed}
                    className="absolute top-2 right-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
                    title="Copy to clipboard"
                  >
                    {copied ? "✔️" : "📋"}
                  </button>
                </div>
              </div>
              <button
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                onClick={handleUpdateGeminiApiKey}
                type="button"
              >
                Update API Key
              </button>
              {updateStatus && (
                <div className={`mt-2 text-sm ${updateStatus.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{updateStatus}</div>
              )}
            </div>
          </div>
        </div>
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      {renderSidebar()}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        {renderTopBar()}
        
        {/* Page Content */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderDashboard()}
              {activeTab === 'webchat' && renderWebchat()}
              {activeTab === 'chat' && renderConversationHistory()}
              {activeTab === 'kb' && renderKnowledgeBase()}
              {activeTab === 'unanswered' && renderUnansweredQuestions()}
              {activeTab === 'reports' && renderReports()}
              {activeTab === 'newproject' && renderNewProject()}
              {activeTab === 'schools' && !showAddSchool && renderSchoolsList()}
              {activeTab === 'schools' && showAddSchool && renderAddSchool()}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 