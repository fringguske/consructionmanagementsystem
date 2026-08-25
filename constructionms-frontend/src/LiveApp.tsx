import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router'
import {
  ApiError,
  authApi,
  notificationsApi,
  type AppNotification,
  type ConstructionRole,
  type CurrentUser,
} from './api'
import type { LiveDestination } from './LiveApiViews'
import './live-shell.css'
import './live-shell-extras.css'

const LiveDashboardView = lazy(() => import('./LiveApiViews').then(module => ({ default: module.LiveDashboardView })))
const LiveLoginView = lazy(() => import('./LiveApiViews').then(module => ({ default: module.LiveLoginView })))
const LiveProjectsView = lazy(() => import('./LiveApiViews').then(module => ({ default: module.LiveProjectsView })))
const LiveRequisitionsView = lazy(() => import('./LiveApiViews').then(module => ({ default: module.LiveRequisitionsView })))
const LiveProcurementView = lazy(() => import('./LivePurchaseViews').then(module => ({ default: module.LiveProcurementView })))
const LivePurchaseOrdersView = lazy(() => import('./LivePurchaseViews').then(module => ({ default: module.LivePurchaseOrdersView })))
const LiveAccessView = lazy(() => import('./LiveAccessView').then(module => ({ default: module.LiveAccessView })))
const LiveSuppliersView = lazy(() => import('./LiveSuppliersView').then(module => ({ default: module.LiveSuppliersView })))
const LiveInventoryView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LiveInventoryView })))
const LiveTechnicalAcceptanceView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LiveTechnicalAcceptanceView })))
const LiveFinanceView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LiveFinanceView })))
const LivePettyCashView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LivePettyCashView })))
const LiveAuditView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LiveAuditView })))
const MyTasksView = lazy(() => import('./LiveGovernanceViews').then(module => ({ default: module.MyTasksView })))
const OpeningPositionsView = lazy(() => import('./LiveGovernanceViews').then(module => ({ default: module.OpeningPositionsView })))
const CustodyCloseoutView = lazy(() => import('./LiveGovernanceViews').then(module => ({ default: module.CustodyCloseoutView })))
const PeriodClosingView = lazy(() => import('./LiveGovernanceViews').then(module => ({ default: module.PeriodClosingView })))

type NavItem = { to: string; label: string; glyph: string }

const roleNavigation: Record<ConstructionRole, readonly NavItem[]> = {
  Administrator: [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/access', label: 'Requests & access', glyph: 'AC' },
  ],
  CEO: [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/projects', label: 'Projects', glyph: 'PR' },
    { to: '/requisitions', label: 'Material requests', glyph: 'MR' },
    { to: '/sourcing', label: 'Supplier sourcing', glyph: 'SO' },
    { to: '/suppliers', label: 'Supplier register', glyph: 'SU' },
    { to: '/purchase-orders', label: 'Purchase orders', glyph: 'PO' },
    { to: '/inventory', label: 'Materials inventory', glyph: 'MI' },
    { to: '/opening-positions', label: 'Opening positions', glyph: 'OP' },
    { to: '/custody-close-out', label: 'Custody close-out', glyph: 'CU' },
    { to: '/finance', label: 'Money', glyph: 'MO' },
    { to: '/petty-cash', label: 'Petty cash', glyph: 'PC' },
    { to: '/period-close', label: 'Period closing', glyph: 'CL' },
    { to: '/audit', label: 'Complete chain', glyph: 'AU' },
  ],
  Supervisor: [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/projects', label: 'Projects', glyph: 'PR' },
    { to: '/requisitions', label: 'Material approvals', glyph: 'MR' },
    { to: '/sourcing', label: 'Sourcing exceptions', glyph: 'SO' },
    { to: '/purchase-orders', label: 'Purchase orders', glyph: 'PO' },
    { to: '/inventory', label: 'Stock controls', glyph: 'ST' },
    { to: '/opening-positions', label: 'Opening positions', glyph: 'OP' },
    { to: '/custody-close-out', label: 'Custody', glyph: 'CU' },
    { to: '/period-close', label: 'Period closing', glyph: 'CL' },
    { to: '/finance', label: 'Payment approvals', glyph: 'PA' },
    { to: '/petty-cash', label: 'Petty cash', glyph: 'PC' },
  ],
  Engineer: [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/projects', label: 'Project progress', glyph: 'PR' },
    { to: '/requisitions', label: 'Technical checks', glyph: 'TC' },
    { to: '/delivery-checks', label: 'Delivery checks', glyph: 'DC' },
  ],
  Foreman: [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/requisitions', label: 'Material requests', glyph: 'MR' },
    { to: '/inventory', label: 'Materials with me', glyph: 'MI' },
    { to: '/custody-close-out', label: 'Custody close-out', glyph: 'CU' },
  ],
  Storekeeper: [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/purchase-orders', label: 'Issued orders', glyph: 'PO' },
    { to: '/inventory', label: 'Receive & control stock', glyph: 'ST' },
    { to: '/opening-positions', label: 'Opening positions', glyph: 'OP' },
    { to: '/custody-close-out', label: 'Custody', glyph: 'CU' },
    { to: '/period-close', label: 'Corrections', glyph: 'CR' },
  ],
  'Procurement Officer': [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/sourcing', label: 'Sourcing', glyph: 'SO' },
    { to: '/purchase-orders', label: 'Purchase orders', glyph: 'PO' },
    { to: '/suppliers', label: 'Supplier onboarding', glyph: 'SU' },
    { to: '/finance', label: 'Supplier invoices', glyph: 'IN' },
  ],
  'Finance Officer': [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/projects', label: 'Project budgets', glyph: 'PR' },
    { to: '/purchase-orders', label: 'Purchase orders', glyph: 'PO' },
    { to: '/suppliers', label: 'Supplier approvals', glyph: 'SU' },
    { to: '/finance', label: 'Invoices & payments', glyph: 'IN' },
    { to: '/inventory', label: 'GRNs & stock', glyph: 'ST' },
    { to: '/petty-cash', label: 'Petty cash control', glyph: 'PC' },
    { to: '/opening-positions', label: 'Opening positions', glyph: 'OP' },
    { to: '/period-close', label: 'Period closing', glyph: 'CL' },
  ],
  Auditor: [
    { to: '/', label: 'Overview', glyph: 'OV' },
    { to: '/tasks', label: 'My tasks', glyph: 'TK' },
    { to: '/projects', label: 'Projects', glyph: 'PR' },
    { to: '/requisitions', label: 'Request trail', glyph: 'MR' },
    { to: '/sourcing', label: 'Sourcing trail', glyph: 'SO' },
    { to: '/suppliers', label: 'Supplier register', glyph: 'SU' },
    { to: '/purchase-orders', label: 'Order trail', glyph: 'PO' },
    { to: '/inventory', label: 'Material trail', glyph: 'MI' },
    { to: '/opening-positions', label: 'Opening positions', glyph: 'OP' },
    { to: '/custody-close-out', label: 'Custody trail', glyph: 'CU' },
    { to: '/finance', label: 'Payment trail', glyph: 'MO' },
    { to: '/petty-cash', label: 'Petty cash trail', glyph: 'PC' },
    { to: '/period-close', label: 'Period closing', glyph: 'CL' },
    { to: '/audit', label: 'Complete chain', glyph: 'AU' },
  ],
}

const destinationPaths: Record<LiveDestination, string> = {
  access: '/access', projects: '/projects', requisitions: '/requisitions', sourcing: '/sourcing',
  suppliers: '/suppliers', 'purchase-orders': '/purchase-orders', inventory: '/inventory',
  finance: '/finance', audit: '/audit',
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U'
}

function errorMessage(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'The request could not be completed.'
}

function SessionLoading() {
  return <main className="lav-session-state" role="status"><span/><p>Opening your workspace…</p></main>
}

function AccessRestricted({ role }: { role: ConstructionRole }) {
  return <div className="lav-view"><div className="lav-empty"><span aria-hidden="true">—</span><h3>Access unavailable</h3><p>This page is not assigned to the {role} role.</p></div></div>
}

function AccountDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="account-dialog-wrap"><button className="account-dialog-backdrop" aria-label={`Close ${title}`} onClick={onClose}/><section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title"><header><h2 id="account-dialog-title">{title}</h2><button aria-label="Close" onClick={onClose}>×</button></header>{children}</section></div>
}

function UsernameDialog({ username, onClose, onChanged }: { username: string; onClose: () => void; onChanged: () => void }) {
  const [newUsername, setNewUsername] = useState(username)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null)
    try { await authApi.changeUsername({ newUsername: newUsername.trim(), currentPassword: password }); onChanged() }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <AccountDialog title="Change username" onClose={onClose}><form onSubmit={event => void submit(event)}><label><span>New username</span><input autoFocus required minLength={3} maxLength={64} value={newUsername} onChange={event => setNewUsername(event.currentTarget.value)}/></label><label><span>Current password</span><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.currentTarget.value)}/></label>{error && <p role="alert">{error}</p>}<footer><button type="button" onClick={onClose}>Cancel</button><button disabled={busy}>{busy ? 'Saving…' : 'Save username'}</button></footer></form></AccountDialog>
}

function PasswordDialog({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword !== confirmPassword) { setError('The new passwords do not match.'); return }
    setBusy(true); setError(null)
    try { await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword: confirmPassword }); onChanged() }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <AccountDialog title="Change password" onClose={onClose}><form onSubmit={event => void submit(event)}><label><span>Current password</span><input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.currentTarget.value)}/></label><label><span>New password</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={newPassword} onChange={event => setNewPassword(event.currentTarget.value)}/></label><label><span>Confirm new password</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmPassword} onChange={event => setConfirmPassword(event.currentTarget.value)}/></label>{error && <p role="alert">{error}</p>}<footer><button type="button" onClick={onClose}>Cancel</button><button disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button></footer></form></AccountDialog>
}

function NotificationMenu({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([notificationsApi.list(controller.signal), notificationsApi.unreadCount(controller.signal)])
      .then(([result, count]) => { setItems(result.items); setUnreadCount(count.unreadCount); setError(null) })
      .catch(cause => { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(errorMessage(cause)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh])

  useEffect(() => {
    const timer = window.setInterval(() => setRefresh(value => value + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  async function openItem(item: AppNotification) {
    if (!item.isRead) {
      try {
        await notificationsApi.markRead(item.id)
        const readAt = new Date().toISOString()
        setUnreadCount(current => Math.max(0, current - 1))
        setItems(current => current.map(entry => entry.id === item.id ? { ...entry, isRead: true, readAt } : entry))
      } catch (cause) { setError(errorMessage(cause)); return }
    }
    const target = item.targetPath && item.targetPath.startsWith('/') && !item.targetPath.startsWith('//') ? item.targetPath : null
    setOpen(false)
    if (target) onNavigate(target)
  }

  async function readAll() {
    try {
      await notificationsApi.markAllRead()
      const readAt = new Date().toISOString()
      setUnreadCount(0)
      setItems(current => current.map(item => ({ ...item, isRead: true, readAt: item.readAt ?? readAt })))
    } catch (cause) { setError(errorMessage(cause)) }
  }

  return <div className="notification-menu">
    <button className="notification-trigger" aria-label="Notifications" aria-expanded={open} onClick={() => { if (!open) setRefresh(value => value + 1); setOpen(value => !value) }}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 20h4"/></svg>{Boolean(unreadCount) && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}</button>
    {open && <section className="notification-popover" role="dialog" aria-modal="false" aria-label="Notifications"><header><h2>Notifications</h2>{Boolean(unreadCount) && <button onClick={() => void readAll()}>Mark all read</button>}</header>{loading ? <div className="notification-state">Loading…</div> : error ? <div className="notification-state error"><span>{error}</span><button onClick={() => { setLoading(true); setRefresh(value => value + 1) }}>Try again</button></div> : items.length ? <div className="notification-list">{items.map(item => <button className={item.isRead ? '' : 'unread'} key={item.id} onClick={() => void openItem(item)}><span><b>{item.title}</b>{item.projectName && <small>{item.projectName}</small>}</span><p>{item.message}</p><time>{new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))}</time></button>)}</div> : <div className="notification-state">No notifications</div>}</section>}
  </div>
}

function Shell({ currentUser, onLogout, onRoleChanged, onCredentialsChanged }: { currentUser: CurrentUser; onLogout: () => void; onRoleChanged: (user: CurrentUser) => void; onCredentialsChanged: (message: string) => void }) {
  const [navOpen, setNavOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [switchingRole, setSwitchingRole] = useState<ConstructionRole | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [usernameOpen, setUsernameOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const navigate = useNavigate()
  const nav = roleNavigation[currentUser.role]
  const allowed = useMemo(() => new Set(nav.map(item => item.to)), [nav])

  async function switchRole(role: ConstructionRole) {
    if (role === currentUser.role) { setAccountOpen(false); return }
    setSwitchingRole(role); setAccountError(null)
    try { const user = await authApi.switchRole({ role }); onRoleChanged(user); navigate('/') }
    catch (cause) { setAccountError(errorMessage(cause)) }
    finally { setSwitchingRole(null) }
  }

  const canAccess = (path: string) => path === '/' || path === '/tasks' || allowed.has(path)

  return <div className="live-shell">
    <aside className={`live-sidebar ${navOpen ? 'open' : ''}`}>
      <header><div className="live-brand-mark" aria-hidden="true"><span/><span/><span/></div><div><strong>CONSTRUCT</strong><small>CONTROL SYSTEM</small></div><button aria-label="Close navigation" onClick={() => setNavOpen(false)}>×</button></header>
      <nav aria-label={`${currentUser.role} workspace`}><span>WORKSPACE</span>{nav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setNavOpen(false)}><b>{item.label}</b></NavLink>)}</nav>
      <footer><span>{currentUser.role}</span><strong>{currentUser.projects.length ? `${currentUser.projects.length} assigned project${currentUser.projects.length === 1 ? '' : 's'}` : 'Portfolio access'}</strong></footer>
    </aside>
    {navOpen && <button className="live-sidebar-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)}/>}
    <main className="live-main">
      <header className="live-topbar"><button className="live-menu-button" aria-label="Open navigation" onClick={() => setNavOpen(true)}>☰</button><span className="live-mobile-brand">CONSTRUCT</span><div className="live-top-actions"><NotificationMenu onNavigate={path => navigate(path)}/><div className="live-account"><button className="live-profile" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)}><span>{initials(currentUser.fullName)}</span><div><strong>{currentUser.fullName}</strong><small>{currentUser.role}</small></div><i aria-hidden="true">⌄</i></button>{accountOpen && <section className="live-account-menu"><header><span>@{currentUser.username}</span><button aria-label="Close account menu" onClick={() => setAccountOpen(false)}>×</button></header>{currentUser.canSwitchRoles && <div className="live-role-list"><strong>Verification role</strong>{currentUser.availableRoles.map(role => <button className={role === currentUser.role ? 'active' : ''} disabled={switchingRole !== null} key={role} onClick={() => void switchRole(role)}><span>{role}</span>{switchingRole === role ? <small>Opening…</small> : role === currentUser.role && <small>Current</small>}</button>)}</div>}{accountError && <p role="alert">{accountError}</p>}<button onClick={() => { setAccountOpen(false); setUsernameOpen(true) }}>Change username</button><button onClick={() => { setAccountOpen(false); setPasswordOpen(true) }}>Change password</button><button className="sign-out" onClick={onLogout}>Sign out</button></section>}</div></div></header>
      <div className="live-content"><Routes>
        <Route path="/" element={<LiveDashboardView currentUser={currentUser} onNavigate={destination => navigate(destinationPaths[destination])}/>}/>
        <Route path="/tasks" element={<MyTasksView currentUser={currentUser}/>}/>
        <Route path="/projects" element={canAccess('/projects') ? <LiveProjectsView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/requisitions" element={canAccess('/requisitions') ? <LiveRequisitionsView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/sourcing" element={canAccess('/sourcing') ? <LiveProcurementView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/purchase-orders" element={canAccess('/purchase-orders') ? <LivePurchaseOrdersView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/access" element={canAccess('/access') ? <LiveAccessView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/suppliers" element={canAccess('/suppliers') ? <LiveSuppliersView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/inventory" element={canAccess('/inventory') ? <LiveInventoryView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/delivery-checks" element={canAccess('/delivery-checks') ? <LiveTechnicalAcceptanceView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/finance" element={canAccess('/finance') ? <LiveFinanceView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/petty-cash" element={canAccess('/petty-cash') ? <LivePettyCashView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/opening-positions" element={canAccess('/opening-positions') ? <OpeningPositionsView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/custody-close-out" element={canAccess('/custody-close-out') ? <CustodyCloseoutView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/period-close" element={canAccess('/period-close') ? <PeriodClosingView currentUser={currentUser}/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="/audit" element={canAccess('/audit') ? <LiveAuditView/> : <AccessRestricted role={currentUser.role}/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes></div>
    </main>
    {usernameOpen && <UsernameDialog username={currentUser.username} onClose={() => setUsernameOpen(false)} onChanged={() => onCredentialsChanged('Username changed. Sign in with your new username.')}/>}
    {passwordOpen && <PasswordDialog onClose={() => setPasswordOpen(false)} onChanged={() => onCredentialsChanged('Password changed. Sign in with your new password.')}/>}
  </div>
}

function LiveSession() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>()
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    authApi.me(controller.signal).then(user => { setCurrentUser(user); setSessionError(null) }).catch(cause => {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setCurrentUser(null)
      if (!(cause instanceof ApiError && cause.status === 401)) setSessionError(errorMessage(cause))
    })
    return () => controller.abort()
  }, [])

  if (currentUser === undefined) return <SessionLoading/>
  if (currentUser === null) return <>{sessionError && <div className="lav-bootstrap-notice" role="alert">{sessionError}</div>}{sessionMessage && <div className="lav-bootstrap-notice success" role="status">{sessionMessage}</div>}<LiveLoginView onAuthenticated={user => { setCurrentUser(user); setSessionError(null); setSessionMessage(null) }}/></>

  async function logout() {
    try { await authApi.logout() } finally { setCurrentUser(null) }
  }
  function credentialsChanged(message: string) { setCurrentUser(null); setSessionError(null); setSessionMessage(message) }
  return <BrowserRouter><Shell currentUser={currentUser} onLogout={() => void logout()} onRoleChanged={setCurrentUser} onCredentialsChanged={credentialsChanged}/></BrowserRouter>
}

export default function LiveApp() {
  return <Suspense fallback={<SessionLoading/>}><LiveSession/></Suspense>
}
