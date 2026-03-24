import { useState, useEffect } from 'react';
import {
  apiLogin, apiRegister, fetchDashboard, fetchMyTickets, fetchTicketDetail,
  submitTicket, replyToTicket, fetchSelfHelp, fetchProfile, updateProfile, changePassword,
} from './api.js';
import { isLoggedIn, saveAuth, clearAuth, getUser, logout } from './auth.js';

// ── Colours (matches console) ───────────────────────────────
const C = {
  navy: "#0D1B2A", orange: "#F4801A", og2: "#E06C0A",
  bg: "#F7F8FA", card: "#FFFFFF", border: "#E4E7EC",
  t1: "#0D1B2A", t2: "#5A6A7A", t3: "#8A99A8",
  red: "#DC2626", redBg: "#FEF2F2", redT: "#991B1B",
  yel: "#D97706", yelBg: "#FFFBEB", yelT: "#92400E",
  blu: "#1D6FAF", bluBg: "#EFF6FF", bluT: "#1E3A5F",
  grn: "#16A34A", grnBg: "#F0FDF4", grnT: "#14532D",
  neu: "#F1F5F9", purple: "#7C3AED", purpleBg: "#F5F3FF",
};

const CATS = ["Hardware","Software","Network","Access / Permissions","Email","Other"];

const STATUS_COLORS = {
  "Open": { bg: C.redBg, fg: C.red },
  "In Progress": { bg: C.bluBg, fg: C.blu },
  "Pending User Feedback": { bg: C.yelBg, fg: C.yel },
  "User Feedback Received": { bg: C.purpleBg, fg: C.purple },
  "Reopened": { bg: "#FFF7ED", fg: C.orange },
  "Resolved": { bg: C.grnBg, fg: C.grn },
  "Closed": { bg: C.neu, fg: C.t3 },
};

const SELF_HELP_DEFAULTS = [
  { id: "sh1", title: "How to clear your browser cache", body: "Chrome: Settings > Privacy > Clear browsing data. Select 'Cached images and files' and click Clear.\n\nEdge: Settings > Privacy > Choose what to clear. Select cached data and clear.\n\nFirefox: Settings > Privacy > Clear Data > Cached Web Content." },
  { id: "sh2", title: "How to reset your password", body: "1. Go to https://portal.office.com\n2. Click 'Can't access your account?'\n3. Enter your email address\n4. Follow the verification steps\n5. Create a new password meeting complexity requirements" },
  { id: "sh3", title: "VPN troubleshooting", body: "1. Disconnect and reconnect the VPN\n2. Restart the VPN client application\n3. Check your internet connection\n4. Try a different VPN server/gateway\n5. Restart your computer\n6. If still failing, raise a ticket with category 'Network'" },
  { id: "sh4", title: "How to reconnect network drives", body: "1. Open File Explorer\n2. Right-click 'This PC' > 'Map network drive'\n3. Enter the drive path (e.g., \\\\server\\share)\n4. Check 'Reconnect at sign-in'\n5. Click Finish\n\nOr run in Command Prompt: net use Z: \\\\server\\share /persistent:yes" },
  { id: "sh5", title: "Common Outlook fixes", body: "1. Restart Outlook\n2. Clear the Outlook cache: File > Account Settings > Data Files\n3. Run Outlook in Safe Mode: hold Ctrl while opening\n4. Repair the Outlook profile: Control Panel > Mail > Profiles\n5. Update Outlook to the latest version" },
];

// ── Components ──────────────────────────────────────────────
const Bdg = ({ label, bg, fg }) => (
  <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:bg, color:fg, whiteSpace:"nowrap" }}>{label}</span>
);

const Crd = ({ children, style, ...props }) => (
  <div style={{ background:C.card, border:"1px solid "+C.border, borderRadius:12, padding:20, ...style }} {...props}>{children}</div>
);

const Spinner = () => (
  <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
    <div style={{ width:28, height:28, border:"3px solid "+C.border, borderTopColor:C.orange, borderRadius:"50%", animation:"spin 0.6s linear infinite" }}/>
  </div>
);

// ── Login / Register Screen ─────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const res = await apiLogin(email, password);
      if (res.error) { setError(res.error); setBusy(false); return; }
      if (res.data?.user?.user_type !== "requester") { setError("This portal is for requesters only. Technicians should use the console."); setBusy(false); return; }
      saveAuth(res.data.token, res.data.user);
      onAuth();
    } catch (e) { setError("Connection failed"); }
    setBusy(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const res = await apiRegister({ name, email, password, department });
      if (res.error) { setError(res.error); setBusy(false); return; }
      setMode("login"); setError(""); alert("Registration successful! You can now sign in.");
    } catch (e) { setError("Connection failed"); }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg, ${C.navy} 0%, #1a2d42 100%)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter, sans-serif" }}>
      <div style={{ width:400, background:"#fff", borderRadius:16, padding:36, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:48, height:48, background:C.orange, borderRadius:12, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontWeight:700, fontSize:20, color:C.navy }}>Ignition ITSM</div>
          <div style={{ fontSize:13, color:C.t2 }}>Self-Service Portal</div>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Sign In</div>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@ignitiongroup.co.za" style={{ width:"100%", padding:"10px 14px", border:"1px solid "+C.border, borderRadius:8, marginBottom:12, fontSize:14, boxSizing:"border-box" }}/>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" style={{ width:"100%", padding:"10px 14px", border:"1px solid "+C.border, borderRadius:8, marginBottom:16, fontSize:14, boxSizing:"border-box" }}/>
            {error && <div style={{ color:C.red, fontSize:13, marginBottom:12, padding:"8px 12px", background:C.redBg, borderRadius:8 }}>{error}</div>}
            <button type="submit" disabled={busy} style={{ width:"100%", padding:"12px", background:C.orange, color:"#fff", border:"none", borderRadius:8, fontWeight:600, fontSize:14, cursor:"pointer" }}>{busy ? "Signing in..." : "Sign In"}</button>
            <div style={{ textAlign:"center", marginTop:16, fontSize:13, color:C.t2 }}>
              Don't have an account? <button type="button" onClick={()=>{setMode("register");setError("");}} style={{ background:"none", border:"none", color:C.orange, fontWeight:600, cursor:"pointer", fontSize:13 }}>Register</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Create Account</div>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Full name</label>
            <input required value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" style={{ width:"100%", padding:"10px 14px", border:"1px solid "+C.border, borderRadius:8, marginBottom:12, fontSize:14, boxSizing:"border-box" }}/>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Email (@ignitiongroup.co.za)</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@ignitiongroup.co.za" style={{ width:"100%", padding:"10px 14px", border:"1px solid "+C.border, borderRadius:8, marginBottom:12, fontSize:14, boxSizing:"border-box" }}/>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Department</label>
            <input value={department} onChange={e=>setDepartment(e.target.value)} placeholder="e.g. Finance, HR, IT" style={{ width:"100%", padding:"10px 14px", border:"1px solid "+C.border, borderRadius:8, marginBottom:12, fontSize:14, boxSizing:"border-box" }}/>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a password" style={{ width:"100%", padding:"10px 14px", border:"1px solid "+C.border, borderRadius:8, marginBottom:16, fontSize:14, boxSizing:"border-box" }}/>
            {error && <div style={{ color:C.red, fontSize:13, marginBottom:12, padding:"8px 12px", background:C.redBg, borderRadius:8 }}>{error}</div>}
            <button type="submit" disabled={busy} style={{ width:"100%", padding:"12px", background:C.orange, color:"#fff", border:"none", borderRadius:8, fontWeight:600, fontSize:14, cursor:"pointer" }}>{busy ? "Registering..." : "Create Account"}</button>
            <div style={{ textAlign:"center", marginTop:16, fontSize:13, color:C.t2 }}>
              Already have an account? <button type="button" onClick={()=>{setMode("login");setError("");}} style={{ background:"none", border:"none", color:C.orange, fontWeight:600, cursor:"pointer", fontSize:13 }}>Sign In</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [user, setUser] = useState(getUser());
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dashboard
  const [dashData, setDashData] = useState(null);

  // Tickets
  const [tickets, setTickets] = useState([]);
  const [selTicket, setSelTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // Submit ticket
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Self-help
  const [helpArticles, setHelpArticles] = useState([]);
  const [expandedHelp, setExpandedHelp] = useState(null);

  // Profile
  const [profile, setProfile] = useState(null);
  const [editProfile, setEditProfile] = useState(false);
  const [profName, setProfName] = useState("");
  const [profDept, setProfDept] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const showError = (msg) => { setError(msg); setTimeout(() => setError(null), 5000); };

  // ── Data loading ──────────────────────────────────────────
  const loadDashboard = async () => {
    try {
      const res = await fetchDashboard();
      if (res.data) setDashData(res.data);
    } catch(e) { console.error(e); }
  };

  const loadTickets = async (status) => {
    setLoading(true);
    try {
      const res = await fetchMyTickets(status);
      if (res.data) setTickets(res.data);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const loadTicketDetail = async (id) => {
    setLoading(true);
    try {
      const res = await fetchTicketDetail(id);
      if (res.data) setTicketDetail(res.data);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const loadSelfHelp = async () => {
    try {
      const res = await fetchSelfHelp();
      if (res.data && res.data.length > 0) setHelpArticles(res.data);
      else setHelpArticles(SELF_HELP_DEFAULTS);
    } catch(e) { setHelpArticles(SELF_HELP_DEFAULTS); }
  };

  const loadProfile = async () => {
    try {
      const res = await fetchProfile();
      if (res.data) {
        setProfile(res.data);
        setProfName(res.data.name || "");
        setProfDept(res.data.department || "");
        setProfPhone(res.data.phone || "");
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if (!authed) return;
    if (page === "home") loadDashboard();
    if (page === "tickets") loadTickets(statusFilter);
    if (page === "help") loadSelfHelp();
    if (page === "profile") loadProfile();
  }, [authed, page]);

  useEffect(() => {
    if (selTicket) loadTicketDetail(selTicket);
  }, [selTicket]);

  useEffect(() => {
    if (page === "tickets") loadTickets(statusFilter);
  }, [statusFilter]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const res = await submitTicket({ title: "", description: newDesc, category: newCat || undefined });
      if (res.error) { showError(res.error); setSubmitting(false); return; }
      setNewTitle(""); setNewDesc(""); setNewCat("");
      setPage("tickets");
    } catch(e) { showError(e.message); }
    setSubmitting(false);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      const res = await replyToTicket(selTicket, replyText);
      if (res.error) showError(res.error);
      else { setReplyText(""); loadTicketDetail(selTicket); }
    } catch(e) { showError(e.message); }
    setReplying(false);
  };

  const handleProfileSave = async () => {
    try {
      const res = await updateProfile({ name: profName, department: profDept, phone: profPhone });
      if (res.error) showError(res.error);
      else { setEditProfile(false); loadProfile(); }
    } catch(e) { showError(e.message); }
  };

  const handleChangePw = async (e) => {
    e.preventDefault(); setPwMsg("");
    try {
      const res = await changePassword(curPw, newPw);
      if (res.error) setPwMsg(res.error);
      else { setPwMsg("Password changed!"); setCurPw(""); setNewPw(""); }
    } catch(e) { setPwMsg(e.message); }
  };

  if (!authed) return <AuthScreen onAuth={() => { setAuthed(true); setUser(getUser()); }} />;

  const navTo = (p) => { setPage(p); setSelTicket(null); setTicketDetail(null); };
  const sc = (s) => STATUS_COLORS[s] || { bg: C.neu, fg: C.t3 };

  return (
    <div style={{ fontFamily:"Inter, sans-serif", background:C.bg, minHeight:"100vh" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { margin:0; padding:0; box-sizing:border-box; }
        input, select, textarea { font-family:inherit; font-size:14px; padding:10px 14px; border:1px solid ${C.border}; border-radius:8px; width:100%; }
        textarea { resize:vertical; min-height:80px; }
        .btn { padding:8px 16px; border:1px solid ${C.border}; border-radius:8px; background:#fff; cursor:pointer; font-size:13px; font-weight:500; font-family:inherit; }
        .btn:hover { background:${C.bg}; }
        .btp { background:${C.orange}; color:#fff; border-color:${C.orange}; }
        .btp:hover { background:${C.og2}; }
        .nav-item { padding:10px 20px; cursor:pointer; font-size:14px; font-weight:500; color:${C.t2}; border-bottom:2px solid transparent; transition:all 0.15s; }
        .nav-item:hover { color:${C.t1}; }
        .nav-item.active { color:${C.orange}; border-bottom-color:${C.orange}; }
      `}</style>

      {/* Top navbar */}
      <div style={{ background:"#fff", borderBottom:"1px solid "+C.border, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:32, height:32, background:C.orange, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight:700, fontSize:16, color:C.navy }}>Ignition ITSM</span>
          <span style={{ fontSize:12, color:C.t3, marginLeft:4 }}>Portal</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {[["home","Home"],["tickets","My Tickets"],["submit","Submit Ticket"],["help","Self-Help"],["profile","Profile"]].map(([id, label]) => (
            <div key={id} className={"nav-item"+(page===id?" active":"")} onClick={()=>navTo(id)}>{label}</div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:13 }}>
          <span style={{ color:C.t2 }}>{user?.name}</span>
          <button className="btn" style={{ fontSize:12, padding:"6px 12px" }} onClick={logout}>Sign Out</button>
        </div>
      </div>

      {/* Error banner */}
      {error && <div style={{ padding:"10px 24px", background:C.redBg, color:C.redT, fontSize:13, textAlign:"center" }}>{error}</div>}

      {/* Main content */}
      <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px" }}>

        {/* ── HOME / DASHBOARD ── */}
        {page === "home" && (
          <div>
            <div style={{ fontSize:20, fontWeight:700, marginBottom:4, color:C.navy }}>Welcome back, {user?.name?.split(" ")[0]}</div>
            <div style={{ fontSize:13, color:C.t2, marginBottom:24 }}>Here's a summary of your IT support tickets.</div>

            {dashData ? (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:12, marginBottom:24 }}>
                  <Crd style={{ textAlign:"center", cursor:"pointer" }} onClick={()=>{setStatusFilter(""); navTo("tickets");}}>
                    <div style={{ fontSize:28, fontWeight:700, color:C.orange }}>{dashData.total}</div>
                    <div style={{ fontSize:12, color:C.t2, fontWeight:500 }}>Total Tickets</div>
                  </Crd>
                  {Object.entries(dashData.by_status || {}).map(([status, count]) => (
                    <Crd key={status} style={{ textAlign:"center", cursor:"pointer" }} onClick={()=>{setStatusFilter(status); navTo("tickets");}}>
                      <div style={{ fontSize:28, fontWeight:700, color:sc(status).fg }}>{count}</div>
                      <div style={{ fontSize:12, color:C.t2, fontWeight:500 }}>{status}</div>
                    </Crd>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <Crd>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Quick Actions</div>
                    <button className="btn btp" style={{ width:"100%", marginBottom:8 }} onClick={()=>navTo("submit")}>Submit New Ticket</button>
                    <button className="btn" style={{ width:"100%" }} onClick={()=>navTo("help")}>Browse Self-Help</button>
                  </Crd>
                  <Crd>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Need Help?</div>
                    <div style={{ fontSize:13, color:C.t2, lineHeight:1.7 }}>
                      Before raising a ticket, check our <span style={{ color:C.orange, cursor:"pointer", fontWeight:500 }} onClick={()=>navTo("help")}>Self-Help guides</span> for common solutions.
                      <br/><br/>For urgent issues, call the IT helpdesk directly.
                    </div>
                  </Crd>
                </div>
              </div>
            ) : <Spinner/>}
          </div>
        )}

        {/* ── MY TICKETS ── */}
        {page === "tickets" && !selTicket && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:700, color:C.navy }}>My Tickets</div>
              <div style={{ display:"flex", gap:8 }}>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ width:180 }}>
                  <option value="">All statuses</option>
                  {Object.keys(STATUS_COLORS).map(s=><option key={s}>{s}</option>)}
                </select>
                <button className="btn btp" onClick={()=>navTo("submit")}>+ New Ticket</button>
              </div>
            </div>
            {loading ? <Spinner/> : tickets.length === 0 ? (
              <Crd style={{ textAlign:"center", padding:40 }}>
                <div style={{ fontSize:15, color:C.t3, marginBottom:12 }}>No tickets found</div>
                <button className="btn btp" onClick={()=>navTo("submit")}>Submit your first ticket</button>
              </Crd>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {tickets.map(t => (
                  <Crd key={t.id} style={{ cursor:"pointer", transition:"box-shadow 0.15s" }} onClick={()=>{setSelTicket(t.id);loadTicketDetail(t.id);}}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:12, color:C.orange, fontWeight:600, marginBottom:4 }}>{t.id}</div>
                        <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{t.title}</div>
                        <div style={{ fontSize:12, color:C.t3 }}>{t.category} &middot; {t.priority} &middot; {t.created_at ? new Date(t.created_at).toLocaleDateString() : ""}</div>
                      </div>
                      <Bdg label={t.status} bg={sc(t.status).bg} fg={sc(t.status).fg}/>
                    </div>
                  </Crd>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TICKET DETAIL ── */}
        {page === "tickets" && selTicket && (
          <div>
            <button className="btn" style={{ marginBottom:16 }} onClick={()=>{setSelTicket(null);setTicketDetail(null);}}>&#8592; Back to tickets</button>
            {loading || !ticketDetail ? <Spinner/> : (
              <div>
                {ticketDetail.status === "Pending User Feedback" && (
                  <div style={{ padding:"12px 16px", background:C.yelBg, color:C.yelT, borderRadius:8, marginBottom:16, fontSize:13, fontWeight:500 }}>
                    Awaiting your feedback &mdash; please reply below to update the technician.
                  </div>
                )}
                <Crd style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:12, color:C.orange, fontWeight:600 }}>{ticketDetail.id}</div>
                      <div style={{ fontWeight:700, fontSize:18, marginTop:4 }}>{ticketDetail.title}</div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <Bdg label={ticketDetail.priority} bg={C.yelBg} fg={C.yelT}/>
                      <Bdg label={ticketDetail.status} bg={sc(ticketDetail.status).bg} fg={sc(ticketDetail.status).fg}/>
                    </div>
                  </div>
                  {ticketDetail.description && <div style={{ fontSize:13, color:C.t2, marginBottom:16, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{ticketDetail.description}</div>}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, fontSize:13, marginBottom:16 }}>
                    {[["Category", ticketDetail.category], ["Classification", ticketDetail.classification || "\u2014"], ["Assigned to", ticketDetail.assignee || "Unassigned"]].map(([k,v]) => (
                      <div key={k} style={{ padding:"8px 12px", background:C.bg, borderRadius:8 }}>
                        <div style={{ fontSize:11, color:C.t3, fontWeight:500, marginBottom:2 }}>{k}</div>
                        <div style={{ fontWeight:500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {/* SLA Info */}
                  {(()=>{
                    const slaMap = {"P1 - Critical":{resp:"15 min",resolve:"4 hrs"},"P2 - High":{resp:"30 min",resolve:"8 hrs"},"P3 - Medium":{resp:"2 hrs",resolve:"24 hrs"},"P4 - Low":{resp:"4 hrs",resolve:"48 hrs"}};
                    const sla = slaMap[ticketDetail.priority] || slaMap["P3 - Medium"];
                    const created = new Date(ticketDetail.created_at);
                    const resolveHrs = parseInt(sla.resolve);
                    const deadline = new Date(created.getTime() + resolveHrs * 3600000);
                    const now = new Date();
                    const remaining = deadline - now;
                    const hoursLeft = Math.max(0, Math.floor(remaining / 3600000));
                    const minsLeft = Math.max(0, Math.floor((remaining % 3600000) / 60000));
                    const overdue = remaining <= 0 && !["Resolved","Closed"].includes(ticketDetail.status);
                    const resolved = ["Resolved","Closed"].includes(ticketDetail.status);
                    return (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, fontSize:13 }}>
                        <div style={{ padding:"8px 12px", background:C.bg, borderRadius:8 }}>
                          <div style={{ fontSize:11, color:C.t3, fontWeight:500, marginBottom:2 }}>Created</div>
                          <div style={{ fontWeight:500 }}>{created.toLocaleString(undefined,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                        </div>
                        <div style={{ padding:"8px 12px", background:C.bg, borderRadius:8 }}>
                          <div style={{ fontSize:11, color:C.t3, fontWeight:500, marginBottom:2 }}>Response SLA</div>
                          <div style={{ fontWeight:500 }}>{sla.resp}</div>
                        </div>
                        <div style={{ padding:"8px 12px", background:C.bg, borderRadius:8 }}>
                          <div style={{ fontSize:11, color:C.t3, fontWeight:500, marginBottom:2 }}>Resolution SLA</div>
                          <div style={{ fontWeight:500 }}>{sla.resolve}</div>
                        </div>
                        <div style={{ padding:"8px 12px", background:overdue?"#FEF2F2":resolved?"#F0FDF4":C.bg, borderRadius:8 }}>
                          <div style={{ fontSize:11, color:C.t3, fontWeight:500, marginBottom:2 }}>Time Remaining</div>
                          <div style={{ fontWeight:600, color:overdue?"#DC2626":resolved?"#16A34A":hoursLeft<2?"#D97706":C.navy }}>
                            {resolved ? "Resolved" : overdue ? "Overdue" : hoursLeft+"h "+minsLeft+"m"}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </Crd>

                {/* Notes timeline */}
                <Crd style={{ marginBottom:16 }}>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Activity</div>
                  {(ticketDetail.notes || []).length === 0 ? (
                    <div style={{ color:C.t3, fontSize:13, padding:"12px 0" }}>No activity yet</div>
                  ) : (ticketDetail.notes || []).map((n, i) => (
                    <div key={n.id || i} style={{ padding:"10px 0", borderBottom:i < ticketDetail.notes.length - 1 ? "1px solid "+C.border : "none" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontWeight:600, fontSize:13 }}>{n.author}</span>
                        <span style={{ fontSize:11, color:C.t3 }}>{n.created_at ? new Date(n.created_at).toLocaleString(undefined, { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : ""}</span>
                      </div>
                      <div style={{ fontSize:13, color:C.t2, whiteSpace:"pre-wrap" }}>{n.text}</div>
                    </div>
                  ))}
                </Crd>

                {/* Reply box */}
                {!["Resolved","Closed"].includes(ticketDetail.status) && (
                  <Crd>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:8 }}>Add a reply</div>
                    <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Type your reply..." style={{ marginBottom:8 }}/>
                    <button className="btn btp" disabled={replying || !replyText.trim()} onClick={handleReply}>{replying ? "Sending..." : "Send Reply"}</button>
                  </Crd>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SUBMIT TICKET ── */}
        {page === "submit" && (
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:C.navy, marginBottom:4 }}>Submit a Ticket</div>
            <div style={{ fontSize:13, color:C.t2, marginBottom:20 }}>Tell us what's wrong in plain English. AI will classify your request and generate a title automatically.</div>
            <Crd>
              <form onSubmit={handleSubmitTicket}>
                <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>What's the issue?</label>
                <textarea required value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Describe your issue in plain English: what happened, when it started, any error messages you're seeing..." style={{ marginBottom:12, minHeight:150 }}/>
                <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Category (optional &mdash; AI will auto-assign if left blank)</label>
                <select value={newCat} onChange={e=>setNewCat(e.target.value)} style={{ marginBottom:16 }}>
                  <option value="">Let AI decide</option>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
                <button type="submit" className="btn btp" disabled={submitting} style={{ width:"100%" }}>{submitting ? "Submitting..." : "Submit Ticket"}</button>
              </form>
            </Crd>
          </div>
        )}

        {/* ── SELF-HELP ── */}
        {page === "help" && (
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:C.navy, marginBottom:4 }}>Self-Help</div>
            <div style={{ fontSize:13, color:C.t2, marginBottom:20 }}>Quick fixes for common IT issues. Try these before submitting a ticket.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {helpArticles.map(a => (
                <Crd key={a.id} style={{ cursor:"pointer" }} onClick={()=>setExpandedHelp(expandedHelp===a.id ? null : a.id)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{a.title}</div>
                    <span style={{ fontSize:18, color:C.t3, transform:expandedHelp===a.id?"rotate(180deg)":"none", transition:"transform 0.2s" }}>&#9660;</span>
                  </div>
                  {expandedHelp === a.id && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid "+C.border, fontSize:13, color:C.t2, lineHeight:1.8, whiteSpace:"pre-wrap" }}>
                      {a.body}
                    </div>
                  )}
                </Crd>
              ))}
            </div>
          </div>
        )}

        {/* ── PROFILE ── */}
        {page === "profile" && (
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:C.navy, marginBottom:20 }}>My Profile</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <Crd>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Personal Information</div>
                {profile ? (
                  editProfile ? (
                    <div>
                      <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Name</label>
                      <input value={profName} onChange={e=>setProfName(e.target.value)} style={{ marginBottom:8 }}/>
                      <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Department</label>
                      <input value={profDept} onChange={e=>setProfDept(e.target.value)} style={{ marginBottom:8 }}/>
                      <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Phone</label>
                      <input value={profPhone} onChange={e=>setProfPhone(e.target.value)} style={{ marginBottom:12 }}/>
                      <div style={{ display:"flex", gap:8 }}><button className="btn btp" onClick={handleProfileSave}>Save</button><button className="btn" onClick={()=>setEditProfile(false)}>Cancel</button></div>
                    </div>
                  ) : (
                    <div>
                      {[["Name", profile.name], ["Email", profile.email], ["Department", profile.department || "\u2014"], ["Phone", profile.phone || "\u2014"]].map(([k,v]) => (
                        <div key={k} style={{ marginBottom:10 }}>
                          <div style={{ fontSize:11, color:C.t3, fontWeight:500 }}>{k}</div>
                          <div style={{ fontSize:14, fontWeight:500 }}>{v}</div>
                        </div>
                      ))}
                      <button className="btn" style={{ marginTop:8 }} onClick={()=>setEditProfile(true)}>Edit Profile</button>
                    </div>
                  )
                ) : <Spinner/>}
              </Crd>

              <Crd>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Change Password</div>
                <form onSubmit={handleChangePw}>
                  <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>Current password</label>
                  <input type="password" value={curPw} onChange={e=>setCurPw(e.target.value)} style={{ marginBottom:8 }}/>
                  <label style={{ display:"block", fontSize:12, fontWeight:500, color:C.t2, marginBottom:4 }}>New password</label>
                  <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{ marginBottom:12 }}/>
                  <button type="submit" className="btn btp">Change Password</button>
                  {pwMsg && <div style={{ marginTop:8, fontSize:13, color:pwMsg.includes("changed") ? C.grn : C.red }}>{pwMsg}</div>}
                </form>
              </Crd>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ textAlign:"center", padding:"24px 0", fontSize:12, color:C.t3 }}>Ignition Group IT &middot; Self-Service Portal</div>
    </div>
  );
}
