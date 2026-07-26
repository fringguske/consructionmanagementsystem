import { useState, type FormEvent } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import {
  FinanceApprovals,
  FinanceControl,
  FinanceMatching,
  FinanceOfficerDashboard,
  FinanceReconciliation,
  TransactionChainDrawer,
  transactionChains,
  type TransactionChain,
} from './FinanceWorkflow'

type IconName =
  | 'grid' | 'building' | 'cart' | 'boxes' | 'wallet' | 'users' | 'tool'
  | 'shield' | 'settings' | 'search' | 'bell' | 'chevron' | 'arrow'
  | 'plus' | 'clock' | 'check' | 'alert' | 'more' | 'filter' | 'download'
  | 'truck' | 'file' | 'close' | 'menu' | 'trend' | 'pin' | 'calendar'
  | 'swap' | 'eye' | 'lock' | 'receipt'

type DemoRole = 'CEO' | 'Manager' | 'Engineer' | 'Foreman' | 'Cashier' | 'Storekeeper' | 'Procurement Officer' | 'Finance Officer' | 'Auditor'

type PaymentCandidate = {
  reference: string
  supplier: string
  invoice: string
  project: string
  amount: string
  method: string
}

const roleOptions = [
  { name: 'CEO', description: 'Portfolio oversight', enabled: true },
  { name: 'Manager', description: 'Projects and site operations', enabled: true },
  { name: 'Engineer', description: 'Progress and quality', enabled: true },
  { name: 'Foreman', description: 'Site work and requests', enabled: true },
  { name: 'Cashier', description: 'Payments and site cash', enabled: true },
  { name: 'Storekeeper', description: 'Stock and material movement', enabled: true },
  { name: 'Procurement Officer', description: 'Sourcing and purchase orders', enabled: true },
  { name: 'Finance Officer', description: 'Matching and payment control', enabled: true },
  { name: 'Auditor', description: 'Read-only controls review', enabled: true },
] as const

const roleProfiles: Record<DemoRole, { name: string; initials: string; workspace: string; subtitle: string }> = {
  CEO: { name: 'JOSEPHINE CHARLES', initials: 'JC', workspace: 'Executive workspace', subtitle: 'CEO' },
  Manager: { name: 'STEVEN KAKAI', initials: 'ST', workspace: 'Operations workspace', subtitle: 'Manager' },
  Engineer: { name: 'DANIEL OTIENO', initials: 'DO', workspace: 'Technical workspace', subtitle: 'Engineer' },
  Foreman: { name: 'SAMUEL KARIUKI', initials: 'SK', workspace: 'Gilgal 2 field workspace', subtitle: 'Foreman' },
  Cashier: { name: 'EUNICE NGUMBI', initials: 'EN', workspace: 'Payments workspace', subtitle: 'Cashier' },
  Storekeeper: { name: 'LUCY NJERI', initials: 'LN', workspace: 'Stores workspace', subtitle: 'Storekeeper' },
  'Procurement Officer': { name: 'PAUL KIMANI', initials: 'PK', workspace: 'Procurement workspace', subtitle: 'Procurement Officer' },
  'Finance Officer': { name: 'JAMES KAMAU', initials: 'JK', workspace: 'Financial control workspace', subtitle: 'Finance Officer' },
  Auditor: { name: 'MARY ATIENZA', initials: 'MA', workspace: 'Read-only audit workspace', subtitle: 'Auditor' },
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    building: <><path d="M4 21V5l8-3v19M12 8h8v13M2 21h20"/><path d="M8 6v2m0 3v2m0 3v2m8-6h1m-1 4h1"/></>,
    cart: <><path d="M3 3h2l2.4 11.5a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
    boxes: <><path d="m12 2 8 4-8 4-8-4 8-4Z"/><path d="m4 10 8 4 8-4M4 14l8 4 8-4M4 6v12l8 4 8-4V6"/></>,
    wallet: <><path d="M4 5h15a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V5a3 3 0 0 1 3-3h13"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    tool: <><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L21 17.4a2.1 2.1 0 0 1-3 3l-8.7-8.7"/><path d="m5 13-3 3 6 6 3-3"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    filter: <path d="M4 5h16M7 12h10M10 19h4"/>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/></>,
    truck: <><path d="M3 5h11v12H3zM14 9h4l3 3v5h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></>,
    file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    trend: <path d="m3 17 6-6 4 4 8-9m-5 0h5v5"/>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    swap: <><path d="M7 7h13l-3-3m3 3-3 3M17 17H4l3 3m-3-3 3-3"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    receipt: <><path d="M5 3v19l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2Z"/><path d="M9 9h6M9 13h6"/></>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const projects = [
  { name: 'Gilgal 1', location: 'Sweet-Waters, Machakos', manager: 'Peter Mwangi', budget: 48.2, spent: 31.4, committed: 5.7, progress: 68, status: 'On track', code: 'G1', color: '#1c5d52' },
  { name: 'Gilgal 2', location: 'Sweet-Waters, Machakos', manager: 'Mercy Wanjiku', budget: 36.5, spent: 28.9, committed: 3.2, progress: 74, status: 'At risk', code: 'G2', color: '#bc6a35' },
  { name: 'SNEP HQ', location: 'Mumbuni, Machakos', manager: 'James Otieno', budget: 72.0, spent: 20.6, committed: 9.8, progress: 39, status: 'On track', code: 'HQ', color: '#3d5b86' },
  { name: 'Church', location: 'Vota, Machakos', manager: 'David Maina', budget: 25.8, spent: 8.3, committed: 2.1, progress: 31, status: 'On track', code: 'CH', color: '#765b8e' },
]

const requisitions = [
  { id: 'MR-0248', item: 'Y12 reinforcement steel', qty: '240 lengths', site: 'Gilgal 2', requester: 'Samuel K.', date: 'Today, 09:42', value: 'KES 412,800', status: 'Needs approval', risk: 'Price +8.4%' },
  { id: 'MR-0247', item: 'Bamburi cement', qty: '180 bags', site: 'SNEP HQ', requester: 'Daniel O.', date: 'Today, 08:16', value: 'KES 171,000', status: 'Needs approval', risk: '' },
  { id: 'MR-0246', item: 'Machine-cut stones', qty: '1,200 pcs', site: 'Church', requester: 'John M.', date: 'Yesterday, 16:25', value: 'KES 84,000', status: 'PO created', risk: '' },
  { id: 'MR-0245', item: 'River sand', qty: '18 tonnes', site: 'Gilgal 1', requester: 'Joseph N.', date: 'Yesterday, 11:40', value: 'KES 63,000', status: 'Approved', risk: '' },
  { id: 'MR-0244', item: 'PVC conduit 25mm', qty: '150 lengths', site: 'SNEP HQ', requester: 'Daniel O.', date: '23 Jul, 14:05', value: 'KES 33,750', status: 'Fulfilled', risk: '' },
]

const nav = [
  { to: '/', label: 'Overview', icon: 'grid' as IconName },
  { to: '/projects', label: 'Projects', icon: 'building' as IconName },
  { to: '/procurement', label: 'Procurement', icon: 'cart' as IconName, badge: 4 },
  { to: '/inventory', label: 'Inventory', icon: 'boxes' as IconName, badge: 2 },
  { to: '/finance', label: 'Finance', icon: 'wallet' as IconName, badge: 3 },
  { to: '/workforce', label: 'Workforce', icon: 'users' as IconName },
  { to: '/equipment', label: 'Equipment', icon: 'tool' as IconName },
  { to: '/audit', label: 'Audit & controls', icon: 'shield' as IconName },
]

const roleNavigation: Record<DemoRole, string[]> = {
  CEO: ['/', '/projects', '/procurement', '/inventory', '/finance', '/workforce', '/equipment', '/audit'],
  Manager: ['/', '/projects', '/procurement', '/inventory', '/finance', '/workforce', '/equipment'],
  Engineer: ['/', '/projects', '/quality', '/drawings'],
  Foreman: ['/', '/procurement', '/inventory', '/workforce', '/equipment'],
  Cashier: ['/', '/finance'],
  Storekeeper: ['/', '/inventory', '/receiving', '/issues', '/transfers', '/stock-counts'],
  'Procurement Officer': ['/', '/procurement', '/purchase-orders', '/suppliers'],
  'Finance Officer': ['/', '/finance', '/finance-matching', '/finance-approvals', '/finance-reconciliation'],
  Auditor: ['/', '/audit', '/audit-samples', '/audit-reports'],
}

const fieldRoleNav: Partial<Record<DemoRole, typeof nav>> = {
  Engineer: [
    { to: '/', label: 'Technical overview', icon: 'grid' },
    { to: '/projects', label: 'Progress & milestones', icon: 'building' },
    { to: '/quality', label: 'Quality inspections', icon: 'shield', badge: 2 },
    { to: '/drawings', label: 'Drawings & documents', icon: 'file' },
  ],
  Foreman: [
    { to: '/', label: 'Today on site', icon: 'grid' },
    { to: '/procurement', label: 'My material requests', icon: 'cart', badge: 2 },
    { to: '/inventory', label: 'Materials on site', icon: 'boxes', badge: 1 },
    { to: '/workforce', label: 'Daily site log', icon: 'users' },
    { to: '/equipment', label: 'Tools issued to me', icon: 'tool' },
  ],
  Storekeeper: [
    { to: '/', label: 'Stores overview', icon: 'grid' },
    { to: '/receiving', label: 'Receive deliveries', icon: 'truck', badge: 3 },
    { to: '/issues', label: 'Issue materials', icon: 'boxes', badge: 2 },
    { to: '/transfers', label: 'Site transfers', icon: 'swap', badge: 3 },
    { to: '/inventory', label: 'Stock ledger', icon: 'file' },
    { to: '/stock-counts', label: 'Stock counts', icon: 'check' },
  ],
  'Procurement Officer': [
    { to: '/', label: 'Procurement overview', icon: 'grid' },
    { to: '/procurement', label: 'Approved requests', icon: 'cart', badge: 4 },
    { to: '/purchase-orders', label: 'Purchase orders', icon: 'file', badge: 2 },
    { to: '/suppliers', label: 'Suppliers & quotes', icon: 'users' },
  ],
  'Finance Officer': [
    { to: '/', label: 'Finance overview', icon: 'grid' },
    { to: '/finance-matching', label: 'Three-way matching', icon: 'check', badge: 3 },
    { to: '/finance-approvals', label: 'Payment authorisation', icon: 'shield', badge: 2 },
    { to: '/finance', label: 'Budgets & payables', icon: 'wallet' },
    { to: '/finance-reconciliation', label: 'Reconciliation', icon: 'receipt', badge: 1 },
  ],
  Auditor: [
    { to: '/', label: 'Audit overview', icon: 'grid' },
    { to: '/audit', label: 'Audit trail', icon: 'shield' },
    { to: '/audit-samples', label: 'Evidence review', icon: 'eye', badge: 5 },
    { to: '/audit-reports', label: 'Reports & exports', icon: 'download' },
  ],
}

function Status({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const cls = tone || String(children).toLowerCase().replaceAll(' ', '-')
  return <span className={`status ${cls}`}><i />{children}</span>
}

function Button({ children, variant = 'primary', icon, onClick, type = 'button' }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; icon?: IconName;
  onClick?: () => void; type?: 'button' | 'submit'
}) {
  return <button type={type} className={`button ${variant}`} onClick={onClick}>{icon && <Icon name={icon} size={16} />}{children}</button>
}

function Shell() {
  const [navOpen, setNavOpen] = useState(false)
  const [site, setSite] = useState('All projects')
  const [searchOpen, setSearchOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [role, setRole] = useState<DemoRole>('CEO')
  const location = useLocation()
  const navigate = useNavigate()
  const profile = roleProfiles[role]
  const standardNav = nav.filter(item => roleNavigation[role].includes(item.to)).map(item => ({
    ...item,
    label: role === 'Cashier' && item.to === '/finance'
      ? 'Payments & cash'
      : role === 'Manager' && item.to === '/finance'
        ? 'Budget tracking'
        : item.label,
  }))
  const visibleNav = fieldRoleNav[role] ?? standardNav
  const roleHomeTitles: Record<DemoRole, [string, string]> = {
    CEO: ['Portfolio overview', 'Saturday, 25 July 2026'],
    Manager: ['Site operations', 'Work requiring the manager today'],
    Engineer: ['Technical overview', 'Progress, quality and site compliance'],
    Foreman: ['Today at Gilgal 2', 'Work, people and materials under your supervision'],
    Cashier: ['Payments desk', 'Approved payments and accountable site cash'],
    Storekeeper: ['Stores overview', 'Deliveries, issues and stock custody requiring action'],
    'Procurement Officer': ['Procurement overview', 'Source approved needs and control purchase orders'],
    'Finance Officer': ['Financial control', 'Match evidence, authorise payments and protect project budgets'],
    Auditor: ['Audit overview', 'Read-only control assurance across every project'],
  }
  const titles: Record<string, [string, string]> = {
    '/': roleHomeTitles[role],
    '/projects': role === 'Engineer' ? ['Progress & milestones', 'Verified construction progress across active sites'] : ['Projects', 'Portfolio health and site delivery'],
    '/procurement': role === 'Foreman' ? ['My material requests', 'Request what the site needs and follow its approval'] : role === 'Procurement Officer' ? ['Approved sourcing queue', 'Source approved demand without changing it'] : ['Procurement', 'Requisitions, approvals and purchase orders'],
    '/inventory': role === 'Foreman' ? ['Materials on site', 'Confirm receipt, record use and report wastage'] : role === 'Storekeeper' ? ['Stock ledger', 'Immutable balances across project stores'] : ['Inventory', 'Stock levels and material movement'],
    '/finance': role === 'Cashier'
      ? ['Payments & cash', 'Execute approved payments and reconcile site floats']
      : role === 'Manager'
        ? ['Budget tracking', 'Read-only cost position across projects']
        : role === 'Finance Officer'
          ? ['Budgets & payables', 'Control commitments, invoices and available project funds']
        : ['Finance', 'Budget, commitments and payments'],
    '/workforce': role === 'Foreman' ? ['Daily site log', 'People, work completed and blockers at Gilgal 2'] : ['Workforce', 'Attendance, labour and subcontractors'],
    '/equipment': role === 'Foreman' ? ['Tools issued to me', 'Custody and condition of Gilgal 2 tools'] : ['Equipment', 'Assignments, condition and rental costs'],
    '/quality': ['Quality inspections', 'Technical checks, defects and corrective work'],
    '/drawings': ['Drawings & documents', 'Current approved information for construction'],
    '/receiving': ['Receive deliveries', 'Record actual quantities and condition against approved orders'],
    '/issues': ['Issue materials', 'Release stock only against approved site requests'],
    '/transfers': ['Site transfers', 'Dual-confirmed movement between project stores'],
    '/stock-counts': ['Stock counts', 'Physical counts and accountable variance records'],
    '/purchase-orders': ['Purchase orders', 'Orders raised from approved requisitions'],
    '/suppliers': ['Suppliers & quotations', 'Controlled sourcing and comparative bids'],
    '/finance-matching': ['Three-way matching', 'Compare purchase orders, physical receipts and supplier invoices'],
    '/finance-approvals': ['Payment authorisation', 'Release only fully supported invoices to the Cashier'],
    '/finance-reconciliation': ['Reconciliation', 'Prove that ledgers, statements and project cash agree'],
    '/audit-samples': ['Evidence review', 'Trace selected transactions from request to final movement'],
    '/audit-reports': ['Reports & exports', 'Independent read-only audit outputs'],
    '/audit': ['Audit & controls', 'Exceptions, compliance and activity'],
    '/settings': ['Settings', 'People, roles and control configuration'],
  }
  const [title, subtitle] = titles[location.pathname] || titles['/']
  const switchRole = (nextRole: DemoRole) => {
    setRole(nextRole)
    setRoleMenuOpen(false)
    setSite(nextRole === 'Foreman' ? 'Gilgal 2' : 'All projects')
    navigate('/')
  }
  const canAccess = (path: string) => roleNavigation[role].includes(path)

  return <div className="app-shell">
    <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><span /><span /><span /></div>
        <div><strong>CONSTRUCT</strong><small>CONTROL SYSTEM</small></div>
        <button className="mobile-close" onClick={() => setNavOpen(false)} aria-label="Close navigation"><Icon name="close" /></button>
      </div>
      <div className="workspace">
        <span className="avatar small">SM</span>
        <div><strong>Constructions Management System</strong><small>{profile.workspace}</small></div>
        <Icon name="chevron" size={14}/>
      </div>
      <nav className="main-nav">
        <span className="nav-caption">WORKSPACE</span>
        {visibleNav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setNavOpen(false)}>
          <Icon name={item.icon}/><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        {role === 'CEO' && <NavLink to="/settings"><Icon name="settings"/><span>Settings</span></NavLink>}
        <div className="control-note"><Icon name="lock" size={16}/><div><b>Controls active</b><span>All transactions are logged</span></div></div>
      </div>
    </aside>
    {navOpen && <div className="scrim" onClick={() => setNavOpen(false)}/>}
    <main className="main">
      <header className="topbar">
        <button className="menu-button" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Icon name="menu"/></button>
        <div className="page-title"><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="top-actions">
          <label className={`site-picker ${role === 'Foreman' ? 'assigned-site' : ''}`}><Icon name="building" size={16}/><select value={site} disabled={role === 'Foreman'} onChange={e => setSite(e.target.value)}>{role !== 'Foreman' && <option>All projects</option>}{projects.filter(project => role !== 'Foreman' || project.name === 'Gilgal 2').map(project => <option key={project.name}>{project.name}</option>)}</select><span>{role === 'Foreman' ? <Icon name="lock" size={12}/> : '⌄'}</span></label>
          <button className="icon-button" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search"><Icon name="search"/></button>
          <button className="icon-button notification" aria-label="Notifications"><Icon name="bell"/><i>5</i></button>
          <div className="role-switcher">
            <button className="profile" onClick={() => setRoleMenuOpen(!roleMenuOpen)} aria-expanded={roleMenuOpen}>
              <span className="avatar">{profile.initials}</span><div><b>{profile.name}</b><small>{profile.subtitle} · Demo role</small></div><span>⌄</span>
            </button>
            {roleMenuOpen && <div className="role-menu">
              <div className="role-menu-head"><div><span>DEMO AS A ROLE</span><b>Choose a workspace</b></div><button onClick={() => setRoleMenuOpen(false)} aria-label="Close role menu"><Icon name="close" size={16}/></button></div>
              <div className="role-menu-list">
                {roleOptions.map(option => <button
                  key={option.name}
                  disabled={!option.enabled}
                  className={role === option.name ? 'active' : ''}
                  onClick={() => option.enabled && switchRole(option.name as DemoRole)}
                >
                  <span className="role-dot">{option.name.split(' ').map(word => word[0]).join('').slice(0,2)}</span>
                  <span><b>{option.name}</b><small>{option.description}</small></span>
                  {option.enabled ? role === option.name && <Icon name="check" size={15}/> : <em>Coming next</em>}
                </button>)}
              </div>
              <p><Icon name="lock" size={13}/></p>
            </div>}
          </div>
        </div>
      </header>
      {searchOpen && <div className="search-panel"><Icon name="search"/><input autoFocus placeholder="Search requisitions, suppliers, sites or payments…"/><kbd>ESC</kbd></div>}
      <div className="page-content">
        <Routes>
          <Route path="/" element={<RoleDashboard role={role}/>}/>
          <Route path="/projects" element={canAccess('/projects') ? role === 'Engineer' ? <EngineerProgress/> : <Projects readOnly={role === 'CEO'}/> : <AccessRestricted role={role}/>}/>
          <Route path="/procurement" element={canAccess('/procurement') ? role === 'Foreman' ? <ForemanRequests/> : role === 'Procurement Officer' ? <ProcurementApprovedRequests/> : <Procurement readOnly={role === 'CEO'}/> : <AccessRestricted role={role}/>}/>
          <Route path="/inventory" element={canAccess('/inventory') ? role === 'Foreman' ? <ForemanMaterials/> : role === 'Storekeeper' ? <StorekeeperLedger/> : <Inventory readOnly={role === 'CEO' || role === 'Manager'}/> : <AccessRestricted role={role}/>}/>
          <Route path="/finance" element={canAccess('/finance') ? role === 'Cashier' ? <CashierFinance/> : role === 'Manager' ? <ManagerBudget/> : role === 'Finance Officer' ? <FinanceControl/> : <Finance/> : <AccessRestricted role={role}/>}/>
          <Route path="/workforce" element={canAccess('/workforce') ? role === 'Foreman' ? <ForemanDailyLog/> : <Workforce readOnly={role === 'CEO' || role === 'Manager'}/> : <AccessRestricted role={role}/>}/>
          <Route path="/equipment" element={canAccess('/equipment') ? role === 'Foreman' ? <ForemanTools/> : <Equipment readOnly={role === 'CEO' || role === 'Manager'}/> : <AccessRestricted role={role}/>}/>
          <Route path="/quality" element={canAccess('/quality') ? <EngineerQuality/> : <AccessRestricted role={role}/>}/>
          <Route path="/drawings" element={canAccess('/drawings') ? <EngineerDrawings/> : <AccessRestricted role={role}/>}/>
          <Route path="/receiving" element={canAccess('/receiving') ? <StorekeeperReceiving/> : <AccessRestricted role={role}/>}/>
          <Route path="/issues" element={canAccess('/issues') ? <StorekeeperIssues/> : <AccessRestricted role={role}/>}/>
          <Route path="/transfers" element={canAccess('/transfers') ? <StorekeeperTransfers/> : <AccessRestricted role={role}/>}/>
          <Route path="/stock-counts" element={canAccess('/stock-counts') ? <StorekeeperCounts/> : <AccessRestricted role={role}/>}/>
          <Route path="/purchase-orders" element={canAccess('/purchase-orders') ? <ProcurementOrders/> : <AccessRestricted role={role}/>}/>
          <Route path="/suppliers" element={canAccess('/suppliers') ? <ProcurementSuppliers/> : <AccessRestricted role={role}/>}/>
          <Route path="/finance-matching" element={canAccess('/finance-matching') ? <FinanceMatching/> : <AccessRestricted role={role}/>}/>
          <Route path="/finance-approvals" element={canAccess('/finance-approvals') ? <FinanceApprovals/> : <AccessRestricted role={role}/>}/>
          <Route path="/finance-reconciliation" element={canAccess('/finance-reconciliation') ? <FinanceReconciliation/> : <AccessRestricted role={role}/>}/>
          <Route path="/audit-samples" element={canAccess('/audit-samples') ? <AuditEvidence/> : <AccessRestricted role={role}/>}/>
          <Route path="/audit-reports" element={canAccess('/audit-reports') ? <AuditReports/> : <AccessRestricted role={role}/>}/>
          <Route path="/audit" element={canAccess('/audit') ? <Audit readOnly={role === 'Auditor' || role === 'CEO'} ownerView={role === 'CEO'}/> : <AccessRestricted role={role}/>}/>
          <Route path="/settings" element={role === 'CEO' ? <Settings/> : <AccessRestricted role={role}/>}/>
          <Route path="*" element={<RoleDashboard role={role}/>}/>
        </Routes>
      </div>
    </main>
  </div>
}

function RoleDashboard({ role }: { role: DemoRole }) {
  if (role === 'Manager') return <ManagerDashboard/>
  if (role === 'Engineer') return <EngineerDashboard/>
  if (role === 'Foreman') return <ForemanDashboard/>
  if (role === 'Cashier') return <CashierDashboard/>
  if (role === 'Storekeeper') return <StorekeeperDashboard/>
  if (role === 'Procurement Officer') return <ProcurementOfficerDashboard/>
  if (role === 'Finance Officer') return <FinanceOfficerDashboard/>
  if (role === 'Auditor') return <AuditorDashboard/>
  return <Dashboard/>
}

function AccessRestricted({ role }: { role: DemoRole }) {
  const navigate = useNavigate()
  return <section className="access-restricted">
    <div><Icon name="lock" size={27}/></div>
    <span>ROLE-BASED ACCESS</span>
    <h2>This area is not part of the {role} workspace.</h2>
    <p>For the finished system, the backend will apply the same restriction from the authenticated user’s role.</p>
    <Button onClick={() => navigate('/')}>Return to my overview</Button>
  </section>
}

function Metric({ label, value, note, icon, tone, bar }: { label: string; value: string; note: string; icon: IconName; tone: string; bar?: number }) {
  return <article className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon name={icon}/></div>
    <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    {bar !== undefined && <div className="mini-progress"><i style={{ width: `${bar}%` }}/></div>}
  </article>
}

function Dashboard() {
  const navigate = useNavigate()
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)
  const ownerProjects = projects.map((project, index) => ({
    ...project,
    moneyUsed: Math.round((project.spent / project.budget) * 100),
    expected: ['18 Dec 2026', '30 Sep 2026', '28 Feb 2027', '15 Apr 2027'][index],
    ownerStatus: index === 1 ? 'Needs attention' : 'Doing well',
    ownerNote: [
      'Construction and spending are moving at a similar pace.',
      'Most of the budget is already used or reserved.',
      'Construction is ahead of the money spent.',
      'Early works are progressing as planned.',
    ][index],
  }))

  return <>
    <section className="owner-welcome">
      <div>
        <span className="owner-eyebrow">YOUR PROJECTS AT A GLANCE</span>
        <h2>Good morning, Josephine.</h2>
        <p>Three projects are doing well. <strong>Gilgal 2 needs your attention.</strong></p>
      </div>
      <div className="last-updated"><i/><span><b>Information is up to date</b>Last updated today at 10:45</span></div>
    </section>

    <section className="owner-money">
      <div className="owner-money-intro"><span>YOUR MONEY</span><p>A simple view of the approved budget across all four projects.</p></div>
      <div><span>Total budget</span><strong>KES 182.5M</strong><small>Approved for all projects</small></div>
      <div><span>Already paid</span><strong>KES 89.2M</strong><small>Money that has left the business</small></div>
      <div><span>Approved orders</span><strong>KES 20.8M</strong><small>Promised, but not paid yet</small></div>
      <div className="money-remaining"><span>Money remaining</span><strong>KES 72.5M</strong><small>39.7% of the total budget</small></div>
    </section>

    <section className="panel owner-project-panel">
      <PanelHead title="How each project is doing" subtitle="Compare construction completed with money already paid" action="See full project details" onClick={() => navigate('/projects')}/>
      <div className="owner-project-list">
        {ownerProjects.map(project => <article className={`owner-project ${project.ownerStatus === 'Needs attention' ? 'watch' : ''}`} key={project.name}>
          <div className="owner-project-identity">
            <b style={{background:project.color}}>{project.code}</b>
            <div><h3>{project.name}</h3><span>{project.location}</span></div>
          </div>
          <div className="plain-status">
            <i><Icon name={project.ownerStatus === 'Needs attention' ? 'alert' : 'check'} size={14}/></i>
            <div><strong>{project.ownerStatus}</strong><span>{project.ownerNote}</span></div>
          </div>
          <div className="owner-comparison">
            <div><span>Construction complete</span><b>{project.progress}%</b></div>
            <div className="owner-bar construction"><i style={{width:`${project.progress}%`}}/></div>
            <div><span>Money already paid</span><b>{project.moneyUsed}%</b></div>
            <div className="owner-bar money"><i style={{width:`${project.moneyUsed}%`}}/></div>
          </div>
          <div className="owner-project-date"><span>Expected finish</span><strong>{project.expected}</strong><small>KES {(project.budget-project.spent-project.committed).toFixed(1)}M not yet used</small></div>
          <button aria-label={`Open ${project.name}`} onClick={() => navigate('/projects')}><Icon name="chevron" size={17}/></button>
        </article>)}
      </div>
    </section>

    <section className="panel owner-chain-panel">
      <div className="owner-chain-head">
        <div><span>DEMONSTRATION WORKFLOW</span><h3>See the complete paper trail</h3><p>Open any movement to see who requested, approved, bought, received, checked, authorised, paid and audited it.</p></div>
        <div className="owner-observer-note"><Icon name="eye" size={16}/><span><b>You stay outside routine work</b>Only exceptions above your threshold ask for a decision.</span></div>
      </div>
      <div className="owner-chain-list">
        {transactionChains.map(chain => <article className={chain.ceoActionRequired ? 'requires-owner' : ''} key={chain.id}>
          <div className="owner-chain-state"><i><Icon name={chain.ceoActionRequired ? 'alert' : chain.status === 'Paid & audited' ? 'check' : 'clock'} size={15}/></i><span><b>{chain.ceoActionRequired ? 'Your decision is required' : 'Visible for transparency'}</b><small>{chain.ceoActionRequired ? 'Owner threshold reached' : 'No routine action for you'}</small></span></div>
          <div className="owner-chain-subject"><b>{chain.item}</b><span>{chain.project} · {chain.supplier}</span></div>
          <div className="owner-chain-value"><span>Transaction value</span><b>KES {chain.amount.toLocaleString('en-KE')}</b></div>
          <div className="owner-chain-progress"><span>{chain.currentStage}</span><small>{chain.steps.filter(step => step.state === 'complete').length} of {chain.steps.length} accountable stages complete</small></div>
          <Button variant="secondary" onClick={() => setSelectedChain(chain)}>See complete chain</Button>
        </article>)}
      </div>
    </section>

    <section className="owner-bottom-grid">
      <div className="panel owner-decisions">
        <PanelHead title="Your decisions" subtitle="Only high-value or exceptional items reach the CEO"/>
        <div className="decision-list">
          <article>
            <div className="decision-number">1</div>
            <div><span>HIGH-VALUE PURCHASE</span><h3>Approve Church roof trusses</h3><p>The Manager and Finance Officer have completed their checks. It reaches you only because it exceeds the KES 500,000 owner threshold.</p><small><b>KES 784,500</b> · Complete evidence chain attached</small></div>
            <Button variant="secondary" onClick={() => setSelectedChain(transactionChains[2])}>Review chain</Button>
          </article>
          <article>
            <div className="decision-number">2</div>
            <div><span>BUDGET EXCEPTION</span><h3>Decide on Gilgal 2’s structural variation</h3><p>A KES 1.2M budget movement needs owner approval. Routine budget monitoring remains with the Manager and Finance Officer.</p></div>
            <Button variant="secondary" onClick={() => navigate('/finance')}>Review</Button>
          </article>
        </div>
      </div>
      <div className="panel owner-updates">
        <PanelHead title="Important updates" subtitle="What changed across your sites"/>
        <div className="owner-update-list">
          <article className="positive"><i><Icon name="check" size={15}/></i><div><h3>Church foundation work is complete</h3><p>The site can now move to the next stage.</p><span>Today · Church</span></div></article>
          <article className="warning"><i><Icon name="alert" size={15}/></i><div><h3>SNEP HQ received 40 fewer cement bags</h3><p>The storekeeper has raised the issue with the supplier.</p><span>Today · SNEP HQ</span></div></article>
          <article><i><Icon name="calendar" size={15}/></i><div><h3>Gilgal 1 remains on schedule</h3><p>No delay is expected at the current pace.</p><span>Yesterday · Gilgal 1</span></div></article>
        </div>
      </div>
    </section>
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="CEO"/>
  </>
}

function ManagerDashboard() {
  const navigate = useNavigate()
  const milestones = [
    { project: 'Gilgal 1', code: 'G1', progress: 68, money: 65, next: 'Roof ring beam', date: '31 Jul', tone: '#1c5d52', status: 'On schedule' },
    { project: 'Gilgal 2', code: 'G2', progress: 74, money: 79, next: 'First-floor slab', date: '28 Jul', tone: '#bc6a35', status: 'Watch budget' },
    { project: 'SNEP HQ', code: 'HQ', progress: 39, money: 29, next: 'Ground floor walls', date: '04 Aug', tone: '#3d5b86', status: 'On schedule' },
    { project: 'Church', code: 'CH', progress: 31, money: 32, next: 'Column casting', date: '02 Aug', tone: '#765b8e', status: 'On schedule' },
  ]
  return <>
    <section className="role-welcome manager-welcome">
      <div><span>MANAGER WORKSPACE</span><h2>Good morning, Steve.</h2><p>Two approvals and one delivery issue need you today.</p></div>
      <Button icon="plus" onClick={() => navigate('/procurement')}>New requisition</Button>
    </section>
    <section className="role-guardrail"><Icon name="shield" size={17}/><p><b>Your responsibility:</b> keep projects moving, approve valid site needs, and monitor budget and materials. Payment execution remains with the Cashier.</p></section>
    <section className="metrics-grid role-metrics">
      <Metric label="Projects moving well" value="3 of 4" note="Gilgal 2 needs a budget check" icon="building" tone="green"/>
      <Metric label="Waiting on you" value="2 approvals" note="KES 255,000 combined value" icon="clock" tone="orange"/>
      <Metric label="People on site" value="126 today" note="All four attendance logs received" icon="users" tone="navy"/>
      <Metric label="Material issue" value="1 open" note="Short cement delivery at SNEP HQ" icon="alert" tone="red"/>
    </section>
    <section className="manager-grid">
      <div className="panel manager-projects">
        <PanelHead title="Project execution" subtitle="Physical progress, spending pace and the next site milestone" action="Open projects" onClick={() => navigate('/projects')}/>
        <div className="manager-project-list">
          {milestones.map(project => <article key={project.project}>
            <div className="manager-project-name"><b style={{background:project.tone}}>{project.code}</b><div><strong>{project.project}</strong><Status>{project.status}</Status></div></div>
            <div className="manager-progress-pair">
              <div><span>Built</span><div><i style={{width:`${project.progress}%`}}/></div><b>{project.progress}%</b></div>
              <div><span>Paid</span><div><i style={{width:`${project.money}%`}}/></div><b>{project.money}%</b></div>
            </div>
            <div className="next-milestone"><span>NEXT MILESTONE</span><b>{project.next}</b><small>Due {project.date}</small></div>
            <button onClick={() => navigate('/projects')}><Icon name="chevron" size={16}/></button>
          </article>)}
        </div>
      </div>
      <aside className="panel manager-priorities">
        <PanelHead title="Your priorities" subtitle="Ordered by what may delay work"/>
        <div className="manager-priority-list">
          <article className="high"><i>1</i><div><span>APPROVAL · SNEP HQ</span><h3>Approve 180 cement bags</h3><p>Needed by Monday for ground-floor walls.</p><button onClick={() => navigate('/procurement')}>Review KES 171,000 <Icon name="arrow" size={13}/></button></div></article>
          <article><i>2</i><div><span>DELIVERY · SNEP HQ</span><h3>Decide on a short delivery</h3><p>40 cement bags were not delivered. The storekeeper has recorded evidence.</p><button onClick={() => navigate('/inventory')}>Review the issue <Icon name="arrow" size={13}/></button></div></article>
          <article><i>3</i><div><span>BUDGET · GILGAL 2</span><h3>Check the remaining structural budget</h3><p>Approved orders are growing faster than site progress.</p><button onClick={() => navigate('/finance')}>See budget position <Icon name="arrow" size={13}/></button></div></article>
        </div>
      </aside>
      <div className="panel manager-materials">
        <PanelHead title="Material movement today" subtitle="What entered, left or moved between sites" action="Open inventory" onClick={() => navigate('/inventory')}/>
        <div className="movement-summary">
          <div><i className="received"><Icon name="truck" size={17}/></i><span><b>3 deliveries received</b><small>282 units recorded into stores</small></span></div>
          <div><i className="issued"><Icon name="arrow" size={17}/></i><span><b>5 site issues completed</b><small>All acknowledged by foremen</small></span></div>
          <div><i className="moving"><Icon name="swap" size={17}/></i><span><b>3 transfers in motion</b><small>1 receipt is overdue</small></span></div>
        </div>
      </div>
      <div className="panel manager-team">
        <PanelHead title="Site reporting" subtitle="Today’s required field records"/>
        <div className="reporting-list">
          {[['Attendance','4 of 4 sites','Complete'],['Daily progress','3 of 4 sites','Church pending'],['Material usage','4 of 4 sites','Complete'],['Safety briefing','4 of 4 sites','Complete']].map(row => <div key={row[0]}><span>{row[0]}<small>{row[2]}</small></span><b>{row[1]}</b><Status>{row[2] === 'Complete' ? 'Complete' : 'Pending'}</Status></div>)}
        </div>
      </div>
    </section>
  </>
}

function EngineerDashboard() {
  const navigate = useNavigate()
  const sites = [
    ['Gilgal 1','68%','67%','Roof ring beam','On track'],
    ['Gilgal 2','74%','71%','First-floor slab','Verification due'],
    ['SNEP HQ','39%','39%','Ground-floor masonry','On track'],
    ['Church','31%','28%','Column casting','Inspection due'],
  ]
  return <>
    <section className="role-welcome engineer-welcome"><div><span>ENGINEER WORKSPACE</span><h2>Good morning, Daniel.</h2><p>Two site inspections and one progress verification need technical action.</p></div><Button icon="plus" onClick={()=>navigate('/quality')}>Record inspection</Button></section>
    <section className="engineer-guardrail"><Icon name="shield" size={17}/><p><b>Your technical authority:</b> verify construction progress, quality and approved drawings. You can raise corrective work, but cannot approve purchases, move stock or handle payments.</p></section>
    <section className="metrics-grid role-metrics">
      <Metric label="Inspections due" value="2 today" note="Slab steel and column formwork" icon="shield" tone="orange"/>
      <Metric label="Open defects" value="4 items" note="1 high-priority correction" icon="alert" tone="red"/>
      <Metric label="Progress to verify" value="2 reports" note="Gilgal 2 and Church" icon="trend" tone="navy"/>
      <Metric label="Drawing control" value="2 updates" note="Revisions awaiting technical issue" icon="file" tone="green"/>
    </section>
    <section className="engineer-grid">
      <div className="panel engineer-progress-card"><PanelHead title="Reported versus verified progress" subtitle="Site claims only become official after technical verification" action="Full progress view" onClick={()=>navigate('/projects')}/>
        <div className="engineer-site-list"><div className="engineer-site-row engineer-site-head"><span>PROJECT</span><span>REPORTED</span><span>VERIFIED</span><span>CURRENT STAGE</span><span>STATUS</span></div>{sites.map(site=><div className="engineer-site-row" key={site[0]}><strong>{site[0]}</strong><b>{site[1]}</b><b>{site[2]}</b><span>{site[3]}</span><Status>{site[4]}</Status></div>)}</div>
      </div>
      <aside className="panel technical-actions"><PanelHead title="Technical actions" subtitle="Ordered by programme impact"/>
        <div className="technical-action-list">
          <article className="urgent"><i><Icon name="alert" size={15}/></i><div><span>GILGAL 2 · BEFORE CONCRETE</span><h3>Inspect first-floor slab reinforcement</h3><p>Pour is planned for Monday at 07:00.</p><button onClick={()=>navigate('/quality')}>Open inspection <Icon name="arrow" size={13}/></button></div></article>
          <article><i><Icon name="eye" size={15}/></i><div><span>CHURCH · PROGRESS</span><h3>Verify column-work progress</h3><p>Foreman reported 31%; last verified value is 28%.</p><button onClick={()=>navigate('/projects')}>Verify report <Icon name="arrow" size={13}/></button></div></article>
          <article><i><Icon name="file" size={15}/></i><div><span>SNEP HQ · DRAWING</span><h3>Issue revised electrical layout</h3><p>Revision C is reviewed and ready for construction.</p><button onClick={()=>navigate('/drawings')}>Review revision <Icon name="arrow" size={13}/></button></div></article>
        </div>
      </aside>
      <div className="panel inspection-snapshot"><PanelHead title="Recent quality inspections" subtitle="Last five technical decisions" action="All inspections" onClick={()=>navigate('/quality')}/>
        <div className="inspection-snapshot-list">{[['INS-0184','Gilgal 1','Roof ring-beam formwork','Passed','Today, 08:20'],['INS-0183','SNEP HQ','Blockwork line and level','Passed with note','Yesterday, 15:10'],['INS-0182','Church','Column starter bars','Correction required','Yesterday, 11:35']].map(row=><div key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[2]}</strong><small>{row[1]} · {row[4]}</small></span><Status>{row[3]}</Status></div>)}</div>
      </div>
      <div className="panel drawing-snapshot"><PanelHead title="Information used on site" subtitle="Current approved revisions" action="Drawing register" onClick={()=>navigate('/drawings')}/>
        <div className="drawing-count"><div><Icon name="file" size={21}/><span><strong>46</strong><small>Current drawings</small></span></div><div><Icon name="alert" size={21}/><span><strong>2</strong><small>Superseded on site</small></span></div></div>
      </div>
    </section>
  </>
}

function ForemanDashboard() {
  const navigate=useNavigate()
  return <>
    <section className="role-welcome foreman-welcome"><div><span>FOREMAN · GILGAL 2</span><h2>Good morning, Samuel.</h2><p>Here is today’s work, crew and material position for your site.</p></div><Button icon="plus" onClick={()=>navigate('/procurement')}>Request materials</Button></section>
    <section className="foreman-site-band"><div><Icon name="pin" size={17}/><span><b>Gilgal 2 · Sweet-Waters, Machakos</b><small>You can only record activity for your assigned site.</small></span></div><div><span>Today’s shift</span><b>07:00–17:00</b></div><Status>Site active</Status></section>
    <section className="foreman-quick-actions">
      <button onClick={()=>navigate('/workforce')}><i><Icon name="users"/></i><span><b>Daily site log</b><small>Record crew and completed work</small></span><Icon name="chevron" size={15}/></button>
      <button onClick={()=>navigate('/inventory')}><i><Icon name="boxes"/></i><span><b>Log material use</b><small>Record what the crew consumed</small></span><Icon name="chevron" size={15}/></button>
      <button onClick={()=>navigate('/inventory')}><i><Icon name="truck"/></i><span><b>Confirm handover</b><small>1 issue voucher is waiting</small></span><Icon name="chevron" size={15}/></button>
      <button onClick={()=>navigate('/equipment')}><i><Icon name="tool"/></i><span><b>Report a problem</b><small>Tool damage, delay or safety issue</small></span><Icon name="chevron" size={15}/></button>
    </section>
    <section className="metrics-grid role-metrics">
      <Metric label="Crew on site" value="31 people" note="Attendance logged at 07:14" icon="users" tone="navy"/>
      <Metric label="Today’s work" value="3 activities" note="Slab steel, formwork and conduit" icon="building" tone="green"/>
      <Metric label="Material requests" value="2 open" note="1 approved, 1 awaiting manager" icon="cart" tone="orange"/>
      <Metric label="Handover waiting" value="1 voucher" note="Confirm only what you physically receive" icon="truck" tone="red"/>
    </section>
    <section className="foreman-grid">
      <div className="panel today-work"><PanelHead title="Today’s work plan" subtitle="Agreed with the Manager and Engineer"/>
        <div className="work-plan-list">{[['01','Fix Y12 slab reinforcement','Steel fixing team · 9 people','65%','In progress'],['02','Complete slab-edge formwork','Carpentry team · 6 people','40%','In progress'],['03','Place electrical conduits','Electrical team · 4 people','0%','Starts 13:00']].map(row=><article key={row[0]}><i>{row[0]}</i><div><b>{row[1]}</b><span>{row[2]}</span></div><div className="work-progress"><span>{row[3]}</span><div><i style={{width:row[3]}}/></div></div><Status tone={row[4]==='In progress'?'issued':'at-risk'}>{row[4]}</Status></article>)}</div>
      </div>
      <aside className="panel foreman-material-watch"><PanelHead title="Material watch" subtitle="What could stop today’s work"/>
        <div className="field-material-list"><div className="warning"><Icon name="alert" size={16}/><span><b>Y12 steel may run short</b><small>38 lengths left · about 1 day of work</small></span></div><div><Icon name="check" size={16}/><span><b>Cement is sufficient</b><small>124 bags available for planned work</small></span></div><div><Icon name="clock" size={16}/><span><b>PVC conduit requested</b><small>Manager approval is still pending</small></span></div></div>
      </aside>
      <div className="panel site-handover"><PanelHead title="Material handovers" subtitle="Store issues that require your physical confirmation" action="Open materials" onClick={()=>navigate('/inventory')}/>
        <div className="handover-row"><div className="voucher-icon"><Icon name="file" size={18}/></div><div><b>MIV-0087 · Y12 reinforcement steel</b><span>80 lengths issued by Lucy Njeri at 09:12</span></div><strong>80 lengths</strong><Status>Confirm receipt</Status></div>
      </div>
      <div className="panel field-reporting"><PanelHead title="End-of-day records" subtitle="Complete before leaving site"/>
        <div className="field-report-list"><div><Icon name="check" size={14}/><span>Morning attendance</span><Status>Complete</Status></div><div><Icon name="clock" size={14}/><span>Material usage</span><Status tone="at-risk">Due 16:30</Status></div><div><Icon name="clock" size={14}/><span>Work progress & blockers</span><Status tone="at-risk">Due 16:45</Status></div></div>
      </div>
    </section>
  </>
}

function StorekeeperDashboard() {
  const navigate=useNavigate()
  return <>
    <section className="role-welcome storekeeper-welcome"><div><span>STOREKEEPER WORKSPACE</span><h2>Good morning, Lucy.</h2><p>Three deliveries and two approved material issues need store action today.</p></div><Button icon="truck" onClick={()=>navigate('/receiving')}>Receive delivery</Button></section>
    <section className="storekeeper-guardrail"><Icon name="lock" size={17}/><p><b>You control physical custody, not commercial decisions.</b> Record what actually enters or leaves the store. You cannot choose suppliers, change prices, approve requests or handle payments.</p></section>
    <section className="metrics-grid role-metrics"><Metric label="Expected deliveries" value="3 today" note="1 delivery already late" icon="truck" tone="orange"/><Metric label="Ready to issue" value="2 vouchers" note="Both have approved requests" icon="boxes" tone="green"/><Metric label="Transfers in motion" value="3" note="1 inbound confirmation overdue" icon="swap" tone="navy"/><Metric label="Stock attention" value="7 items" note="2 critical for this week’s work" icon="alert" tone="red"/></section>
    <section className="storekeeper-grid">
      <div className="panel store-actions"><PanelHead title="Store actions in order" subtitle="Complete the physical check before recording the system event"/>
        <div className="store-action-list"><article className="urgent"><i>1</i><div><span>DELIVERY · SNEP HQ</span><h3>Count 180 cement bags from Bamburi</h3><p>PO-0188 · Driver arrived at 09:35</p></div><button onClick={()=>navigate('/receiving')}>Receive & inspect</button></article><article><i>2</i><div><span>MATERIAL ISSUE · GILGAL 2</span><h3>Prepare 80 Y12 steel lengths</h3><p>MR-0239 approved · Foreman Samuel Kariuki</p></div><button onClick={()=>navigate('/issues')}>Create voucher</button></article><article><i>3</i><div><span>INBOUND TRANSFER · CHURCH</span><h3>Confirm timber received from Gilgal 1</h3><p>TR-0063 · Dispatch recorded 3 days ago</p></div><button onClick={()=>navigate('/transfers')}>Count & confirm</button></article></div>
      </div>
      <aside className="panel store-integrity"><PanelHead title="Custody controls" subtitle="Today’s handover position"/><div className="integrity-list"><div><Icon name="check" size={15}/><span><b>All GRNs independently counted</b><small>Receiver differs from requester</small></span></div><div><Icon name="clock" size={15}/><span><b>1 foreman handover pending</b><small>MIV-0087 · issued at 09:12</small></span></div><div><Icon name="alert" size={15}/><span><b>1 unresolved count variance</b><small>Gilgal 2 steel · KES 62,400</small></span></div></div></aside>
      <div className="panel store-stock-view"><PanelHead title="Stock position by store" subtitle="Value and items needing replenishment" action="Open stock ledger" onClick={()=>navigate('/inventory')}/><div className="store-site-grid">{[['Gilgal 1','KES 3.18M','2 low items','Count current'],['Gilgal 2','KES 2.74M','3 low items','1 variance'],['SNEP HQ','KES 4.86M','1 low item','Count current'],['Church','KES 2.06M','1 low item','Count due']].map(row=><div key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><small>{row[2]}</small><Status tone={row[3].includes('variance')||row[3].includes('due')?'at-risk':'accepted'}>{row[3]}</Status></div>)}</div></div>
    </section>
  </>
}

function ProcurementOfficerDashboard() {
  const navigate=useNavigate()
  return <>
    <section className="role-welcome procurement-welcome"><div><span>PROCUREMENT OFFICER WORKSPACE</span><h2>Good morning, Paul.</h2><p>Four approved requests are ready for sourcing; two need comparative quotations.</p></div><Button icon="cart" onClick={()=>navigate('/procurement')}>Open sourcing queue</Button></section>
    <section className="procurement-guardrail"><Icon name="shield" size={17}/><p><b>You source and prepare; another role approves.</b> Requested items and quantities remain locked. You cannot approve your own PO, receive deliveries, match invoices or execute payments.</p></section>
    <section className="metrics-grid role-metrics"><Metric label="Ready to source" value="4 requests" note="KES 730,550 estimated value" icon="cart" tone="orange"/><Metric label="Quotes outstanding" value="5 suppliers" note="2 comparisons due today" icon="clock" tone="navy"/><Metric label="POs awaiting approval" value="2 drafts" note="KES 496,800 combined" icon="file" tone="green"/><Metric label="Price exceptions" value="1 flag" note="Steel is 8.4% above reference" icon="alert" tone="red"/></section>
    <section className="procurement-role-grid"><div className="panel sourcing-priorities"><PanelHead title="Approved requests ready to source" subtitle="Demand is locked to the approved requisition" action="Open all requests" onClick={()=>navigate('/procurement')}/><div className="sourcing-list">{[['MR-0245','River sand','18 tonnes','Gilgal 1','KES 63,000','Start sourcing'],['MR-0247','Bamburi cement','180 bags','SNEP HQ','KES 171,000','Compare quotes'],['MR-0248','Y12 reinforcement steel','240 lengths','Gilgal 2','KES 412,800','Price flagged'],['MR-0246','Machine-cut stones','1,200 pcs','Church','KES 84,000','Start sourcing']].map(row=><article key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[1]}</strong><small>{row[2]} · {row[3]}</small></span><b>{row[4]}</b><Status tone={row[5]==='Price flagged'?'at-risk':row[5]==='Compare quotes'?'issued':'approved'}>{row[5]}</Status><button onClick={()=>navigate('/procurement')}><Icon name="chevron" size={15}/></button></article>)}</div></div><aside className="panel quote-deadlines"><PanelHead title="Quotation deadlines" subtitle="Competitive bids above threshold"/><div>{[['Today, 14:00','MR-0248 · Steel','2 of 3 quotes'],['Today, 16:30','MR-0247 · Cement','3 of 3 quotes'],['Mon, 10:00','MR-0245 · River sand','1 of 3 quotes']].map(row=><article key={row[1]}><time>{row[0]}</time><span><b>{row[1]}</b><small>{row[2]}</small></span><Status tone={row[2].startsWith('3')?'accepted':'at-risk'}>{row[2].startsWith('3')?'Ready':'Waiting'}</Status></article>)}</div></aside><div className="panel delivery-followup"><PanelHead title="Delivery follow-up" subtitle="Issued orders that need supplier action" action="Purchase orders" onClick={()=>navigate('/purchase-orders')}/><div className="delivery-follow-list">{[['PO-0188','Bamburi Cement PLC','SNEP HQ','Partial: 140 / 180 bags','Resolve shortfall'],['PO-0187','Kaydee Hardware','Church','Due today at 15:00','On schedule'],['PO-0186','Mavoko Aggregates','Gilgal 1','Supplier acknowledged','Due Monday']].map(row=><div key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[1]}</strong><small>{row[2]} · {row[3]}</small></span><Status tone={row[4]==='Resolve shortfall'?'at-risk':'accepted'}>{row[4]}</Status></div>)}</div></div></section>
  </>
}

function AuditorDashboard() {
  const navigate=useNavigate()
  return <>
    <section className="role-welcome auditor-welcome"><div><span>AUDITOR · READ-ONLY</span><h2>Good morning, Mary.</h2><p>The audit chain is intact. Five exceptions need independent review.</p></div><Button icon="download" onClick={()=>navigate('/audit-reports')}>Export audit pack</Button></section>
    <section className="auditor-guardrail"><Icon name="eye" size={17}/><p><b>Independent read-only oversight.</b> You can search, trace, inspect evidence and export. You cannot change a source record, resolve an exception by editing it, or perform any operational transaction.</p></section>
    <section className="metrics-grid role-metrics"><Metric label="Open exceptions" value="5 findings" note="2 high · 2 medium · 1 low" icon="alert" tone="red"/><Metric label="Value exposed" value="KES 1.08M" note="Transactions under review" icon="wallet" tone="orange"/><Metric label="Control compliance" value="94%" note="Across the last 30 days" icon="shield" tone="green"/><Metric label="Audit chain" value="128,492" note="Consecutive verified events" icon="lock" tone="navy"/></section>
    <section className="auditor-grid"><div className="panel audit-risk-list"><PanelHead title="Highest-risk exceptions" subtitle="Prioritised by financial exposure and control failure" action="Review evidence" onClick={()=>navigate('/audit-samples')}/><div>{[['High','AUD-0094','Steel price 12.6% above reference','Gilgal 2 · KES 412,800'],['High','AUD-0091','Duplicate invoice reference detected','SNEP HQ · KES 384,000'],['Medium','AUD-0088','Transfer receipt overdue by 3 days','Gilgal 1 → Church · KES 156,000'],['Medium','AUD-0084','Repeated round-number petty cash','Gilgal 2 · KES 50,000']].map(row=><article key={row[1]}><span className={`severity ${row[0].toLowerCase()}`}>{row[0]}</span><b className="mono">{row[1]}</b><div><strong>{row[2]}</strong><small>{row[3]}</small></div><button onClick={()=>navigate('/audit-samples')}>Trace <Icon name="arrow" size={13}/></button></article>)}</div></div><aside className="panel audit-integrity-card"><PanelHead title="Evidence integrity" subtitle="Cryptographic chain status"/><div className="integrity-seal"><i><Icon name="shield" size={27}/></i><strong>Verified</strong><span>No breaks across 128,492 events</span></div><div className="integrity-facts"><span>Last verification <b>Today, 10:45</b></span><span>Records superseded <b>18</b></span><span>Records deleted <b>0</b></span><span>Attachments hashed <b>100%</b></span></div></aside><div className="panel audit-project-map"><PanelHead title="Exceptions by project" subtitle="Open findings and financially exposed value"/><div className="audit-project-list">{[['Gilgal 1','1 finding','KES 156,000','Low'],['Gilgal 2','3 findings','KES 512,800','High'],['SNEP HQ','1 finding','KES 384,000','High'],['Church','0 findings','KES 0','Clear']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><b>{row[2]}</b><Status tone={row[3]==='High'?'at-risk':row[3]==='Low'?'issued':'accepted'}>{row[3]}</Status></div>)}</div></div></section>
  </>
}

function CashierDashboard() {
  const navigate = useNavigate()
  const [paid, setPaid] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<PaymentCandidate | null>(null)
  const executePayment = (payment: PaymentCandidate) => {
    setPaid(current => [...current, payment.reference])
    setSelectedPayment(null)
    setToast(`${payment.reference} marked as paid to ${payment.supplier}`)
    setTimeout(() => setToast(''), 3000)
  }
  const readyPayments: PaymentCandidate[] = [
    { reference: 'PAY-0421', supplier: 'Coastline Electrical Ltd', invoice: 'INV-2981', project: 'Church', amount: '412,800', method: 'Bank transfer' },
    { reference: 'PAY-0420', supplier: 'Mavoko Aggregates', invoice: 'INV-1072', project: 'Gilgal 1', amount: '63,000', method: 'M-Pesa' },
    { reference: 'PAY-0419', supplier: 'Musa Electrical Works', invoice: 'INV-2044', project: 'SNEP HQ', amount: '179,000', method: 'Bank transfer' },
  ]
  return <>
    <section className="role-welcome cashier-welcome">
      <div><span>CASHIER WORKSPACE</span><h2>Good morning, Eunice.</h2><p>Three approved payments are ready for you to execute.</p></div>
      <Button icon="receipt" onClick={() => navigate('/finance')}>Open payments desk</Button>
    </section>
    <section className="cashier-guardrail"><Icon name="lock" size={18}/><div><b>You execute; you do not approve.</b><span>Every payment below already has an approved invoice, purchase order, and delivery record. Amounts cannot be edited here.</span></div></section>
    <section className="metrics-grid role-metrics">
      <Metric label="Ready to pay" value="KES 654,800" note="3 fully approved payments" icon="wallet" tone="orange"/>
      <Metric label="Paid today" value="KES 684,000" note="1 payment successfully recorded" icon="check" tone="green"/>
      <Metric label="Site cash available" value="KES 684,250" note="Across 4 reconciled floats" icon="receipt" tone="navy"/>
      <Metric label="Blocked payments" value="2 invoices" note="Missing approval or delivery proof" icon="lock" tone="red"/>
    </section>
    <section className="cashier-grid">
      <div className="panel cashier-payment-panel">
        <PanelHead title="Approved payments ready to execute" subtitle="All control checks have passed" action="See full payments desk" onClick={() => navigate('/finance')}/>
        <div className="cashier-payment-list">
          {readyPayments.map(payment => {
            const isPaid = paid.includes(payment.reference)
            return <article key={payment.reference} className={isPaid ? 'completed' : ''}>
              <div className="payment-party"><span>{payment.supplier[0]}</span><div><b>{payment.supplier}</b><small>{payment.invoice} · {payment.project}</small></div></div>
              <div className="payment-method"><span>PAY USING</span><b>{payment.method}</b></div>
              <div className="payment-amount"><span>AMOUNT</span><strong>KES {payment.amount}</strong></div>
              {isPaid ? <Status>Paid</Status> : <button onClick={() => setSelectedPayment(payment)}>Execute payment <Icon name="arrow" size={14}/></button>}
            </article>
          })}
        </div>
      </div>
      <aside className="panel cashier-checks">
        <PanelHead title="Before money moves" subtitle="Built-in payment controls"/>
        <div className="cashier-check-list">
          <div><Icon name="check" size={15}/><span><b>Purchase was approved</b><small>A different user approved it</small></span></div>
          <div><Icon name="check" size={15}/><span><b>Delivery was confirmed</b><small>Storekeeper recorded the goods</small></span></div>
          <div><Icon name="check" size={15}/><span><b>Invoice matches</b><small>Quantity and price agree</small></span></div>
          <div><Icon name="shield" size={15}/><span><b>Your action is logged</b><small>Reference and payment proof are required</small></span></div>
        </div>
      </aside>
      <div className="panel cashier-floats">
        <PanelHead title="Site cash floats" subtitle="Available cash after the latest reconciliation" action="Manage cash" onClick={() => navigate('/finance')}/>
        <div className="float-grid">
          {[['Gilgal 1','182,400','Reconciled today'],['Gilgal 2','94,850','Reconciled today'],['SNEP HQ','287,000','Reconciled yesterday'],['Church','120,000','Reconciled today']].map(row => <div key={row[0]}><span>{row[0]}</span><strong>KES {row[1]}</strong><small><i/>{row[2]}</small></div>)}
        </div>
      </div>
    </section>
    {selectedPayment && <PaymentExecutionModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} onComplete={() => executePayment(selectedPayment)}/>}
    {toast && <div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function PaymentExecutionModal({payment,onClose,onComplete}:{payment:PaymentCandidate;onClose:()=>void;onComplete:()=>void}) {
  const submit=(event:FormEvent)=>{event.preventDefault();onComplete()}
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal payment-modal" onSubmit={submit}>
    <div className="modal-head"><div><span className="eyebrow">CASHIER EXECUTION</span><h2>Record payment</h2><p>The approved payment details below are locked.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div>
    <div className="locked-payment">
      <div className="locked-amount"><span>APPROVED AMOUNT</span><strong>KES {payment.amount}</strong><small><Icon name="lock" size={12}/>Cannot be changed by Cashier</small></div>
      <div><span>Beneficiary</span><b>{payment.supplier}</b></div><div><span>Project</span><b>{payment.project}</b></div>
      <div><span>Invoice</span><b>{payment.invoice}</b></div><div><span>Payment method</span><b>{payment.method}</b></div>
    </div>
    <div className="payment-proof-form">
      <label>Bank / M-Pesa transaction reference<input required placeholder={payment.method === 'M-Pesa' ? 'e.g. QGH8D22Q1' : 'Enter bank confirmation reference'}/></label>
      <label>Payment date and time<input required type="datetime-local" defaultValue="2026-07-25T10:45"/></label>
      <label>Payment note <textarea rows={2} placeholder="Optional note for Finance or the Auditor"/></label>
      <label className="cashier-confirm"><input required type="checkbox"/><span>I confirm that I sent exactly <b>KES {payment.amount}</b> to <b>{payment.supplier}</b> using {payment.method}.</span></label>
    </div>
    <div className="payment-audit-note"><Icon name="shield" size={16}/><span>This creates an immutable payment event linked to {payment.reference}, {payment.invoice}, and your Cashier account.</span></div>
    <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" icon="lock">Confirm payment</Button></div>
  </form></div>
}

function PanelHead({ title, subtitle, action, onClick }: {title:string; subtitle:string; action?:string; onClick?:()=>void}) {
  return <div className="panel-head"><div><h3>{title}</h3><p>{subtitle}</p></div>{action && <button onClick={onClick}>{action}<Icon name="arrow" size={14}/></button>}</div>
}

function PageIntro({ title, copy, action, icon, onAction }: {title:string;copy:string;action:string;icon:IconName;onAction?:()=>void}) {
  return <section className="page-intro"><div><h2>{title}</h2><p>{copy}</p></div><Button icon={icon} onClick={onAction}>{action}</Button></section>
}

function Projects({readOnly=false}:{readOnly?:boolean}) {
  const [modal, setModal] = useState(false)
  return <>
    <PageIntro title="Project portfolio" copy="A single view of delivery, budgets and site responsibility." action={readOnly?'Download portfolio':'Add project'} icon={readOnly?'download':'plus'} onAction={readOnly?undefined:() => setModal(true)}/>
    {readOnly&&<section className="role-guardrail owner-readonly-note"><Icon name="eye" size={17}/><p><b>Owner oversight:</b> project teams maintain operational records. You can inspect progress and financial exposure without changing their source data.</p></section>}
    <section className="portfolio-strip">
      <div><span>Portfolio budget</span><strong>KES 182.5M</strong></div>
      <div><span>Actual spend</span><strong>KES 89.2M</strong><small>48.9% of budget</small></div>
      <div><span>Open commitments</span><strong>KES 20.8M</strong><small>11.4% of budget</small></div>
      <div><span>Active sites</span><strong>4</strong><small>0 currently paused</small></div>
    </section>
    <section className="project-cards">
      {projects.map((p, i) => <article className="project-card" key={p.name}>
        <div className="project-card-top"><div className="project-badge" style={{background:p.color}}>{p.code}</div><Status>{p.status}</Status>{!readOnly&&<button aria-label="More options"><Icon name="more"/></button>}</div>
        <h3>{p.name}</h3><p><Icon name="pin" size={15}/>{p.location}</p>
        <div className="site-progress"><div><span>Site completion</span><b>{p.progress}%</b></div><div className="progress large"><i style={{width:`${p.progress}%`, background:p.color}}/></div></div>
        <div className="card-stats"><div><span>Approved budget</span><strong>KES {p.budget.toFixed(1)}M</strong></div><div><span>Remaining</span><strong>KES {(p.budget-p.spent-p.committed).toFixed(1)}M</strong></div></div>
        <div className="card-budget"><span>Spent <b>KES {p.spent.toFixed(1)}M</b></span><span>Committed <b>KES {p.committed.toFixed(1)}M</b></span></div>
        <footer><div className="manager-avatar">{['PM','MW','JO','DM'][i]}</div><div><span>Site manager</span><b>{p.manager}</b></div><button>Open project <Icon name="arrow" size={14}/></button></footer>
      </article>)}
    </section>
    {!readOnly && modal && <ProjectModal onClose={() => setModal(false)}/>}
  </>
}

function ProjectModal({onClose}:{onClose:()=>void}) {
  const [saved,setSaved]=useState(false)
  const submit=(e:FormEvent)=>{e.preventDefault();setSaved(true);setTimeout(onClose,900)}
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal" onSubmit={submit}>
    <div className="modal-head"><div><span className="eyebrow">PROJECT SETUP</span><h2>Add a construction site</h2><p>New sites inherit the standard approval controls.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div>
    {saved ? <div className="success-state"><div><Icon name="check" size={28}/></div><h3>Project created</h3><p>The site is ready for budget allocation and team access.</p></div> : <>
      <div className="form-grid"><label className="full">Project name<input required placeholder="e.g. Gilgal 3"/></label><label className="full">Location<input required placeholder="Site address or area"/></label><label>Approved budget (KES)<input required type="number" placeholder="0.00"/></label><label>Start date<input required type="date"/></label><label>Planned end date<input type="date"/></label><label>Status<select><option>Active</option><option>On Hold</option></select></label><label className="full">Site manager<select><option>Select a manager…</option><option>Peter Mwangi</option><option>Mercy Wanjiku</option></select></label></div>
      <div className="control-callout"><Icon name="shield"/><div><b>Standard control policy will apply</b><span>Four-person purchase-to-pay segregation and immutable activity logging.</span></div></div>
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create project</Button></div>
    </>}
  </form></div>
}

function Procurement({readOnly=false}:{readOnly?:boolean}) {
  const [tab,setTab]=useState('Requisitions')
  const [modal,setModal]=useState(false)
  const [toast,setToast]=useState('')
  const approve=(id:string)=>{setToast(`${id} approved and released to procurement`);setTimeout(()=>setToast(''),3000)}
  return <>
    <PageIntro title={readOnly?'Procurement oversight':'Procurement control'} copy={readOnly?'Follow requests, orders and deliveries without entering the operational approval queue.':'Every purchase starts with an approved, traceable request.'} action={readOnly?'Export overview':'New requisition'} icon={readOnly?'download':'plus'} onAction={readOnly?undefined:()=>setModal(true)}/>
    {readOnly&&<section className="role-guardrail owner-readonly-note"><Icon name="eye" size={17}/><p><b>Observer mode:</b> routine requests are handled by the Manager and Procurement team. Only a high-value or unresolved exception returns to your CEO workspace.</p></section>}
    <div className="tabs">{['Requisitions','Purchase orders','Goods received','Suppliers'].map((t,i)=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}{i<3&&<span>{[12,7,4][i]}</span>}</button>)}</div>
    <section className="panel table-panel">
      <div className="table-tools"><div className="inline-search"><Icon name="search"/><input placeholder={`Search ${tab.toLowerCase()}…`}/></div><button><Icon name="filter"/>Filters <b>2</b></button><button><Icon name="download"/>Export</button></div>
      {tab==='Requisitions' ? <div className="data-table procurement-table">
        <div className="data-row data-head"><span>REFERENCE</span><span>DESCRIPTION</span><span>SITE</span><span>REQUESTED BY</span><span>EST. VALUE</span><span>STATUS</span><span></span></div>
        {requisitions.map(r=><div className="data-row" key={r.id}>
          <div><b className="mono">{r.id}</b><small>{r.date}</small></div>
          <div><strong>{r.item}</strong><small>{r.qty}{r.risk&&<em><Icon name="alert" size={11}/>{r.risk}</em>}</small></div>
          <span>{r.site}</span><span>{r.requester}</span><strong>{r.value}</strong><Status>{r.status}</Status>
          <div className="row-actions">{r.status==='Needs approval'&&!readOnly?<><button className="approve" onClick={()=>approve(r.id)}><Icon name="check" size={15}/>Approve</button><button><Icon name="more"/></button></>:<button><Icon name="eye" size={16}/>View</button>}</div>
        </div>)}
      </div> : <ModuleTable tab={tab}/>}
      <footer className="table-footer"><span>Showing 1–5 of {tab==='Suppliers'?28:12} records</span><div><button disabled>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div></footer>
    </section>
    {!readOnly&&modal&&<RequisitionModal onClose={()=>setModal(false)} onSaved={()=>{setModal(false);setToast('MR-0249 submitted for approval')}}/>}
    {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function ModuleTable({tab}:{tab:string}) {
  const rows:Record<string,string[][]>={
    'Purchase orders':[['PO-0189','Apex Steel Ltd','Gilgal 2','KES 412,800','Awaiting approval'],['PO-0188','Bamburi Cement PLC','SNEP HQ','KES 171,000','Issued'],['PO-0187','Kaydee Hardware','Church','KES 84,000','Part delivered'],['PO-0186','Mavoko Aggregates','Gilgal 1','KES 63,000','Closed']],
    'Goods received':[['GRN-0112','PO-0188 · Cement','SNEP HQ','140 / 180 bags','Discrepancy'],['GRN-0111','PO-0186 · River sand','Gilgal 1','18 / 18 tonnes','Accepted'],['GRN-0110','PO-0185 · Ballast','Church','12 / 12 tonnes','Accepted'],['GRN-0109','PO-0184 · Steel','Gilgal 2','180 / 180 lengths','Accepted']],
    'Suppliers':[['SUP-0031','Apex Steel Ltd','Steel & reinforcement','3 open orders','Approved'],['SUP-0014','Bamburi Cement PLC','Cement','2 open orders','Approved'],['SUP-0022','Kaydee Hardware','General hardware','1 open order','Review due'],['SUP-0008','Mavoko Aggregates','Aggregates','0 open orders','Approved']],
  }
  return <div className="simple-module-table">
    <div className="simple-head">{['REFERENCE','PARTY / ITEM','CATEGORY / SITE','ACTIVITY','STATUS',''].map(x=><span key={x}>{x}</span>)}</div>
    {rows[tab].map(row=><div className="simple-row" key={row[0]}>{row.map((c,j)=>j===4?<Status key={c}>{c}</Status>:<span className={j===0?'mono':''} key={c}>{c}</span>)}<button><Icon name="eye" size={16}/>View</button></div>)}
  </div>
}

function RequisitionModal({onClose,onSaved,lockedProject}:{onClose:()=>void;onSaved:()=>void;lockedProject?:string}) {
  const [step,setStep]=useState(1)
  const submit=(e:FormEvent)=>{e.preventDefault(); if(step===1)setStep(2);else onSaved()}
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal requisition-modal" onSubmit={submit}>
    <div className="modal-head"><div><span className="eyebrow">MATERIAL REQUEST</span><h2>New requisition</h2><p>Request materials for an approved project activity.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div>
    <div className="stepper"><div className="active"><i>{step>1?<Icon name="check" size={13}/>:1}</i><span>Request details</span></div><em/><div className={step===2?'active':''}><i>2</i><span>Review & submit</span></div></div>
    {step===1?<div className="form-grid">
      <label>Project / site<select required disabled={Boolean(lockedProject)} defaultValue={lockedProject ?? ''}>{!lockedProject&&<option value="" disabled>Select project…</option>}{projects.filter(project=>!lockedProject||project.name===lockedProject).map(project=><option key={project.name}>{project.name}</option>)}</select></label>
      <label>Cost code<select required defaultValue=""><option value="" disabled>Select cost code…</option><option>03.20 — Structural steel</option><option>04.10 — Masonry</option><option>09.40 — Finishes</option></select></label>
      <label className="full">Material<select required defaultValue=""><option value="" disabled>Search material catalogue…</option><option>Y12 reinforcement steel · lengths</option><option>Bamburi Powermax cement · bags</option><option>River sand · tonnes</option></select></label>
      <label>Quantity<input type="number" min="1" required placeholder="0"/></label><label>Needed by<input type="date" required/></label>
      <label className="full">Purpose / work activity<textarea required placeholder="Explain where and how these materials will be used…" rows={3}/></label>
    </div>:<div className="review-state">
      <div className="review-symbol"><Icon name="file" size={28}/></div><h3>Ready for supervisor review</h3><p>This requisition will be locked after submission. Your site supervisor must approve it before procurement can create a purchase order.</p>
      <div className="workflow-line"><span><b>1</b>You</span><i/><span><b>2</b>Supervisor</span><i/><span><b>3</b>Procurement</span><i/><span><b>4</b>Store</span></div>
    </div>}
    <div className="modal-actions"><Button variant="secondary" onClick={step===2?()=>setStep(1):onClose}>{step===2?'Back':'Cancel'}</Button><Button type="submit">{step===1?'Review request':'Submit requisition'}</Button></div>
  </form></div>
}

function ForemanRequests() {
  const [modal,setModal]=useState(false)
  const [toast,setToast]=useState('')
  const ownRequests=[['MR-0248','Y12 reinforcement steel','240 lengths','Today, 09:42','Needs approval'],['MR-0239','PVC conduit 25mm','150 lengths','23 Jul, 14:05','Approved'],['MR-0234','Binding wire 16G','12 rolls','22 Jul, 10:18','PO created'],['MR-0228','Marine plywood 18mm','24 sheets','20 Jul, 08:40','Fulfilled']]
  return <>
    <PageIntro title="My material requests" copy="Ask for materials before they are purchased or issued to your site." action="New material request" icon="plus" onAction={()=>setModal(true)}/>
    <section className="field-boundary"><Icon name="lock" size={16}/><span><b>You request; the Manager approves.</b> You cannot approve your own request, choose a supplier, change a price or create a purchase order.</span></section>
    <section className="field-request-summary"><div><span>Waiting for approval</span><strong>1</strong></div><div><span>Approved / being sourced</span><strong>2</strong></div><div><span>Ready at store</span><strong>1</strong></div><div><span>Fulfilled this month</span><strong>8</strong></div></section>
    <section className="panel foreman-request-panel"><PanelHead title="Requests raised by you" subtitle="Gilgal 2 only"/>
      <div className="foreman-request-table"><div className="foreman-request-row request-head"><span>REFERENCE</span><span>MATERIAL</span><span>QUANTITY</span><span>RAISED</span><span>STATUS</span><span></span></div>{ownRequests.map(row=><div className="foreman-request-row" key={row[0]}><b className="mono">{row[0]}</b><strong>{row[1]}</strong><span>{row[2]}</span><span>{row[3]}</span><Status>{row[4]}</Status><button><Icon name="eye" size={15}/>View</button></div>)}</div>
    </section>
    <section className="request-explainer"><div><i>1</i><span><b>You request</b><small>Purpose and quantity</small></span></div><em/><div><i>2</i><span><b>Manager approves</b><small>Need and budget</small></span></div><em/><div><i>3</i><span><b>Procurement buys</b><small>Supplier and price</small></span></div><em/><div><i>4</i><span><b>Store issues</b><small>You confirm handover</small></span></div></section>
    {modal&&<RequisitionModal lockedProject="Gilgal 2" onClose={()=>setModal(false)} onSaved={()=>{setModal(false);setToast('Material request submitted to the Manager for approval.')}}/>}
    {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function ForemanMaterials() {
  const [confirmed,setConfirmed]=useState(false)
  const [recordMode,setRecordMode]=useState<'usage'|'wastage'|null>(null)
  const [toast,setToast]=useState('')
  const completeRecord=(message:string)=>{setRecordMode(null);setToast(message);setTimeout(()=>setToast(''),3000)}
  return <>
    <PageIntro title="Materials under my supervision" copy="A field view of what you received, used and must account for." action="Log material use" icon="plus" onAction={()=>setRecordMode('usage')}/>
    <section className="field-boundary"><Icon name="shield" size={16}/><span><b>Physical accountability starts at handover.</b> You confirm what reaches you; the Storekeeper controls the store ledger. Neither role can silently alter the other’s record.</span></section>
    {!confirmed&&<section className="handover-alert"><div><Icon name="truck" size={23}/></div><span><small>HANDOVER WAITING FOR YOU</small><h3>80 lengths of Y12 reinforcement steel</h3><p>MIV-0087 · Issued by Lucy Njeri today at 09:12</p></span><div><b>Count physically before confirming</b><small>Your confirmation transfers custody to you.</small></div><button onClick={()=>{setConfirmed(true);setToast('MIV-0087 confirmed: custody of 80 steel lengths recorded.')}}>Confirm 80 received</button></section>}
    {confirmed&&<section className="handover-complete"><Icon name="check" size={18}/><span><b>MIV-0087 handover confirmed</b><small>80 Y12 steel lengths are now recorded under your custody.</small></span></section>}
    <section className="field-material-grid">
      <div className="panel"><PanelHead title="Materials at the work front" subtitle="Issued to you and not yet recorded as used"/>
        <div className="custody-list">{[['Y12 reinforcement steel','38 lengths','About 1 day','Low'],['Bamburi cement','124 bags','About 3 days','Sufficient'],['Binding wire 16G','8 rolls','About 4 days','Sufficient'],['Marine plywood 18mm','18 sheets','About 2 days','Watch']].map(row=><div key={row[0]}><div><b>{row[0]}</b><small>Estimated cover: {row[2]}</small></div><strong>{row[1]}</strong><Status tone={row[3]==='Low'?'low-stock':row[3]==='Watch'?'at-risk':'healthy'}>{row[3]}</Status></div>)}</div>
      </div>
      <aside className="panel material-actions"><PanelHead title="Record a movement" subtitle="Every unit needs a reason"/><button onClick={()=>setRecordMode('usage')}><i><Icon name="boxes"/></i><span><b>Material used</b><small>Consumed in an identified activity</small></span><Icon name="chevron" size={15}/></button><button onClick={()=>setRecordMode('wastage')}><i className="warn"><Icon name="alert"/></i><span><b>Waste or damage</b><small>Reason and evidence are required</small></span><Icon name="chevron" size={15}/></button></aside>
      <div className="panel span-full"><PanelHead title="Recent records by you" subtitle="Today at Gilgal 2"/>
        <div className="field-ledger">{[['10:20','Material used','Y12 reinforcement steel','42 lengths','Slab reinforcement · Grid A–D'],['09:25','Handover confirmed','Binding wire 16G','4 rolls','MIV-0084'],['Yesterday','Wastage','Marine plywood 18mm','2 sheets','Split during stripping · photo attached']].map(row=><div key={row.join('-')}><span>{row[0]}</span><Status tone={row[1]==='Wastage'?'at-risk':row[1]==='Material used'?'issued':'accepted'}>{row[1]}</Status><strong>{row[2]}</strong><b>{row[3]}</b><small>{row[4]}</small></div>)}</div>
      </div>
    </section>
    {recordMode&&<MaterialRecordModal mode={recordMode} onClose={()=>setRecordMode(null)} onComplete={()=>completeRecord(recordMode==='usage'?'Material usage recorded against today’s work activity.':'Wastage report submitted with an accountable reason.')}/>}
    {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function MaterialRecordModal({mode,onClose,onComplete}:{mode:'usage'|'wastage';onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal field-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">GILGAL 2 · MATERIAL CONTROL</span><h2>{mode==='usage'?'Record material used':'Report waste or damage'}</h2><p>This record reduces the quantity under your custody.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="form-grid"><label className="full">Material<select required defaultValue=""><option value="" disabled>Select issued material…</option><option>Y12 reinforcement steel · 38 lengths held</option><option>Bamburi cement · 124 bags held</option><option>Binding wire 16G · 8 rolls held</option><option>Marine plywood 18mm · 18 sheets held</option></select></label><label>Quantity<input required min="1" type="number" placeholder="0"/></label><label>Unit<select><option>lengths</option><option>bags</option><option>rolls</option><option>sheets</option></select></label><label className="full">{mode==='usage'?'Work activity / location':'Reason for waste or damage'}<textarea required rows={3} placeholder={mode==='usage'?'e.g. First-floor slab, grid A–D':'Explain exactly what happened and where…'}/></label>{mode==='wastage'&&<label className="full">Evidence photo<input type="file" accept="image/*"/></label>}</div><div className="control-callout"><Icon name="lock"/><div><b>Quantity cannot be edited after submission</b><span>A correction must be requested through the Manager and remains visible in the audit trail.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{mode==='usage'?'Record usage':'Submit wastage report'}</Button></div></form></div>
}

function ForemanDailyLog() {
  const [modal,setModal]=useState(false)
  const [submitted,setSubmitted]=useState(false)
  return <>
    <PageIntro title="Daily site log" copy="One accountable record of people, progress, delays and safety at Gilgal 2." action={submitted?'Update today’s log':'Complete today’s log'} icon="plus" onAction={()=>setModal(true)}/>
    <section className="daily-log-status"><div><Icon name={submitted?'check':'clock'} size={20}/><span><b>{submitted?'Today’s site log is submitted':'Today’s site log is still open'}</b><small>{submitted?'Submitted by Samuel Kariuki at 16:42':'Complete work progress and blockers before 17:00'}</small></span></div><strong>Saturday, 25 July 2026</strong></section>
    <section className="daily-log-grid"><div className="panel"><PanelHead title="Crew attendance" subtitle="31 people confirmed at morning roll call"/>
      <div className="crew-breakdown">{[['Masons','9','08:00'],['General labourers','16','07:00'],['Steel fixers','4','07:00'],['Electricians','2','13:00']].map(row=><div key={row[0]}><span><b>{row[0]}</b><small>Shift started {row[2]}</small></span><strong>{row[1]}</strong><Status>Present</Status></div>)}</div>
    </div><aside className="panel"><PanelHead title="Site readiness" subtitle="Morning checks"/><div className="readiness-list">{[['Toolbox safety talk','Complete'],['PPE check','Complete'],['Work areas released','Complete'],['Weather interruption','None']].map(row=><div key={row[0]}><span>{row[0]}</span><Status tone={row[1]==='None'?'accepted':'complete'}>{row[1]}</Status></div>)}</div></aside>
      <div className="panel span-full"><PanelHead title="Today’s activity record" subtitle="Planned versus completed work"/><div className="daily-activity-table">{[['Slab reinforcement','65%','65%','On plan'],['Slab-edge formwork','50%','40%','10% behind'],['Electrical conduits','30%','0%','Starts 13:00']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>Planned <b>{row[1]}</b></span><span>Recorded <b>{row[2]}</b></span><Status tone={row[3]==='On plan'?'accepted':'at-risk'}>{row[3]}</Status></div>)}</div></div>
    </section>
    {modal&&<DailyLogModal onClose={()=>setModal(false)} onComplete={()=>{setModal(false);setSubmitted(true)}}/>}
  </>
}

function DailyLogModal({onClose,onComplete}:{onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal field-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">GILGAL 2 · 25 JUL 2026</span><h2>Complete today’s site log</h2><p>Record what actually happened—not what was planned.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="form-grid"><label>Total people on site<input required type="number" defaultValue="31"/></label><label>Hours worked<input required type="number" defaultValue="8"/></label><label className="full">Work completed<textarea required rows={3} defaultValue="Slab reinforcement continued from grid A to D. Edge formwork completed on the eastern side."/></label><label className="full">Delays or blockers<textarea rows={2} placeholder="Record material, weather, drawing, labour or equipment delays…"/></label><label className="full">Site photos<input type="file" multiple accept="image/*"/></label><label className="full cashier-confirm"><input required type="checkbox"/><span>I confirm this log reflects the people and work physically observed on site today.</span></label></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Save draft</Button><Button type="submit">Submit daily log</Button></div></form></div>
}

function ForemanTools() {
  const [reported,setReported]=useState<string[]>([])
  const tools=[['TL-0244','Bosch rotary hammer','Good','Issued 11 Jul'],['TL-0198','Makita angle grinder','Good','Issued 18 Jul'],['TL-0302','Rebar cutter 25mm','Service due','Issued 20 Jul'],['TL-0164','Laser level','Good','Issued 22 Jul']]
  return <><PageIntro title="Tools issued to me" copy="Custody, condition and return history for Gilgal 2 field equipment." action="Report tool problem" icon="alert" onAction={()=>setReported(current=>current.includes('TL-0302')?current:[...current,'TL-0302'])}/><section className="field-boundary"><Icon name="tool" size={16}/><span><b>You are the current custodian.</b> Report loss or damage immediately; the equipment record cannot be deleted or backdated.</span></section><section className="tool-custody-grid">{tools.map(tool=><article className="panel" key={tool[0]}><div><span className="tool-code">{tool[0]}</span><Status tone={reported.includes(tool[0])?'at-risk':tool[2]==='Good'?'healthy':'service-due'}>{reported.includes(tool[0])?'Problem reported':tool[2]}</Status></div><i><Icon name="tool" size={24}/></i><h3>{tool[1]}</h3><p>{tool[3]} · Custodian: Samuel Kariuki</p><button onClick={()=>setReported(current=>current.includes(tool[0])?current:[...current,tool[0]])}>{reported.includes(tool[0])?<><Icon name="check" size={14}/>Report submitted</>:<>Report damage <Icon name="arrow" size={13}/></>}</button></article>)}</section></>
}

function EngineerProgress() {
  const [verified,setVerified]=useState<string[]>([])
  const [toast,setToast]=useState('')
  const rows=[['Gilgal 1','Roof structure','68%','67%','18 Dec 2026','1%'],['Gilgal 2','First-floor slab','74%','71%','30 Sep 2026','3%'],['SNEP HQ','Ground-floor masonry','39%','39%','28 Feb 2027','0%'],['Church','Column works','31%','28%','15 Apr 2027','3%']]
  const verify=(name:string)=>{setVerified(current=>[...current,name]);setToast(`${name} progress verified and added to its technical history.`);setTimeout(()=>setToast(''),3000)}
  return <><PageIntro title="Progress & milestones" copy="Compare field reports with technically verified construction progress." action="Export progress report" icon="download"/><section className="engineer-guardrail"><Icon name="eye" size={16}/><p><b>Only verified progress becomes official.</b> A Foreman may report completion, but the Engineer confirms workmanship and measured quantities before certification.</p></section><section className="panel engineer-progress-register"><PanelHead title="Project progress register" subtitle="Latest reporting cycle · 25 July 2026"/><div className="progress-register"><div className="progress-register-row progress-register-head"><span>PROJECT</span><span>CURRENT STAGE</span><span>REPORTED</span><span>VERIFIED</span><span>EXPECTED FINISH</span><span>GAP</span><span></span></div>{rows.map(row=><div className="progress-register-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><b>{row[2]}</b><b>{verified.includes(row[0])?row[2]:row[3]}</b><span>{row[4]}</span><Status tone={row[5]==='0%'?'accepted':'at-risk'}>{verified.includes(row[0])?'0%':row[5]}</Status>{verified.includes(row[0])?<Status>Verified</Status>:<button onClick={()=>verify(row[0])}>Verify <Icon name="arrow" size={12}/></button>}</div>)}</div></section><section className="milestone-board"><div className="panel"><PanelHead title="Milestones in the next 14 days" subtitle="Inspections gate the next construction stage"/><div className="milestone-list">{[['28 Jul','Gilgal 2','Slab reinforcement approved','Inspection required'],['31 Jul','Gilgal 1','Roof ring beam complete','On schedule'],['02 Aug','Church','Ground-floor columns cast','Inspection required'],['04 Aug','SNEP HQ','Masonry reaches lintel level','On schedule']].map(row=><div key={row[0]+row[1]}><time>{row[0]}</time><span><b>{row[2]}</b><small>{row[1]}</small></span><Status>{row[3]}</Status></div>)}</div></div></section>{toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</>
}

function EngineerQuality() {
  const [modal,setModal]=useState(false)
  const [toast,setToast]=useState('')
  const inspections=[['INS-0186','Gilgal 2','Slab reinforcement before pour','Today, 14:00','Scheduled'],['INS-0185','Church','Column formwork and plumb','Today, 16:00','Scheduled'],['INS-0184','Gilgal 1','Roof ring-beam formwork','Today, 08:20','Passed'],['INS-0183','SNEP HQ','Blockwork line and level','24 Jul, 15:10','Passed with note']]
  return <><PageIntro title="Quality inspections" copy="Technical hold points, defects and proof of corrective work." action="Record inspection" icon="plus" onAction={()=>setModal(true)}/><section className="quality-summary"><div><span>Due today</span><strong>2</strong><small>Both before covered work</small></div><div><span>Open defects</span><strong>4</strong><small>1 high-priority</small></div><div><span>Closed this week</span><strong>7</strong><small>Evidence verified</small></div><div><span>First-time pass rate</span><strong>86%</strong><small>Last 30 days</small></div></section><section className="quality-grid"><div className="panel"><PanelHead title="Inspection schedule" subtitle="Work cannot proceed past a hold point without a result"/><div className="inspection-register">{inspections.map(row=><div key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[2]}</strong><small>{row[1]} · {row[3]}</small></span><Status>{row[4]}</Status><button onClick={()=>setModal(true)}>{row[4]==='Scheduled'?'Inspect':'View'} <Icon name="arrow" size={12}/></button></div>)}</div></div><aside className="panel defect-register"><PanelHead title="Open corrective work" subtitle="Must be re-inspected before closure"/><div>{[['High','Gilgal 2','Insufficient cover at beam B4','Due before slab pour'],['Medium','Church','Column C2 is 12mm out of plumb','Due 27 Jul'],['Low','SNEP HQ','Uneven mortar joint at grid F','Due 29 Jul']].map(row=><article key={row[2]}><span className={`severity ${row[0].toLowerCase()}`}>{row[0]}</span><div><b>{row[2]}</b><small>{row[1]} · {row[3]}</small></div><button><Icon name="chevron" size={14}/></button></article>)}</div></aside></section>{modal&&<InspectionModal onClose={()=>setModal(false)} onComplete={()=>{setModal(false);setToast('Inspection recorded with a permanent technical reference.')}}/>}{toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</>
}

function InspectionModal({onClose,onComplete}:{onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal inspection-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">TECHNICAL INSPECTION</span><h2>Record inspection result</h2><p>The result gates whether construction may proceed.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="form-grid"><label>Project<select required><option>Gilgal 2</option><option>Church</option></select></label><label>Inspection type<select required><option>Slab reinforcement before pour</option><option>Column formwork and plumb</option></select></label><label className="full">Result<select required defaultValue=""><option value="" disabled>Select technical result…</option><option>Passed — work may proceed</option><option>Passed with note</option><option>Correction required — work held</option></select></label><label className="full">Measurements and observations<textarea required rows={3} placeholder="Record dimensions, levels, cover, workmanship and referenced drawing…"/></label><label>Drawing revision<input required placeholder="e.g. STR-204 Rev B"/></label><label>Evidence photos<input type="file" multiple accept="image/*"/></label></div><div className="payment-audit-note"><Icon name="shield" size={16}/><span>This decision is signed with your Engineer identity. A failed hold-point inspection automatically blocks the next stage.</span></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save inspection result</Button></div></form></div>
}

function EngineerDrawings() {
  const drawings=[['STR-204','First-floor slab reinforcement','B','Gilgal 2','Approved for construction','24 Jul 2026'],['ARC-118','Ground-floor general arrangement','C','SNEP HQ','Approved for construction','22 Jul 2026'],['STR-091','Ground-floor column details','A','Church','Under review','23 Jul 2026'],['ELE-044','Electrical conduit layout','C','SNEP HQ','Ready to issue','25 Jul 2026']]
  return <><PageIntro title="Drawings & technical documents" copy="One controlled register so sites build from the current approved revision." action="Upload revision" icon="plus"/><section className="drawing-warning"><Icon name="alert" size={18}/><span><b>Two superseded drawings may still be printed on site.</b><small>Gilgal 2 and SNEP HQ must confirm that old copies were withdrawn.</small></span><button>Track withdrawal</button></section><section className="drawing-layout"><div className="panel"><PanelHead title="Controlled drawing register" subtitle="Only ‘Approved for construction’ revisions may be built"/><div className="drawing-register"><div className="drawing-row drawing-head"><span>NUMBER</span><span>TITLE</span><span>REV.</span><span>PROJECT</span><span>STATUS</span><span>ISSUED</span><span></span></div>{drawings.map(row=><div className="drawing-row" key={row[0]}><b className="mono">{row[0]}</b><strong>{row[1]}</strong><b>{row[2]}</b><span>{row[3]}</span><Status>{row[4]}</Status><span>{row[5]}</span><button><Icon name="eye" size={14}/>Open</button></div>)}</div></div><aside className="panel rfi-panel"><PanelHead title="Requests for information" subtitle="Questions blocking site work"/><div>{[['RFI-0038','Gilgal 2','Beam B4 / conduit clash','Engineer reply due today'],['RFI-0037','Church','Column C2 setting-out dimension','Answered'],['RFI-0035','SNEP HQ','Window schedule discrepancy','Architect reply due 27 Jul']].map(row=><article key={row[0]}><div><b className="mono">{row[0]}</b><Status>{row[3]}</Status></div><h3>{row[2]}</h3><p>{row[1]}</p><button>Open RFI <Icon name="arrow" size={12}/></button></article>)}</div></aside></section></>
}

function StorekeeperLedger() {
  const stock=[['Bamburi cement','SNEP HQ','bags','1,248','320','Healthy'],['Y12 reinforcement steel','Gilgal 2','lengths','186','220','Low stock'],['River sand','Gilgal 1','tonnes','42.5','18','Healthy'],['PVC conduit 25mm','SNEP HQ','lengths','64','100','Low stock'],['Marine plywood 18mm','Church','sheets','38','30','Watch']]
  return <><PageIntro title="Immutable stock ledger" copy="Current balances derived from received, issued, transferred and adjusted events." action="Export ledger" icon="download"/><section className="storekeeper-guardrail"><Icon name="lock" size={16}/><p><b>No direct balance editing.</b> Every change must originate from a GRN, issue voucher, confirmed transfer, approved wastage adjustment or stock-count variance.</p></section><section className="metrics-grid compact"><Metric label="Stock value" value="KES 12.84M" note="Across four project stores" icon="boxes" tone="navy"/><Metric label="Ledger events today" value="18" note="6 receipts · 9 issues · 3 transfers" icon="file" tone="green"/><Metric label="Low stock" value="7 items" note="2 project-critical" icon="alert" tone="orange"/><Metric label="Unresolved variance" value="KES 94,600" note="Two submitted count records" icon="shield" tone="red"/></section><section className="panel store-ledger-panel"><div className="table-tools"><div className="inline-search"><Icon name="search"/><input placeholder="Search material, SKU or store…"/></div><button><Icon name="filter"/>Store & level</button><button><Icon name="download"/>Export</button></div><div className="store-ledger-table"><div className="store-ledger-row store-ledger-head"><span>MATERIAL</span><span>STORE</span><span>UNIT</span><span>ON HAND</span><span>REORDER AT</span><span>LEVEL</span><span></span></div>{stock.map(row=><div className="store-ledger-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><b>{row[3]}</b><span>{row[4]}</span><Status tone={row[5]==='Healthy'?'healthy':'low-stock'}>{row[5]}</Status><button><Icon name="eye" size={14}/>History</button></div>)}</div></section></>
}

function StorekeeperReceiving() {
  const [selected,setSelected]=useState<string[]|null>(null)
  const [received,setReceived]=useState<string[]>([])
  const [toast,setToast]=useState('')
  const deliveries=[['PO-0188','Bamburi Cement PLC','Bamburi cement','180 bags','SNEP HQ','Arrived 09:35'],['PO-0190','Apex Steel Ltd','Y12 reinforcement steel','240 lengths','Gilgal 2','Due 13:00'],['PO-0191','Kaydee Hardware','PVC conduit 25mm','150 lengths','SNEP HQ','Due 15:30']]
  const finish=(po:string)=>{setReceived(current=>[...current,po]);setSelected(null);setToast(`${po} received. GRN created from the physical count.`);setTimeout(()=>setToast(''),3000)}
  return <><PageIntro title="Receive deliveries" copy="Count and inspect actual goods against an issued purchase order." action="Scan delivery note" icon="plus"/><section className="storekeeper-guardrail"><Icon name="shield" size={16}/><p><b>Record reality, not the supplier document.</b> Short, excess, rejected or damaged quantities create a discrepancy and remain visible to Procurement and Finance.</p></section><section className="receiving-board">{deliveries.map(delivery=>{const done=received.includes(delivery[0]);return <article className={`panel delivery-card ${done?'done':''}`} key={delivery[0]}><div><b className="mono">{delivery[0]}</b><Status tone={done?'accepted':delivery[5].startsWith('Arrived')?'at-risk':'issued'}>{done?'GRN created':delivery[5]}</Status></div><h3>{delivery[2]}</h3><p>{delivery[1]} · Deliver to {delivery[4]}</p><strong>{delivery[3]}</strong><button disabled={done} onClick={()=>setSelected(delivery)}>{done?<><Icon name="check" size={14}/>Received</>:<>Count & receive <Icon name="arrow" size={13}/></>}</button></article>})}</section>{selected&&<GoodsReceiptModal delivery={selected} onClose={()=>setSelected(null)} onComplete={()=>finish(selected[0])}/>} {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</>
}

function GoodsReceiptModal({delivery,onClose,onComplete}:{delivery:string[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal grn-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">GOODS RECEIVED NOTE</span><h2>Count and inspect delivery</h2><p>{delivery[0]} · {delivery[1]}</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="locked-order"><span>ORDERED ITEM</span><strong>{delivery[2]}</strong><b>{delivery[3]}</b><small><Icon name="lock" size={12}/>Purchase order details are locked</small></div><div className="form-grid"><label>Quantity physically received<input required type="number" min="0" placeholder="Count every unit"/></label><label>Rejected / damaged quantity<input required type="number" min="0" defaultValue="0"/></label><label>Overall condition<select required><option>Good</option><option>Partly damaged</option><option>Rejected</option></select></label><label>Supplier delivery note<input required placeholder="Delivery note number"/></label><label className="full">Discrepancy or condition notes<textarea rows={3} placeholder="Explain any short, excess, rejected or damaged quantity…"/></label><label className="full">Delivery evidence<input type="file" multiple accept="image/*"/></label></div><div className="control-callout"><Icon name="alert"/><div><b>A mismatch will not be silently corrected</b><span>The GRN records the physical count and automatically flags the PO for follow-up.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create GRN</Button></div></form></div>
}

function StorekeeperIssues() {
  const [selected,setSelected]=useState<string[]|null>(null)
  const [issued,setIssued]=useState<string[]>([])
  const requests=[['MR-0239','Gilgal 2','Y12 reinforcement steel','80 lengths','Samuel Kariuki','186 available'],['MR-0245','Gilgal 1','River sand','18 tonnes','Joseph Maina','42.5 available']]
  return <><PageIntro title="Issue approved materials" copy="Release stock only against an approved requisition and available balance." action="Print pick list" icon="file"/><section className="storekeeper-guardrail"><Icon name="lock" size={16}/><p><b>You may issue less, never more.</b> The approved material and maximum quantity are locked. Foreman confirmation completes the custody handover.</p></section><section className="panel"><PanelHead title="Approved requests ready for issue" subtitle="Stock availability checked automatically"/><div className="issue-ready-list">{requests.map(row=>{const done=issued.includes(row[0]);return <article key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[2]}</strong><small>{row[1]} · Issue to {row[4]}</small></span><b>{row[3]}</b><small>{row[5]}</small>{done?<Status>Awaiting foreman</Status>:<button onClick={()=>setSelected(row)}>Create issue voucher <Icon name="arrow" size={13}/></button>}</article>})}</div></section>{selected&&<MaterialIssueModal request={selected} onClose={()=>setSelected(null)} onComplete={()=>{setIssued(current=>[...current,selected[0]]);setSelected(null)}}/>}</>
}

function MaterialIssueModal({request,onClose,onComplete}:{request:string[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">MATERIAL ISSUE VOUCHER</span><h2>Record physical issue</h2><p>{request[0]} · Approved for {request[1]}</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="locked-order"><span>APPROVED MATERIAL</span><strong>{request[2]}</strong><b>Maximum {request[3]}</b><small><Icon name="lock" size={12}/>{request[5]} in the store</small></div><div className="form-grid"><label>Quantity actually issued<input required type="number" min="1" max={Number.parseFloat(request[3])} placeholder={`Maximum ${request[3]}`}/></label><label>Issue to<input readOnly value={request[4]}/></label><label className="full">Work activity / location<textarea required rows={2} placeholder="Where will the material be used?"/></label></div><div className="control-callout"><Icon name="swap"/><div><b>Handover remains incomplete</b><span>{request[4]} must physically count and confirm receipt before custody changes.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create issue voucher</Button></div></form></div>
}

function StorekeeperTransfers() {
  const [confirmed,setConfirmed]=useState<string[]>([])
  const transfers=[['TR-0063','Gilgal 1','Church','Timber','32 pieces','Inbound · 3 days overdue'],['TR-0065','SNEP HQ','Gilgal 2','PVC conduit','40 lengths','In transit · 4 hours'],['TR-0066','Church','Gilgal 1','Binding wire','6 rolls','Ready to dispatch']]
  return <><PageIntro title="Inter-site transfers" copy="Separate dispatch and receipt records expose anything lost in transit." action="New transfer request" icon="plus"/><section className="storekeeper-guardrail"><Icon name="swap" size={16}/><p><b>No single person confirms both ends.</b> The sending store records dispatch; an independently assigned receiving storekeeper records the physical arrival.</p></section><section className="transfer-workspace">{transfers.map(row=><article className="panel" key={row[0]}><div><b className="mono">{row[0]}</b><Status tone={row[5].includes('overdue')?'at-risk':'issued'}>{confirmed.includes(row[0])?'Received':row[5]}</Status></div><div className="transfer-route-large"><span>{row[1]}</span><i><Icon name="arrow" size={15}/></i><span>{row[2]}</span></div><h3>{row[3]} · {row[4]}</h3><p>{row[5].startsWith('Inbound')?'Count actual received quantity and record any variance.':'Movement is visible to both site stores.'}</p><button onClick={()=>setConfirmed(current=>[...current,row[0]])} disabled={confirmed.includes(row[0])}>{confirmed.includes(row[0])?<><Icon name="check" size={14}/>Confirmation recorded</>:row[5].startsWith('Inbound')?'Confirm physical receipt':'Open transfer'}</button></article>)}</section></>
}

function StorekeeperCounts() {
  const [modal,setModal]=useState(false)
  const [submitted,setSubmitted]=useState(false)
  return <><PageIntro title="Physical stock counts" copy="Compare independently counted quantities with the system balance." action="Start count" icon="plus" onAction={()=>setModal(true)}/><section className="count-cycle"><div><span>CURRENT COUNT CYCLE</span><h2>July month-end stock count</h2><p>Due 31 July 2026 · 4 project stores · Independent observer required</p></div><div><strong>{submitted?'1 of 4':'0 of 4'}</strong><span>stores submitted</span></div></section><section className="panel"><PanelHead title="Count schedule" subtitle="Submitted variances require review; they do not directly overwrite stock"/><div className="count-list">{[['Gilgal 1','29 Jul','Lucy Njeri','James Kamau','Not started'],['Gilgal 2','29 Jul','Lucy Njeri','Mercy Wanjiku',submitted?'Submitted':'Not started'],['SNEP HQ','30 Jul','David Ouma','Mary Atienza','Not started'],['Church','31 Jul','Esther Muli','James Kamau','Not started']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span><small>Counter</small>{row[2]}</span><span><small>Observer</small>{row[3]}</span><Status>{row[4]}</Status><button onClick={()=>setModal(true)}>{row[4]==='Submitted'?'View':'Count now'}</button></div>)}</div></section>{modal&&<StockCountModal onClose={()=>setModal(false)} onComplete={()=>{setModal(false);setSubmitted(true)}}/>}</>
}

function StockCountModal({onClose,onComplete}:{onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">PHYSICAL STOCK COUNT</span><h2>Record counted quantity</h2><p>Gilgal 2 store · July month-end cycle</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="form-grid"><label className="full">Material<select><option>Y12 reinforcement steel · system balance hidden</option><option>Bamburi cement · system balance hidden</option></select></label><label>Physical quantity counted<input required type="number" min="0"/></label><label>Unit<select><option>lengths</option><option>bags</option></select></label><label className="full">Count notes<textarea rows={2} placeholder="Location, unopened stacks and counting method…"/></label><label className="full cashier-confirm"><input required type="checkbox"/><span>The independent observer was present and confirms this physical count.</span></label></div><div className="control-callout"><Icon name="eye"/><div><b>System balance is hidden during entry</b><span>This reduces anchoring and makes the physical count independent.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Submit count</Button></div></form></div>
}

function ProcurementApprovedRequests() {
  const [selected,setSelected]=useState<string[]|null>(null)
  const [started,setStarted]=useState<string[]>([])
  const requests=[['MR-0248','Y12 reinforcement steel','240 lengths','Gilgal 2','KES 412,800','3 quotes required'],['MR-0247','Bamburi cement','180 bags','SNEP HQ','KES 171,000','3 quotes required'],['MR-0245','River sand','18 tonnes','Gilgal 1','KES 63,000','Direct sourcing allowed'],['MR-0246','Machine-cut stones','1,200 pcs','Church','KES 84,000','Direct sourcing allowed']]
  return <><PageIntro title="Approved sourcing queue" copy="Turn approved project demand into accountable supplier competition." action="Export sourcing plan" icon="download"/><section className="procurement-guardrail"><Icon name="lock" size={16}/><p><b>Demand is locked.</b> Procurement may source the approved item and quantity but cannot increase it, change the project, or approve the resulting purchase order.</p></section><section className="panel"><PanelHead title="Requests ready for Procurement" subtitle="Ordered by needed-by date"/><div className="procurement-source-list">{requests.map(row=><article key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[1]}</strong><small>{row[2]} · {row[3]}</small></span><b>{row[4]}</b><Status tone={row[5].startsWith('3')?'at-risk':'approved'}>{row[5]}</Status>{started.includes(row[0])?<Status>Sourcing open</Status>:<button onClick={()=>setSelected(row)}>Start sourcing <Icon name="arrow" size={13}/></button>}</article>)}</div></section>{selected&&<SourcingModal request={selected} onClose={()=>setSelected(null)} onComplete={()=>{setStarted(current=>[...current,selected[0]]);setSelected(null)}}/>}</>
}

function SourcingModal({request,onClose,onComplete}:{request:string[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal sourcing-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">SOURCE APPROVED REQUEST</span><h2>Open supplier quotation round</h2><p>{request[0]} · {request[3]}</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="locked-order"><span>LOCKED DEMAND</span><strong>{request[1]}</strong><b>{request[2]}</b><small><Icon name="lock" size={12}/>Approved estimated value {request[4]}</small></div><div className="form-grid"><label className="full">Suppliers invited<select multiple required size={3}><option>Apex Steel Ltd</option><option>Steel Centre Kenya</option><option>Devki Steel Mills</option><option>Kaydee Hardware</option></select></label><label>Quotation deadline<input required type="datetime-local"/></label><label>Delivery required by<input required type="date"/></label><label className="full">Commercial instructions<textarea rows={2} placeholder="Delivery location, taxes, transport and payment terms…"/></label><label className="full cashier-confirm"><input required type="checkbox"/><span>I declare no undisclosed personal interest in the invited suppliers.</span></label></div><div className="control-callout"><Icon name="shield"/><div><b>The resulting PO remains a draft</b><span>A different authorised role must approve it before it can be issued to the supplier.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Open quotation round</Button></div></form></div>
}

function ProcurementOrders() {
  const orders=[['PO-0192','MR-0248','Apex Steel Ltd','Gilgal 2','KES 412,800','Awaiting approval'],['PO-0191','MR-0244','Kaydee Hardware','SNEP HQ','KES 33,750','Draft'],['PO-0188','MR-0247','Bamburi Cement PLC','SNEP HQ','KES 171,000','Part delivered'],['PO-0187','MR-0246','Kaydee Hardware','Church','KES 84,000','Issued']]
  return <><PageIntro title="Purchase orders" copy="Prepare and follow orders without self-approval or goods receipt access." action="Create from approved request" icon="plus"/><section className="procurement-guardrail"><Icon name="shield" size={16}/><p><b>Submitting is not approving.</b> Draft POs preserve their requisition link, quote evidence and creator identity for independent approval.</p></section><section className="panel"><div className="table-tools"><div className="inline-search"><Icon name="search"/><input placeholder="Search PO or supplier…"/></div><button><Icon name="filter"/>Status</button></div><div className="po-role-table"><div className="po-role-row po-role-head"><span>PO</span><span>REQUEST</span><span>SUPPLIER</span><span>PROJECT</span><span>VALUE</span><span>STATUS</span><span></span></div>{orders.map(row=><div className="po-role-row" key={row[0]}><b className="mono">{row[0]}</b><span className="mono">{row[1]}</span><strong>{row[2]}</strong><span>{row[3]}</span><b>{row[4]}</b><Status>{row[5]}</Status><button>{row[5]==='Draft'?'Submit':'View'} <Icon name="arrow" size={12}/></button></div>)}</div></section></>
}

function ProcurementSuppliers() {
  const suppliers=[['Apex Steel Ltd','Steel & reinforcement','A013847219X','92%','Approved','3 open quotes'],['Bamburi Cement PLC','Cement','P000600438H','96%','Approved','1 open quote'],['Kaydee Hardware','General hardware','A008124190L','84%','Review due','2 open quotes'],['Mavoko Aggregates','Aggregates','A005671122P','89%','Approved','1 open quote']]
  return <><PageIntro title="Suppliers & quotations" copy="Commercial performance, compliance and competitive sourcing evidence." action="Add supplier" icon="plus"/><section className="supplier-alert"><Icon name="alert" size={17}/><span><b>Supplier bank-detail changes require independent verification.</b><small>Procurement can request a change but cannot make a new payout account immediately usable.</small></span></section><section className="panel"><PanelHead title="Approved supplier register" subtitle="KRA, compliance, performance and active sourcing"/><div className="supplier-role-list">{suppliers.map(row=><div key={row[0]}><div className="supplier-letter">{row[0][0]}</div><span><strong>{row[0]}</strong><small>{row[1]} · KRA {row[2]}</small></span><div><small>ON-TIME DELIVERY</small><b>{row[3]}</b></div><Status>{row[4]}</Status><span>{row[5]}</span><button><Icon name="eye" size={14}/>Profile</button></div>)}</div></section></>
}

function AuditEvidence() {
  const [selected,setSelected]=useState('AUD-0094')
  const findings=[['AUD-0094','High','Steel price above reference','KES 412,800'],['AUD-0091','High','Duplicate invoice reference','KES 384,000'],['AUD-0088','Medium','Transfer confirmation overdue','KES 156,000'],['AUD-0084','Medium','Round-number petty cash pattern','KES 50,000'],['AUD-0081','Low','Stock count submitted late','No direct exposure']]
  return <><PageIntro title="Evidence review" copy="Trace a flagged record through every predecessor, actor and attachment." action="Export selected evidence" icon="download"/><section className="auditor-guardrail"><Icon name="eye" size={16}/><p><b>Read-only evidence mode.</b> Notes are appended to the audit review; source transactions, approvals and attachments cannot be changed here.</p></section><section className="evidence-workspace"><aside className="panel finding-list"><PanelHead title="Audit sample" subtitle="5 items selected for review"/><div>{findings.map(finding=><button className={selected===finding[0]?'active':''} onClick={()=>setSelected(finding[0])} key={finding[0]}><span className={`severity ${finding[1].toLowerCase()}`}>{finding[1]}</span><span><b>{finding[2]}</b><small>{finding[0]} · {finding[3]}</small></span><Icon name="chevron" size={14}/></button>)}</div></aside><div className="panel evidence-detail"><div className="evidence-head"><div><span>SELECTED EVIDENCE CHAIN</span><h2>{selected} · Steel price above reference</h2><p>Gilgal 2 · Structural works · Apex Steel Ltd</p></div><Status tone="at-risk">Open finding</Status></div><div className="evidence-facts"><div><span>Financial exposure</span><b>KES 412,800</b></div><div><span>Reference price difference</span><b>+8.4%</b></div><div><span>Events in chain</span><b>7 verified</b></div><div><span>Attachments</span><b>5 hashed files</b></div></div><div className="evidence-timeline">{[['Material request','MR-0248','Samuel Kariuki · Foreman','25 Jul, 09:42','Created from device 8AF2'],['Manager approval','APR-0441','Steven Kakai · Manager','25 Jul, 10:06','Approved within KES 500K limit'],['Quote comparison','QC-0068','Paul Kimani · Procurement','25 Jul, 11:20','Apex selected; not lowest quote'],['Purchase order','PO-0192','Paul Kimani · Procurement','25 Jul, 11:34','Submitted for independent approval'],['Price exception','FLAG-0183','System control','25 Jul, 11:34','8.4% above reference price']].map((event,index)=><article key={event[1]}><i>{index+1}</i><div><span>{event[0]}</span><h3>{event[1]}</h3><p>{event[2]} · {event[3]}</p><small>{event[4]}</small></div><Icon name="check" size={15}/></article>)}</div><div className="hash-proof"><Icon name="lock" size={16}/><span><b>Hash chain verified</b><small>Previous: 7f4a…821c · Current: c92e…044a</small></span><button>Copy hashes</button></div></div></section></>
}

function AuditReports() {
  const reports=[['Monthly control assurance','All projects · July 2026','PDF + evidence index','Generated 24 Jul'],['Procurement exception report','Price, quote and supplier controls','XLSX','Generated 25 Jul'],['Inventory variance report','Counts, transfers and wastage','XLSX + photos','Generated 25 Jul'],['Payment audit trail','Approvals, execution and receipts','PDF + CSV','Generated 24 Jul']]
  return <><PageIntro title="Audit reports & exports" copy="Independent outputs generated from immutable source events." action="Build custom report" icon="plus"/><section className="report-control-note"><Icon name="shield" size={17}/><span><b>Every export carries a verification manifest.</b><small>Recipients can confirm that records and attachments have not changed after export.</small></span></section><section className="audit-report-grid">{reports.map(report=><article className="panel" key={report[0]}><div><Icon name="file" size={22}/><Status>Ready</Status></div><h3>{report[0]}</h3><p>{report[1]}</p><span>{report[2]}</span><footer><small>{report[3]}</small><button><Icon name="download" size={14}/>Download</button></footer></article>)}</section><section className="panel scheduled-reports"><PanelHead title="Scheduled assurance reports" subtitle="Delivery does not grant transactional access"/><div>{[['CEO weekly exception brief','Every Monday, 07:00','Josephine Charles','Active'],['Month-end stock variance','Last day, 18:00','CEO + Auditor','Active'],['High-value payment alert','On every payment > KES 500K','CEO + Auditor','Active']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><Status>{row[3]}</Status><button><Icon name="eye" size={14}/>View rule</button></div>)}</div></section></>
}

function Inventory({readOnly=false}:{readOnly?:boolean}) {
  const stock=[['Bamburi Powermax cement','Cement','bags','1,248','Gilgal 1','Healthy'],['Y12 reinforcement steel','Steel','lengths','186','Gilgal 2','Low stock'],['River sand','Aggregates','tonnes','42.5','Church','Healthy'],['PVC conduit 25mm','Electrical','lengths','64','SNEP HQ','Low stock'],['Machine-cut stones','Masonry','pieces','3,420','Church','Healthy']]
  return <>
    <PageIntro title="Materials & stores" copy="Live balances, accountable movements, and dual-confirmed transfers." action={readOnly?'Export stock view':'Record movement'} icon={readOnly?'download':'swap'}/>
    {readOnly&&<section className="role-guardrail owner-readonly-note"><Icon name="eye" size={17}/><p><b>Read-only movement view:</b> Storekeepers record receipts, issues and transfers. Managers and the CEO monitor custody and exceptions without altering stock.</p></section>}
    <section className="metrics-grid compact">
      <Metric label="Stock on hand" value="KES 12.84M" note="Across 4 site stores" icon="boxes" tone="navy"/>
      <Metric label="Low-stock items" value="7 items" note="2 are project-critical" icon="alert" tone="orange"/>
      <Metric label="In transit" value="3 transfers" note="KES 486,000 value" icon="truck" tone="green"/>
      <Metric label="Unresolved variance" value="KES 94,600" note="Across 2 stock counts" icon="shield" tone="red"/>
    </section>
    <section className="inventory-layout">
      <div className="panel">
        <PanelHead title="Stock by material" subtitle="Balances across the selected project" action="Stock ledger"/>
        <div className="inventory-table">
          <div className="inventory-row inventory-head"><span>MATERIAL</span><span>UNIT</span><span>ON HAND</span><span>PRIMARY STORE</span><span>LEVEL</span><span></span></div>
          {stock.map((r,i)=><div className="inventory-row" key={r[0]}><div className="material-name"><div>{['CM','ST','SA','PV','MS'][i]}</div><span><b>{r[0]}</b><small>{r[1]}</small></span></div><span>{r[2]}</span><strong>{r[3]}</strong><span>{r[4]}</span><Status>{r[5]}</Status><button><Icon name="chevron" size={16}/></button></div>)}
        </div>
      </div>
      <aside className="panel transfers">
        <PanelHead title="Transfers in motion" subtitle="Requires dual confirmation" action="View all"/>
        {[['TR-0063','Gilgal 1','Church','Y10 steel · 80 lengths','Awaiting receipt','3 days'],['TR-0065','SNEP HQ','Gilgal 2','PVC conduit · 40 lengths','In transit','4 hrs'],['TR-0066','Church','Gilgal 1','Timber · 32 pieces','Dispatched','1 hr']].map(t=><div className="transfer" key={t[0]}><div className="transfer-top"><b className="mono">{t[0]}</b><Status>{t[4]}</Status></div><div className="route"><span>{t[1]}</span><i><Icon name="arrow" size={14}/></i><span>{t[2]}</span></div><p>{t[3]}</p><small><Icon name="clock" size={13}/>{t[5]} since dispatch</small></div>)}
      </aside>
    </section>
  </>
}

function ManagerBudget() {
  const bars=[['Gilgal 1',48.2,31.4,5.7],['Gilgal 2',36.5,28.9,3.2],['SNEP HQ',72,20.6,9.8],['Church',25.8,8.3,2.1]]
  return <>
    <PageIntro title="Project budget tracking" copy="Monitor spending and commitments without handling or authorising payments." action="Download report" icon="download"/>
    <section className="role-guardrail manager-budget-note"><Icon name="eye" size={17}/><p><b>Read-only financial view:</b> managers can use this information to control site work. Invoice approval and payment execution remain separated.</p></section>
    <section className="metrics-grid compact">
      <Metric label="Approved project budgets" value="KES 182.5M" note="Across four active projects" icon="wallet" tone="navy"/>
      <Metric label="Already spent" value="KES 89.2M" note="48.9% of total budget" icon="trend" tone="green"/>
      <Metric label="Approved orders" value="KES 20.8M" note="Not paid yet" icon="file" tone="orange"/>
      <Metric label="Available to plan" value="KES 72.5M" note="After open commitments" icon="check" tone="green"/>
    </section>
    <section className="manager-budget-grid">
      <div className="panel">
        <PanelHead title="Cost position by project" subtitle="Paid and committed amounts against the approved budget"/>
        <div className="budget-bars">{bars.map(([n,b,s,c])=><div key={String(n)}><div><b>{n}</b><span><strong>KES {Number(s).toFixed(1)}M</strong> paid · KES {Number(c).toFixed(1)}M ordered</span><em>KES {Number(b).toFixed(1)}M budget</em></div><div className="stack-bar"><i style={{width:`${Number(s)/Number(b)*100}%`}}/><b style={{width:`${Number(c)/Number(b)*100}%`}}/></div></div>)}</div>
        <div className="legend"><span><i/>Already paid</span><span><i/>Approved orders</span><span><i/>Still available</span></div>
      </div>
      <aside className="panel budget-watch">
        <PanelHead title="Manager’s budget watch" subtitle="Areas to manage before raising more requests"/>
        <div><span className="severity high">HIGH</span><section><b>Gilgal 2 · Structural works</b><p>92% reserved while the structural stage is 78% complete.</p><small>KES 680,000 remains</small></section></div>
        <div><span className="severity medium">WATCH</span><section><b>SNEP HQ · Masonry</b><p>Cement price is trending 6% above the reference rate.</p><small>Review next requisition</small></section></div>
        <div><span className="severity low">GOOD</span><section><b>Church · Foundation</b><p>Work completed KES 240,000 below its allocated cost.</p><small>Funds remain in the cost code</small></section></div>
      </aside>
    </section>
  </>
}

function CashierFinance() {
  const [tab,setTab]=useState('Ready to pay')
  const [paid,setPaid]=useState<string[]>([])
  const [toast,setToast]=useState('')
  const [selectedPayment,setSelectedPayment]=useState<PaymentCandidate|null>(null)
  const payments:PaymentCandidate[]=[
    {reference:'PAY-0421',supplier:'Coastline Electrical Ltd',invoice:'INV-2981',project:'Church',method:'Bank transfer',amount:'412,800'},
    {reference:'PAY-0420',supplier:'Mavoko Aggregates',invoice:'INV-1072',project:'Gilgal 1',method:'M-Pesa',amount:'63,000'},
    {reference:'PAY-0419',supplier:'Musa Electrical Works',invoice:'INV-2044',project:'SNEP HQ',method:'Bank transfer',amount:'179,000'},
    {reference:'PAY-0418',supplier:'Kaydee Hardware',invoice:'INV-3378',project:'Church',method:'M-Pesa',amount:'84,000'},
  ]
  const execute=(payment:PaymentCandidate)=>{
    setPaid(current=>[...current,payment.reference])
    setSelectedPayment(null)
    setToast(`${payment.reference} paid and linked to its external transaction reference.`)
    setTimeout(()=>setToast(''),3200)
  }
  return <>
    <PageIntro title="Payments & site cash" copy="Move only pre-approved money and leave a complete receipt trail." action="Record petty cash" icon="plus"/>
    <section className="cashier-guardrail compact-guardrail"><Icon name="lock" size={18}/><div><b>Amounts are locked to their approved invoices.</b><span>If anything is wrong, return the payment to Finance—never edit it at the cashier stage.</span></div></section>
    <section className="cashier-finance-summary">
      <div><span>Ready to pay</span><strong>KES 738,800</strong><small>4 approved payments</small></div>
      <div><span>Paid today</span><strong>KES 684,000</strong><small>1 completed payment</small></div>
      <div><span>Cash floats</span><strong>KES 684,250</strong><small>4 project accounts</small></div>
      <div><span>Receipts to attach</span><strong>1</strong><small>Payment proof outstanding</small></div>
    </section>
    <div className="tabs cashier-tabs">{['Ready to pay','Site cash','Payment history'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}{t==='Ready to pay'&&<span>{4-paid.length}</span>}</button>)}</div>
    {tab==='Ready to pay'?<section className="panel cashier-desk">
      <div className="cashier-desk-head"><div><h3>Approved payment queue</h3><p>Approval and delivery checks were completed by other roles.</p></div><button><Icon name="filter" size={15}/>Filter</button></div>
      <div className="cashier-desk-table">
        <div className="cashier-desk-row cashier-desk-labels"><span>PAYMENT</span><span>SUPPLIER</span><span>PROJECT</span><span>METHOD</span><span>AMOUNT</span><span>CONTROL CHECKS</span><span></span></div>
        {payments.map(payment=>{const isPaid=paid.includes(payment.reference);return <div className={`cashier-desk-row ${isPaid?'paid-row':''}`} key={payment.reference}>
          <div><b className="mono">{payment.reference}</b><small>{payment.invoice}</small></div><strong>{payment.supplier}</strong><span>{payment.project}</span><span>{payment.method}</span><b>KES {payment.amount}</b>
          <div className="checks-passed"><span><Icon name="check" size={12}/>Finance authorised</span><span><Icon name="check" size={12}/>3-way matched</span></div>
          {isPaid?<Status>Paid</Status>:<button onClick={()=>setSelectedPayment(payment)}>Execute <Icon name="arrow" size={13}/></button>}
        </div>})}
      </div>
    </section>:tab==='Site cash'?<section className="panel">
      <PanelHead title="Project cash floats" subtitle="Cash on hand and the latest reconciliation status"/>
      <div className="site-cash-table">
        {[['Gilgal 1','182,400','24 Jul, 17:30','No variance'],['Gilgal 2','94,850','24 Jul, 17:12','KES 1,150 under review'],['SNEP HQ','287,000','23 Jul, 17:46','No variance'],['Church','120,000','24 Jul, 16:58','No variance']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>KES {row[1]}</span><small>Last reconciled {row[2]}</small><Status tone={row[3] === 'No variance' ? 'accepted' : 'at-risk'}>{row[3]}</Status><button>Open ledger <Icon name="arrow" size={13}/></button></div>)}
      </div>
    </section>:<section className="panel">
      <PanelHead title="Payment history" subtitle="Completed transactions with external references"/>
      <div className="cashier-history">
        {[['PAY-0418','Bamburi Cement PLC','SNEP HQ','KES 684,000','FT26206K1','Today, 09:18'],['PAY-0417','Musa Electrical Works','Gilgal 2','KES 420,000','QGH8D22Q1','23 Jul, 15:42'],['PAY-0416','Mavoko Aggregates','Church','KES 126,000','QGH7M90P3','23 Jul, 11:06']].map(row=><div key={row[0]}><b className="mono">{row[0]}</b><strong>{row[1]}</strong><span>{row[2]}</span><b>{row[3]}</b><span className="mono">{row[4]}</span><small>{row[5]}</small><button><Icon name="receipt" size={15}/>Receipt</button></div>)}
      </div>
    </section>}
    {selectedPayment&&<PaymentExecutionModal payment={selectedPayment} onClose={()=>setSelectedPayment(null)} onComplete={()=>execute(selectedPayment)}/>}
    {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function Finance() {
  const bars=[['Gilgal 1',48.2,31.4,5.7],['Gilgal 2',36.5,28.9,3.2],['SNEP HQ',72,20.6,9.8],['Church',25.8,8.3,2.1]]
  return <>
    <PageIntro title="Financial position" copy="See what is budgeted, committed and paid without entering routine finance operations." action="Download owner report" icon="download"/>
    <section className="role-guardrail manager-budget-note"><Icon name="eye" size={17}/><p><b>Owner oversight:</b> Finance matches and authorises routine payments; the Cashier executes them. Only high-value or unresolved exceptions return to the CEO.</p></section>
    <section className="finance-hero">
      <div><span>TOTAL PORTFOLIO BUDGET</span><strong>KES 182,500,000</strong><p><i/> All 4 project budgets are active</p></div>
      <div><span>ACTUAL SPEND</span><strong>KES 89.2M</strong><small>48.9%</small></div><div><span>OPEN COMMITMENTS</span><strong>KES 20.8M</strong><small>11.4%</small></div><div><span>AVAILABLE</span><strong>KES 72.5M</strong><small>39.7%</small></div>
    </section>
    <section className="finance-grid">
      <div className="panel">
        <PanelHead title="Budget position by project" subtitle="Actual plus committed cost against approved budget" action="Detailed report"/>
        <div className="budget-bars">{bars.map(([n,b,s,c])=><div key={String(n)}><div><b>{n}</b><span><strong>KES {Number(s).toFixed(1)}M</strong> spent · KES {Number(c).toFixed(1)}M committed</span><em>KES {Number(b).toFixed(1)}M</em></div><div className="stack-bar"><i style={{width:`${Number(s)/Number(b)*100}%`}}/><b style={{width:`${Number(c)/Number(b)*100}%`}}/></div></div>)}</div>
        <div className="legend"><span><i/>Actual spend</span><span><i/>Committed</span><span><i/>Available</span></div>
      </div>
      <div className="panel payment-queue">
        <PanelHead title="Where payments stand" subtitle="Read-only owner view of controlled payment stages"/>
        {[['INV-8831','Apex Steel Ltd','412,800','Finance review','at-risk'],['INV-2149','Bamburi Cement','171,000','Finance authorised','approved'],['INV-1072','Mavoko Aggregates','63,000','Cashier execution','issued']].map(p=><div key={p[0]}><div className="supplier-letter">{p[1][0]}</div><span><b>{p[1]}</b><small>{p[0]} · Routine responsibility remains assigned</small></span><strong>KES {p[2]}</strong><Status tone={p[4]}>{p[3]}</Status></div>)}
      </div>
      <div className="panel span-full">
        <PanelHead title="Recent financial activity" subtitle="Payments, contributions and petty-cash movements" action="Export ledger"/>
        <div className="activity-table">
          {[['24 Jul 2026','PAY-0418','Supplier payment','Bamburi Cement PLC','SNEP HQ','− KES 684,000','Paid'],['24 Jul 2026','PC-0191','Petty cash expense','Site transport & fuel','Gilgal 1','− KES 18,500','Reconciled'],['23 Jul 2026','CON-0036','Client contribution','Project funding tranche','Church','+ KES 2,500,000','Cleared'],['23 Jul 2026','PAY-0417','Subcontractor payment','Musa Electrical Works','Gilgal 2','− KES 420,000','Paid']].map(r=><div key={r[1]}>{r.map((c,i)=>i===6?<Status key={c}>{c}</Status>:<span className={i===1?'mono':i===5?(c.startsWith('+')?'credit':'debit'):''} key={c}>{c}</span>)}</div>)}
        </div>
      </div>
    </section>
  </>
}

function Workforce({readOnly=false}:{readOnly?:boolean}) {
  return <GenericOperations
    title="Workforce & labour" copy="Site attendance and subcontractor obligations, without phantom headcount." action={readOnly?'Download attendance':'Log attendance'} readOnly={readOnly}
    metrics={[['On site today','126 people','Across 4 active sites','users','navy'],['Attendance logged','4 of 4 sites','Complete by 08:15','check','green'],['Active contracts','9 subcontractors','KES 18.4M remaining','file','orange'],['Pending payroll','KES 684,300','Due Friday, 31 July','clock','red']]}
    heading="Today’s site attendance"
    rows={[['Gilgal 1','38','12 masons · 18 labourers · 8 skilled','Samuel Kariuki','Confirmed'],['Gilgal 2','31','9 masons · 16 labourers · 6 skilled','John Mwangi','Confirmed'],['SNEP HQ','42','14 masons · 20 labourers · 8 skilled','Daniel Otieno','Confirmed'],['Church','15','5 masons · 7 labourers · 3 skilled','Joseph Maina','Confirmed']]}
  />
}

function Equipment({readOnly=false}:{readOnly?:boolean}) {
  return <GenericOperations
    title="Equipment & tools" copy="Assignment history, condition reports and rental exposure by site." action={readOnly?'Export asset view':'Register equipment'} readOnly={readOnly}
    metrics={[['Registered assets','184 items','KES 14.6M book value','tool','navy'],['Currently assigned','149 items','81% utilisation','check','green'],['Due for service','6 items','2 are overdue','clock','orange'],['Rental this month','KES 438,000','3 active rentals','wallet','red']]}
    heading="Equipment register"
    rows={[['EQ-0038','Concrete mixer 400L · Gilgal 1','Plant','Peter Mwangi','In use'],['EQ-0071','Plate compactor · Church','Plant','Joseph Maina','Service due'],['TL-0244','Bosch rotary hammer · SNEP HQ','Power tool','Daniel Otieno','In use'],['EQ-0018','Diesel generator 12kVA · Gilgal 2','Plant','John Mwangi','Available']]}
  />
}

function GenericOperations({title,copy,action,metrics,heading,rows,readOnly=false}:{title:string;copy:string;action:string;metrics:string[][];heading:string;rows:string[][];readOnly?:boolean}) {
  return <>
    <PageIntro title={title} copy={copy} action={action} icon={readOnly?'download':'plus'}/>
    {readOnly&&<section className="role-guardrail owner-readonly-note"><Icon name="eye" size={17}/><p><b>Oversight mode:</b> field teams own these operational entries. This workspace is for visibility, follow-up and reporting.</p></section>}
    <section className="metrics-grid compact">{metrics.map(m=><Metric key={m[0]} label={m[0]} value={m[1]} note={m[2]} icon={m[3] as IconName} tone={m[4]}/>)}</section>
    <section className="panel register-panel"><PanelHead title={heading} subtitle="Updated from site records" action="View full register"/>
      <div className="generic-table"><div><span>PROJECT / ID</span><span>DETAILS</span><span>CLASSIFICATION</span><span>RESPONSIBLE</span><span>STATUS</span><span></span></div>{rows.map(r=><div key={r[0]}>{r.map((c,i)=>i===4?<Status key={c}>{c}</Status>:<span className={i===0&&c.includes('-')?'mono':''} key={c}>{c}</span>)}<button><Icon name="eye" size={16}/>View</button></div>)}</div>
    </section>
  </>
}

function Audit({readOnly=false,ownerView=false}:{readOnly?:boolean;ownerView?:boolean}) {
  const events=[['10:42:18','Steven Kakai','APPROVED','Purchase order PO-0192','KES 412,800 · Gilgal 2','197.232.44.18'],['10:18:04','Lucy Njeri','CREATED','GRN-0112','Short delivery: 40 bags · SNEP HQ','41.90.64.202'],['09:57:36','James Kamau','APPROVED','Payment PAY-0419','KES 171,000 · Bamburi Cement','102.68.78.11'],['09:42:12','Samuel Kariuki','CREATED','Requisition MR-0248','240 lengths Y12 steel · Gilgal 2','105.163.2.84'],['08:16:50','Daniel Otieno','CREATED','Requisition MR-0247','180 bags cement · SNEP HQ','41.90.64.199']]
  return <>
    <PageIntro title="Audit & control centre" copy="Immutable activity history and automated fraud-control exceptions." action="Export audit report" icon="download"/>
    {readOnly&&<section className="auditor-guardrail"><Icon name="eye" size={16}/><p><b>{ownerView?'CEO oversight mode.':'Auditor read-only mode.'}</b> You may search, trace and export this evidence. Control configuration and source-record changes remain unavailable.</p></section>}
    <section className="control-banner"><div><Icon name="shield" size={24}/></div><div><b>Audit chain verified</b><span>128,492 consecutive events · Last verification today at 10:45 EAT</span></div><Status>Integrity intact</Status></section>
    <section className="audit-grid">
      <div className="panel exceptions"><PanelHead title="Open control exceptions" subtitle="Prioritised by financial and operational risk" action={readOnly?'View rule definitions':'Control rules'}/>
        {[['High','Segregation check blocked an approval','Requester attempted to approve MR-0243','Today, 08:51'],['High','Invoice price exceeds reference by 8.4%','INV-8831 · Apex Steel Ltd · KES 412,800','Yesterday, 16:02'],['Medium','Transfer confirmation is overdue','TR-0063 · Gilgal 1 → Church · 3 days','22 Jul, 14:18'],['Low','Repeated round-number petty cash entries','5 entries at KES 10,000 · Gilgal 2','20 Jul, 17:40']].map(x=><div key={x[1]}><span className={`severity ${x[0].toLowerCase()}`}>{x[0]}</span><div><b>{x[1]}</b><span>{x[2]}</span></div><time>{x[3]}</time><button><Icon name="chevron" size={15}/></button></div>)}
      </div>
      <aside className="panel controls-score"><PanelHead title="Controls health" subtitle="Last 30 days"/>
        <div className="score-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48"/><circle className="score" cx="60" cy="60" r="48"/></svg><div><strong>94</strong><span>/ 100</span></div></div>
        <p>Strong control environment</p>
        {[['3-way match compliance','98%'],['Separation of duties','100%'],['Stock count variance','91%'],['Approval timeliness','88%']].map(r=><div className="score-line" key={r[0]}><span>{r[0]}</span><b>{r[1]}</b></div>)}
      </aside>
      <div className="panel span-full"><PanelHead title="Recent audit trail" subtitle="Append-only record of sensitive activity" action="Advanced search"/>
        <div className="audit-table"><div className="audit-row audit-head"><span>TIME</span><span>ACTOR</span><span>ACTION</span><span>RECORD</span><span>DETAIL</span><span>IP ADDRESS</span></div>{events.map(e=><div className="audit-row" key={e[0]}>{e.map((c,i)=><span key={c} className={i===0||i===5?'mono':i===2?'event-action':''}>{c}</span>)}</div>)}</div>
      </div>
    </section>
  </>
}

function Settings() {
  const [tab,setTab]=useState('People & roles')
  const people=[
    ['JC','Josephine Charles','CEO','All projects','Active'],
    ['ST','Steven Kakai','Manager','All projects','Active'],
    ['DO','Daniel Otieno','Engineer','All projects','Active'],
    ['SK','Samuel Kariuki','Foreman','Gilgal 2','Active'],
    ['EN','Eunice Ngumbi','Cashier','All projects','Active'],
    ['LN','Lucy Njeri','Storekeeper','All projects','Active'],
    ['PK','Paul Kimani','Procurement Officer','All projects','Active'],
    ['JK','James Kamau','Finance Officer','All projects','Active'],
    ['MA','Mary Atienza','Auditor','All projects','Active'],
  ]
  return <>
    <PageIntro title="Workspace settings" copy="Configure access and approval policy without weakening the paper trail." action="Invite user" icon="plus"/>
    <div className="tabs settings-tabs">{['People & roles','Approval policy','Cost codes','Notifications','Organisation'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div>
    {tab==='People & roles'?<section className="panel">
      <div className="table-tools"><div className="inline-search"><Icon name="search"/><input placeholder="Search people…"/></div><button><Icon name="filter"/>Role & site</button></div>
      <div className="people-table"><div className="people-row people-head"><span>PERSON</span><span>ROLE</span><span>PROJECT ACCESS</span><span>STATUS</span><span>LAST ACTIVE</span><span></span></div>
        {people.map((p,i)=><div className="people-row" key={p[1]}><div className="person"><span>{p[0]}</span><div><b>{p[1]}</b><small>{p[1].toLowerCase().replace(' ','')}@snep.co.ke</small></div></div><span>{p[2]}</span><span>{p[3]}</span><Status>{p[4]}</Status><span>{i<2?'Today':i===2?'Yesterday':'23 Jul'}</span><button><Icon name="more"/></button></div>)}
      </div>
    </section>:tab==='Approval policy'?<section className="settings-grid">
      <div className="panel"><PanelHead title="Spend and payment thresholds" subtitle="Purchase commitment stays separate from invoice authorisation"/>
        <div className="policy-list">{[['Up to KES 100,000','Manager PO approval → Finance authorisation','CEO observes'],['KES 100,001 – 500,000','Manager PO approval → Finance authorisation','Two independent controls'],['Above KES 500,000','Finance review → CEO exception decision','Before the PO is issued']].map(p=><div key={p[0]}><div><b>{p[0]}</b><span>{p[2]}</span></div><strong>{p[1]}</strong><button><Icon name="settings" size={15}/>Edit</button></div>)}</div>
      </div>
      <aside className="panel"><PanelHead title="Structural controls" subtitle="Mandatory safeguards"/>
        <div className="toggle-list">{[['Segregation of duties','Requester cannot approve, receive or pay'],['Three-way invoice match','PO, GRN and invoice must agree'],['Dual-confirmed transfers','Both stores must confirm quantity'],['Immutable transaction history','Changes create a superseding version']].map(t=><div key={t[0]}><div><b>{t[0]}</b><span>{t[1]}</span></div><i className="toggle on"><em/></i></div>)}</div>
      </aside>
    </section>:<section className="panel empty-config"><div><Icon name={tab==='Cost codes'?'receipt':tab==='Notifications'?'bell':'building'} size={28}/></div><h3>{tab}</h3><p>This configuration area is ready for its corresponding backend endpoint.</p><Button variant="secondary">Configure {tab.toLowerCase()}</Button></section>}
  </>
}

export default function App() {
  return <BrowserRouter><Shell/></BrowserRouter>
}
