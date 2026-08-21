import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router'
import './App.css'
import './flat-ui.css'
import {
  ApiError,
  authApi,
  isLiveApiMode,
  type ConstructionRole,
  type CurrentUser,
} from './api'
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
import type { LiveDestination } from './LiveApiViews'

const LiveDashboardView = lazy(() => import('./LiveApiViews').then(module => ({ default: module.LiveDashboardView })))
const LiveLoginView = lazy(() => import('./LiveApiViews').then(module => ({ default: module.LiveLoginView })))
const LiveProjectsView = lazy(() => import('./LiveApiViews').then(module => ({ default: module.LiveProjectsView })))
const LiveRequisitionsView = lazy(() => import('./LiveApiViews').then(module => ({ default: module.LiveRequisitionsView })))
const LiveProcurementView = lazy(() => import('./LivePurchaseViews').then(module => ({ default: module.LiveProcurementView })))
const LivePurchaseOrdersView = lazy(() => import('./LivePurchaseViews').then(module => ({ default: module.LivePurchaseOrdersView })))
const LiveAccessView = lazy(() => import('./LiveAccessView').then(module => ({ default: module.LiveAccessView })))
const LiveSuppliersView = lazy(() => import('./LiveSuppliersView').then(module => ({ default: module.LiveSuppliersView })))
const LiveInventoryView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LiveInventoryView })))
const LiveFinanceView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LiveFinanceView })))
const LivePettyCashView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LivePettyCashView })))
const LiveAuditView = lazy(() => import('./LiveOperationsViews').then(module => ({ default: module.LiveAuditView })))

const liveDestinationPaths: Record<LiveDestination, string> = {
  access: '/access',
  projects: '/projects',
  requisitions: '/requisitions',
  sourcing: '/sourcing',
  suppliers: '/suppliers',
  'purchase-orders': '/purchase-orders',
  inventory: '/inventory',
  finance: '/finance',
  audit: '/audit',
}

type IconName =
  | 'grid' | 'building' | 'cart' | 'boxes' | 'wallet' | 'users' | 'tool'
  | 'shield' | 'settings' | 'search' | 'bell' | 'chevron' | 'arrow'
  | 'plus' | 'clock' | 'check' | 'alert' | 'more' | 'filter' | 'download'
  | 'truck' | 'file' | 'close' | 'menu' | 'trend' | 'pin' | 'calendar'
  | 'swap' | 'eye' | 'lock' | 'receipt'

type DemoRole = ConstructionRole
type ProjectName = string

type DemoProfile = {
  id: string
  role: DemoRole
  name: string
  initials: string
  workspace: string
  subtitle: string
  description: string
  projects: readonly ProjectName[] | null
}

type PaymentCandidate = {
  reference: string
  supplier: string
  invoice: string
  project: string
  amount: string
  method: string
}

const demoProfiles: readonly DemoProfile[] = [
  { id: 'ceo', role: 'CEO', name: 'JOSEPHINE CHARLES', initials: 'JC', workspace: 'Executive workspace', subtitle: 'CEO', description: 'All projects · executive oversight', projects: null },
  { id: 'supervisor-gilgal', role: 'Supervisor', name: 'GILGAL SITES SUPERVISOR', initials: 'S1', workspace: 'Gilgal 2 & 3 operations', subtitle: 'Supervisor', description: 'Gilgal 2 & Gilgal 3', projects: ['Gilgal 2', 'Gilgal 3'] },
  { id: 'supervisor-church-hq', role: 'Supervisor', name: 'CHURCH & SNEP SUPERVISOR', initials: 'S2', workspace: 'Church & SNEP HQ operations', subtitle: 'Supervisor', description: 'Church & SNEP HQ', projects: ['Church', 'SNEP HQ'] },
  { id: 'engineer-gilgal', role: 'Engineer', name: 'GILGAL SITES ENGINEER', initials: 'E1', workspace: 'Gilgal 2 & 3 technical', subtitle: 'Engineer', description: 'Gilgal 2 & Gilgal 3', projects: ['Gilgal 2', 'Gilgal 3'] },
  { id: 'engineer-church-hq', role: 'Engineer', name: 'CHURCH & SNEP ENGINEER', initials: 'E2', workspace: 'Church & SNEP HQ technical', subtitle: 'Engineer', description: 'Church & SNEP HQ', projects: ['Church', 'SNEP HQ'] },
  { id: 'foreman-gilgal', role: 'Foreman', name: 'GILGAL SITES FOREMAN', initials: 'F1', workspace: 'Gilgal 2 & 3 field work', subtitle: 'Foreman', description: 'Gilgal 2 & Gilgal 3', projects: ['Gilgal 2', 'Gilgal 3'] },
  { id: 'foreman-church-hq', role: 'Foreman', name: 'CHURCH & SNEP FOREMAN', initials: 'F2', workspace: 'Church & SNEP HQ field work', subtitle: 'Foreman', description: 'Church & SNEP HQ', projects: ['Church', 'SNEP HQ'] },
  { id: 'cashier', role: 'Cashier', name: 'EUNICE NGUMBI', initials: 'EN', workspace: 'Payments workspace', subtitle: 'Cashier', description: 'Payments and accountable cash', projects: null },
  { id: 'storekeeper', role: 'Storekeeper', name: 'LUCY NJERI', initials: 'LN', workspace: 'Stores workspace', subtitle: 'Storekeeper', description: 'Stock and material movement', projects: null },
  { id: 'procurement', role: 'Procurement Officer', name: 'PAUL KIMANI', initials: 'PK', workspace: 'Procurement workspace', subtitle: 'Procurement Officer', description: 'Sourcing and purchase orders', projects: null },
  { id: 'finance', role: 'Finance Officer', name: 'JAMES KAMAU', initials: 'JK', workspace: 'Financial control workspace', subtitle: 'Finance Officer', description: 'Matching and payment control', projects: null },
  { id: 'auditor', role: 'Auditor', name: 'MARY ATIENZA', initials: 'MA', workspace: 'Read-only audit workspace', subtitle: 'Auditor', description: 'All projects · independent review', projects: null },
]

const allProjectNames: readonly ProjectName[] = ['Gilgal 2', 'Gilgal 3', 'SNEP HQ', 'Church']

function projectScopeLabel(projectScope: readonly ProjectName[]) {
  return projectScope.join(' & ')
}

function demoEmail(name: string) {
  const localPart = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
  return `${localPart}@snep.co.ke`
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
  { name: 'Gilgal 2', location: 'Sweet-Waters, Machakos', supervisor: 'Gilgal Sites Supervisor', budget: 48.2, spent: 31.4, committed: 5.7, progress: 68, status: 'On track', code: 'G2', color: '#1c5d52' },
  { name: 'Gilgal 3', location: 'Sweet-Waters, Machakos', supervisor: 'Gilgal Sites Supervisor', budget: 36.5, spent: 28.9, committed: 3.2, progress: 74, status: 'At risk', code: 'G3', color: '#bc6a35' },
  { name: 'SNEP HQ', location: 'Mumbuni, Machakos', supervisor: 'Church & SNEP Supervisor', budget: 72.0, spent: 20.6, committed: 9.8, progress: 39, status: 'On track', code: 'HQ', color: '#3d5b86' },
  { name: 'Church', location: 'Vota, Machakos', supervisor: 'Church & SNEP Supervisor', budget: 25.8, spent: 8.3, committed: 2.1, progress: 31, status: 'On track', code: 'CH', color: '#765b8e' },
]

type StoreStockRecord = {
  material: string
  category: string
  project: ProjectName
  store: string
  unit: string
  onHand: string
  reorderAt: string
  level: 'Healthy' | 'Low stock' | 'Watch'
}

type StoreTransferRecord = {
  reference: string
  fromProject: ProjectName
  toProject: ProjectName
  material: string
  quantity: string
  status: 'Awaiting receipt' | 'In transit' | 'Ready to dispatch'
  age: string
}

type SiteTeamMaterialRecord = {
  material: string
  project: ProjectName
  quantity: string
  holder: string
}

type MaterialTraceStep = {
  title: string
  actor: string
  role: string
  quantity: string
  date: string
  reference: string
  note?: string
}

type MaterialTraceBranch = {
  id: string
  project: ProjectName
  purpose: string
  requested: number
  released: number
  used: number
  remaining: number
  steps: readonly MaterialTraceStep[]
}

const storeStockRecords: readonly StoreStockRecord[] = [
  { material: 'River sand', category: 'Aggregates', project: 'Gilgal 2', store: 'Gilgal 2 store', unit: 'tonnes', onHand: '42.5', reorderAt: '18', level: 'Healthy' },
  { material: 'Y12 reinforcement steel', category: 'Steel', project: 'Gilgal 3', store: 'Gilgal 3 store', unit: 'lengths', onHand: '186', reorderAt: '220', level: 'Low stock' },
  { material: 'Bamburi cement', category: 'Cement', project: 'SNEP HQ', store: 'Central store · SNEP HQ', unit: 'bags', onHand: '1,248', reorderAt: '320', level: 'Healthy' },
  { material: 'PVC conduit 25mm', category: 'Electrical', project: 'SNEP HQ', store: 'Central store · SNEP HQ', unit: 'lengths', onHand: '64', reorderAt: '100', level: 'Low stock' },
  { material: 'Marine plywood 18mm', category: 'Formwork', project: 'Church', store: 'Church store', unit: 'sheets', onHand: '38', reorderAt: '30', level: 'Watch' },
]

const storeTransferRecords: readonly StoreTransferRecord[] = [
  { reference: 'TR-0063', fromProject: 'Gilgal 2', toProject: 'Church', material: 'Timber', quantity: '32 pieces', status: 'Awaiting receipt', age: '3 days overdue' },
  { reference: 'TR-0065', fromProject: 'SNEP HQ', toProject: 'Gilgal 3', material: 'PVC conduit', quantity: '40 lengths', status: 'In transit', age: '4 hours' },
  { reference: 'TR-0066', fromProject: 'Church', toProject: 'Gilgal 2', material: 'Binding wire', quantity: '6 rolls', status: 'Ready to dispatch', age: 'Not dispatched' },
]

const siteTeamMaterialRecords: readonly SiteTeamMaterialRecord[] = [
  { material: 'Y12 reinforcement steel', project: 'Gilgal 3', quantity: '38 lengths', holder: 'Gilgal Sites Foreman' },
  { material: 'Bamburi cement', project: 'SNEP HQ', quantity: '124 bags', holder: 'Church & SNEP Foreman' },
  { material: 'Marine plywood 18mm', project: 'Church', quantity: '18 sheets', holder: 'Church & SNEP Foreman' },
]

const cementMaterialTrace = {
  material: 'Bamburi cement',
  batch: 'Cement delivery · July 2026',
  source: 'Central store · SNEP HQ',
  supplier: 'Bamburi Cement PLC',
  received: 2000,
  inStore: 1248,
  withForeman: 124,
  used: 628,
  entry: [
    { title: 'Approved site needs were combined', actor: 'Foremen requested · Both supervisors approved', role: 'Request and approval', quantity: '2,000 bags including store reserve', date: '11 Jul, 15:40', reference: 'REQ-0108' },
    { title: 'Procurement ordered the cement', actor: 'Paul Kimani', role: 'Procurement Officer', quantity: '2,000 bags', date: '12 Jul, 10:20', reference: 'PO-0149' },
    { title: 'Storekeeper counted all bags', actor: 'Lucy Njeri', role: 'Storekeeper', quantity: '2,000 bags received', date: '15 Jul, 08:42', reference: 'GRN-0098' },
  ] as const,
  branches: [
    {
      id: 'snep-hq', project: 'SNEP HQ', purpose: 'Ground-floor masonry', requested: 180, released: 180, used: 56, remaining: 124,
      steps: [
        { title: 'Foreman requested cement', actor: 'Daniel Otieno', role: 'Foreman', quantity: '180 bags requested', date: '16 Jul, 08:16', reference: 'MR-0207' },
        { title: 'Engineer checked the quantity', actor: 'Church & SNEP Engineer', role: 'Technical check', quantity: '180 bags confirmed', date: '16 Jul, 09:05', reference: 'TEC-0102', note: 'Checked because this was a structural-work request.' },
        { title: 'Supervisor approved release', actor: 'Church & SNEP Supervisor', role: 'Supervisor', quantity: '180 bags approved', date: '16 Jul, 09:22', reference: 'APR-0361' },
        { title: 'Central store released the bags', actor: 'Lucy Njeri', role: 'Storekeeper', quantity: '180 bags issued to the SNEP HQ team', date: '16 Jul, 10:10', reference: 'MIV-0069' },
        { title: 'Foreman counted and confirmed', actor: 'Daniel Otieno', role: 'Foreman', quantity: '180 bags received', date: '16 Jul, 10:26', reference: 'ACK-0069' },
        { title: 'Use was recorded', actor: 'Daniel Otieno', role: 'Foreman', quantity: '56 used · 124 still held', date: '25 Jul, 16:40', reference: 'USE-0148' },
      ],
    },
    {
      id: 'gilgal-2', project: 'Gilgal 2', purpose: 'Roof ring-beam concrete', requested: 340, released: 320, used: 320, remaining: 0,
      steps: [
        { title: 'Foreman requested cement', actor: 'Samuel Kariuki', role: 'Foreman', quantity: '340 bags requested', date: '17 Jul, 07:48', reference: 'MR-0208' },
        { title: 'Engineer checked the quantity', actor: 'Gilgal Sites Engineer', role: 'Technical check', quantity: '320 bags confirmed', date: '17 Jul, 08:35', reference: 'TEC-0103', note: 'The technical check reduced the request by 20 bags.' },
        { title: 'Supervisor approved release', actor: 'Gilgal Sites Supervisor', role: 'Supervisor', quantity: '320 bags approved', date: '17 Jul, 09:02', reference: 'APR-0362' },
        { title: 'Central store dispatched the bags', actor: 'Lucy Njeri', role: 'Storekeeper', quantity: '320 bags sent directly to the Gilgal 2 team', date: '17 Jul, 10:18', reference: 'MIV-0070' },
        { title: 'Foreman counted and confirmed', actor: 'Samuel Kariuki', role: 'Foreman', quantity: '320 bags received', date: '17 Jul, 12:06', reference: 'ACK-0070' },
        { title: 'Use was recorded', actor: 'Samuel Kariuki', role: 'Foreman', quantity: '320 used · 0 remaining', date: '24 Jul, 17:12', reference: 'USE-0149' },
      ],
    },
    {
      id: 'church', project: 'Church', purpose: 'Column and foundation concrete', requested: 260, released: 252, used: 252, remaining: 0,
      steps: [
        { title: 'Foreman requested cement', actor: 'Daniel Otieno', role: 'Foreman', quantity: '260 bags requested', date: '18 Jul, 08:04', reference: 'MR-0209' },
        { title: 'Engineer checked the quantity', actor: 'Church & SNEP Engineer', role: 'Technical check', quantity: '252 bags confirmed', date: '18 Jul, 08:44', reference: 'TEC-0104', note: 'The technical check reduced the request by 8 bags.' },
        { title: 'Supervisor approved release', actor: 'Church & SNEP Supervisor', role: 'Supervisor', quantity: '252 bags approved', date: '18 Jul, 09:10', reference: 'APR-0363' },
        { title: 'Central store dispatched the bags', actor: 'Lucy Njeri', role: 'Storekeeper', quantity: '252 bags sent directly to the Church team', date: '18 Jul, 10:32', reference: 'MIV-0071' },
        { title: 'Foreman counted and confirmed', actor: 'Daniel Otieno', role: 'Foreman', quantity: '252 bags received', date: '18 Jul, 12:14', reference: 'ACK-0071' },
        { title: 'Use was recorded', actor: 'Daniel Otieno', role: 'Foreman', quantity: '252 used · 0 remaining', date: '25 Jul, 16:18', reference: 'USE-0150' },
      ],
    },
  ] as readonly MaterialTraceBranch[],
} as const

const requisitions = [
  { id: 'MR-0248', item: 'Y12 reinforcement steel', qty: '240 lengths', site: 'Gilgal 3', requester: 'Samuel K.', date: 'Today, 09:42', value: 'KES 412,800', status: 'Needs approval', risk: 'Price +8.4%' },
  { id: 'MR-0247', item: 'Bamburi cement', qty: '180 bags', site: 'SNEP HQ', requester: 'Daniel O.', date: 'Today, 08:16', value: 'KES 171,000', status: 'Needs approval', risk: '' },
  { id: 'MR-0246', item: 'Machine-cut stones', qty: '1,200 pcs', site: 'Church', requester: 'John M.', date: 'Yesterday, 16:25', value: 'KES 84,000', status: 'PO created', risk: '' },
  { id: 'MR-0245', item: 'River sand', qty: '18 tonnes', site: 'Gilgal 2', requester: 'Joseph N.', date: 'Yesterday, 11:40', value: 'KES 63,000', status: 'Approved', risk: '' },
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
  Administrator: ['/', '/settings'],
  CEO: ['/', '/projects', '/procurement', '/inventory', '/finance', '/workforce', '/equipment', '/audit'],
  Supervisor: ['/', '/projects', '/procurement', '/inventory', '/finance', '/workforce', '/equipment'],
  Engineer: ['/', '/projects', '/quality', '/drawings'],
  Foreman: ['/', '/procurement', '/inventory', '/workforce', '/equipment'],
  Cashier: ['/', '/finance'],
  Storekeeper: ['/', '/inventory', '/receiving', '/issues', '/transfers', '/stock-counts'],
  'Procurement Officer': ['/', '/procurement', '/purchase-orders', '/suppliers'],
  'Finance Officer': ['/', '/finance', '/finance-matching', '/finance-approvals', '/finance-reconciliation'],
  Auditor: ['/', '/audit', '/audit-samples', '/audit-reports'],
}

const fieldRoleNav: Partial<Record<DemoRole, typeof nav>> = {
  CEO: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/projects', label: 'Projects', icon: 'building' },
    { to: '/finance', label: 'Money', icon: 'wallet' },
    { to: '/inventory', label: 'Stock & movement', icon: 'boxes' },
    { to: '/audit', label: 'Records', icon: 'shield' },
  ],
  Supervisor: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/projects', label: 'Projects', icon: 'building' },
    { to: '/procurement', label: 'Material approvals', icon: 'cart', badge: 2 },
    { to: '/inventory', label: 'Materials', icon: 'boxes', badge: 1 },
    { to: '/finance', label: 'Budget', icon: 'wallet' },
    { to: '/workforce', label: 'Site reports', icon: 'users' },
  ],
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

type ShellProps = {
  authenticatedUser?: CurrentUser
  onLogout?: () => Promise<void> | void
  onSwitchRole?: (role: ConstructionRole) => Promise<void>
  onUsernameChanged?: () => void
  onPasswordChanged?: () => void
}

const liveRoleNavigation: Record<ConstructionRole, readonly { to: string; label: string; icon: IconName; badge?: number }[]> = {
  Administrator: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/access', label: 'Requests & access', icon: 'users' },
  ],
  CEO: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/projects', label: 'Projects', icon: 'building' },
    { to: '/requisitions', label: 'Material requests', icon: 'cart' },
    { to: '/sourcing', label: 'Supplier sourcing', icon: 'users' },
    { to: '/suppliers', label: 'Supplier register', icon: 'users' },
    { to: '/purchase-orders', label: 'Purchase orders', icon: 'file' },
    { to: '/inventory', label: 'Stock & movement', icon: 'boxes' },
    { to: '/finance', label: 'Money path', icon: 'wallet' },
    { to: '/petty-cash', label: 'Petty cash', icon: 'receipt' },
    { to: '/audit', label: 'Complete chain', icon: 'shield' },
  ],
  Supervisor: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/projects', label: 'Projects', icon: 'building' },
    { to: '/requisitions', label: 'Material approvals', icon: 'cart' },
    { to: '/sourcing', label: 'Sourcing exceptions', icon: 'users' },
    { to: '/purchase-orders', label: 'Purchase orders', icon: 'file' },
    { to: '/inventory', label: 'Stock controls', icon: 'boxes' },
    { to: '/petty-cash', label: 'Petty cash', icon: 'wallet' },
  ],
  Engineer: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/projects', label: 'Project progress', icon: 'building' },
    { to: '/requisitions', label: 'Technical checks', icon: 'check' },
  ],
  Foreman: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/requisitions', label: 'My material requests', icon: 'cart' },
    { to: '/inventory', label: 'Materials with me', icon: 'boxes' },
  ],
  Cashier: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/finance', label: 'Approved payments', icon: 'wallet' },
    { to: '/petty-cash', label: 'Petty cash', icon: 'receipt' },
  ],
  Storekeeper: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/purchase-orders', label: 'Issued orders', icon: 'truck' },
    { to: '/inventory', label: 'Receive & control stock', icon: 'boxes' },
  ],
  'Procurement Officer': [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/sourcing', label: 'Sourcing', icon: 'cart' },
    { to: '/purchase-orders', label: 'Purchase orders', icon: 'file' },
    { to: '/suppliers', label: 'Supplier onboarding', icon: 'users' },
    { to: '/finance', label: 'Supplier invoices', icon: 'receipt' },
  ],
  'Finance Officer': [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/projects', label: 'Project budgets', icon: 'wallet' },
    { to: '/purchase-orders', label: 'Purchase orders', icon: 'file' },
    { to: '/suppliers', label: 'Supplier approvals', icon: 'users' },
    { to: '/finance', label: 'Match & authorize', icon: 'check' },
    { to: '/inventory', label: 'GRNs & stock', icon: 'boxes' },
    { to: '/petty-cash', label: 'Petty cash control', icon: 'receipt' },
  ],
  Auditor: [
    { to: '/', label: 'Overview', icon: 'grid' },
    { to: '/projects', label: 'Projects', icon: 'building' },
    { to: '/requisitions', label: 'Request trail', icon: 'shield' },
    { to: '/sourcing', label: 'Sourcing trail', icon: 'users' },
    { to: '/suppliers', label: 'Supplier register', icon: 'users' },
    { to: '/purchase-orders', label: 'Order trail', icon: 'file' },
    { to: '/inventory', label: 'Material trail', icon: 'boxes' },
    { to: '/finance', label: 'Payment trail', icon: 'wallet' },
    { to: '/petty-cash', label: 'Petty cash trail', icon: 'receipt' },
    { to: '/audit', label: 'Complete chain', icon: 'shield' },
  ],
}

function UsernameChangeModal({ currentUsername, onClose, onChanged }: {
  currentUsername: string
  onClose: () => void
  onChanged: () => void
}) {
  const [newUsername, setNewUsername] = useState(currentUsername)
  const [currentPassword, setCurrentPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const username = newUsername.trim().toLowerCase()
    if (username === currentUsername.toLowerCase()) {
      setError('Enter a different username.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await authApi.changeUsername({ newUsername: username, currentPassword })
      onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The username could not be changed.')
      setBusy(false)
    }
  }

  return <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="change-username-title">
    <button type="button" className="modal-backdrop" aria-label="Close username form" onClick={onClose}/>
    <form className="modal account-password-modal" onSubmit={event => void submit(event)}>
      <header className="modal-head">
        <div><span className="eyebrow">ACCOUNT</span><h2 id="change-username-title">Change username</h2></div>
        <button type="button" onClick={onClose} aria-label="Close username form"><Icon name="close" size={17}/></button>
      </header>
      <div className="form-grid">
        <label className="full">New username<input autoComplete="username" required minLength={3} maxLength={50} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,49}" title="Use letters, numbers, dots, underscores or hyphens." value={newUsername} onChange={event => setNewUsername(event.target.value)}/></label>
        <label className="full">Current password<input type="password" autoComplete="current-password" required maxLength={72} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/></label>
        {error && <p className="account-password-error" role="alert">{error}</p>}
      </div>
      <footer className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <button className="button primary" disabled={busy}>{busy ? 'Changing…' : 'Change username'}</button>
      </footer>
    </form>
  </div>
}

function PasswordChangeModal({ onClose, onChanged }: {
  onClose: () => void
  onChanged: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword })
      onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The password could not be changed.')
      setBusy(false)
    }
  }

  return <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
    <button type="button" className="modal-backdrop" aria-label="Close password form" onClick={onClose}/>
    <form className="modal account-password-modal" onSubmit={event => void submit(event)}>
      <header className="modal-head">
        <div><span className="eyebrow">ACCOUNT SECURITY</span><h2 id="change-password-title">Change password</h2></div>
        <button type="button" onClick={onClose} aria-label="Close password form"><Icon name="close" size={17}/></button>
      </header>
      <div className="form-grid">
        <label className="full">Current password<input type="password" autoComplete="current-password" required maxLength={72} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/></label>
        <label className="full">New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={newPassword} onChange={event => setNewPassword(event.target.value)}/></label>
        <label className="full">Confirm new password<input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmNewPassword} onChange={event => setConfirmNewPassword(event.target.value)}/></label>
        {error && <p className="account-password-error" role="alert">{error}</p>}
      </div>
      <footer className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <button className="button primary" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button>
      </footer>
    </form>
  </div>
}

function Shell({ authenticatedUser, onLogout, onSwitchRole, onUsernameChanged, onPasswordChanged }: ShellProps = {}) {
  const [navOpen, setNavOpen] = useState(false)
  const [site, setSite] = useState('All projects')
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [switchingRole, setSwitchingRole] = useState<ConstructionRole | null>(null)
  const [roleSwitchError, setRoleSwitchError] = useState<string | null>(null)
  const [usernameModalOpen, setUsernameModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState('ceo')
  const location = useLocation()
  const navigate = useNavigate()
  const liveMode = Boolean(authenticatedUser)
  const assignedProjectNames = authenticatedUser?.projects.map(project => project.name) ?? []
  const liveInitials = authenticatedUser?.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U'
  const profile: DemoProfile = authenticatedUser
    ? {
        id: String(authenticatedUser.id),
        role: authenticatedUser.role,
        name: authenticatedUser.fullName,
        initials: liveInitials,
        workspace: `${authenticatedUser.role} workspace`,
        subtitle: authenticatedUser.role,
        description: assignedProjectNames.length > 0 ? projectScopeLabel(assignedProjectNames) : 'Organisation access',
        projects: assignedProjectNames.length > 0 ? assignedProjectNames : null,
      }
    : demoProfiles.find(candidate => candidate.id === activeProfileId) ?? demoProfiles[0]
  const role = profile.role
  const availableProjects = profile.projects ?? allProjectNames
  const aggregateSiteLabel = profile.projects ? 'Assigned projects' : 'All projects'
  const projectScope = site === aggregateSiteLabel || !availableProjects.includes(site as ProjectName)
    ? [...availableProjects]
    : [site as ProjectName]
  const scopeLabel = projectScopeLabel(projectScope)
  const standardNav = nav.filter(item => roleNavigation[role].includes(item.to)).map(item => ({
    ...item,
    label: role === 'Cashier' && item.to === '/finance'
      ? 'Payments & cash'
      : role === 'Supervisor' && item.to === '/finance'
        ? 'Budget tracking'
        : item.label,
  }))
  const visibleNav = liveMode ? liveRoleNavigation[role] : fieldRoleNav[role] ?? standardNav
  const roleHomeTitles: Record<DemoRole, [string, string]> = {
    Administrator: ['Administrator', 'Join requests, roles and project access'],
    CEO: ['Overview', ''],
    Supervisor: ['Supervisor overview', `Projects and actions across ${scopeLabel}`],
    Engineer: ['Technical overview', `Progress, quality and compliance across ${scopeLabel}`],
    Foreman: [`Today · ${scopeLabel}`, 'Work and material records'],
    Cashier: ['Payments', 'Approved payments ready to execute'],
    Storekeeper: ['Stores overview', 'Deliveries, issues and stock custody requiring action'],
    'Procurement Officer': ['Procurement overview', 'Source approved needs and control purchase orders'],
    'Finance Officer': ['Financial control', 'Match evidence, authorise payments and protect project budgets'],
    Auditor: ['Audit overview', 'Read-only control assurance across every project'],
  }
  const titles: Record<string, [string, string]> = {
    '/': roleHomeTitles[role],
    '/projects': role === 'CEO' ? ['Projects', ''] : role === 'Engineer' ? ['Progress & milestones', 'Verified construction progress across active sites'] : ['Projects', 'Portfolio health and site delivery'],
    '/procurement': role === 'Foreman' ? ['My material requests', 'Request what the site needs and follow its approval'] : role === 'Supervisor' ? ['Material approvals', 'Approve or return requests raised by your foremen'] : role === 'Procurement Officer' ? ['Approved sourcing queue', 'Source approved demand without changing it'] : ['Procurement', 'Requisitions, approvals and purchase orders'],
    '/requisitions': role === 'Foreman' ? ['My material requests', 'Request what the site needs and follow its approval'] : role === 'Engineer' ? ['Technical checks', 'Verify the site need before a supervisor decides'] : role === 'Supervisor' ? ['Material approvals', 'Decide only after an engineer has checked the request'] : ['Material requests', ''],
    '/sourcing': ['Supplier sourcing', 'Quotes and supplier selection for approved material needs'],
    '/access': ['Requests & access', 'Approve people, select roles and assign projects'],
    '/inventory': role === 'CEO' ? ['Stock & movement', ''] : role === 'Foreman' ? ['Materials on site', 'Confirm receipt, record use and report wastage'] : role === 'Storekeeper' ? ['Stock ledger', ''] : ['Inventory', 'Stock levels and material movement'],
    '/finance': role === 'Cashier'
      ? ['Payments & cash', 'Execute approved payments and reconcile site floats']
      : role === 'Supervisor'
        ? ['Budget tracking', 'Read-only cost position across projects']
        : role === 'Finance Officer'
          ? ['Budgets & payables', 'Control commitments, invoices and available project funds']
        : role === 'CEO'
          ? ['Money', '']
          : ['Finance', 'Budget, commitments and payments'],
    '/workforce': role === 'Foreman' ? ['Daily site log', `People, work completed and blockers across ${scopeLabel}`] : ['Workforce', 'Attendance, labour and subcontractors'],
    '/equipment': role === 'Foreman' ? ['Tools issued to me', `Custody and condition across ${scopeLabel}`] : ['Equipment', 'Assignments, condition and rental costs'],
    '/quality': ['Quality inspections', 'Technical checks, defects and corrective work'],
    '/drawings': ['Drawings & documents', 'Current approved information for construction'],
    '/receiving': ['Receive deliveries', 'Record actual quantities and condition against approved orders'],
    '/issues': ['Issue materials', 'Release stock only against approved site requests'],
    '/transfers': ['Site transfers', 'Dual-confirmed movement between project stores'],
    '/stock-counts': ['Stock counts', 'Physical counts and accountable variance records'],
    '/purchase-orders': ['Purchase orders', ''],
    '/suppliers': ['Suppliers & quotations', ''],
    '/finance-matching': ['Three-way matching', 'Compare purchase orders, physical receipts and supplier invoices'],
    '/finance-approvals': ['Payment authorisation', 'Release only fully supported invoices to the Cashier'],
    '/finance-reconciliation': ['Reconciliation', 'Prove that ledgers, statements and project cash agree'],
    '/petty-cash': ['Petty cash', ''],
    '/audit-samples': ['Evidence review', 'Trace selected transactions from request to final movement'],
    '/audit-reports': ['Reports & exports', 'Independent read-only audit outputs'],
    '/audit': role === 'CEO' ? ['Records', ''] : ['Audit & controls', 'Exceptions, compliance and activity'],
    '/settings': ['Settings', 'People, roles and control configuration'],
  }
  const [title, subtitle] = titles[location.pathname] || titles['/']
  const switchProfile = (nextProfile: DemoProfile) => {
    setActiveProfileId(nextProfile.id)
    setRoleMenuOpen(false)
    setSite(nextProfile.projects ? 'Assigned projects' : 'All projects')
    navigate('/')
  }
  const switchLiveRole = async (nextRole: ConstructionRole) => {
    if (!onSwitchRole || nextRole === authenticatedUser?.role) {
      setRoleMenuOpen(false)
      return
    }

    setSwitchingRole(nextRole)
    setRoleSwitchError(null)
    try {
      await onSwitchRole(nextRole)
      setSite(nextRole === 'CEO' || nextRole === 'Auditor' ? 'All projects' : 'Assigned projects')
      setRoleMenuOpen(false)
      navigate('/')
    } catch (error) {
      setRoleSwitchError(error instanceof Error ? error.message : 'The workspace could not be changed.')
    } finally {
      setSwitchingRole(null)
    }
  }
  const canAccess = (path: string) => liveMode
    ? liveRoleNavigation[role].some(item => item.to === path)
    : roleNavigation[role].includes(path)

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
        {!liveMode && role === 'CEO' && <NavLink to="/settings"><Icon name="settings"/><span>Settings</span></NavLink>}
        <div className="control-note"><Icon name="lock" size={16}/><div><b>Controls active</b><span>All transactions are logged</span></div></div>
      </div>
    </aside>
    {navOpen && <div className="scrim" onClick={() => setNavOpen(false)}/>}
    <main className={`main ${role === 'CEO' ? 'ceo-shell' : ''}`}>
      <header className="topbar">
        <button className="menu-button" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Icon name="menu"/></button>
        <div className="page-title"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        <div className="top-actions">
          <label className={`site-picker ${profile.projects ? 'assigned-site' : ''}`}><Icon name="building" size={16}/><select value={site} onChange={e => setSite(e.target.value)}><option>{aggregateSiteLabel}</option>{liveMode ? authenticatedUser?.projects.map(project => <option key={project.id}>{project.name}</option>) : projects.filter(project => availableProjects.includes(project.name as ProjectName)).map(project => <option key={project.name}>{project.name}</option>)}</select><span>{profile.projects ? <Icon name="lock" size={12}/> : '⌄'}</span></label>
          {!liveMode && <button className="icon-button notification" aria-label="Notifications"><Icon name="bell"/><i>5</i></button>}
          <div className="role-switcher">
            <button className="profile" onClick={() => setRoleMenuOpen(!roleMenuOpen)} aria-expanded={roleMenuOpen}>
              <span className="avatar">{profile.initials}</span><div><b>{profile.name}</b><small>{profile.subtitle}{liveMode ? '' : ' · Demo user'}</small></div><span>⌄</span>
            </button>
            {roleMenuOpen && liveMode && <div className="role-menu live-account-menu">
              <div className="role-menu-head"><div><span>{authenticatedUser?.canSwitchRoles ? 'IT VERIFICATION MODE' : 'SIGNED IN'}</span><b>@{authenticatedUser?.username} · {authenticatedUser?.email}</b></div><button onClick={() => setRoleMenuOpen(false)} aria-label="Close account menu"><Icon name="close" size={16}/></button></div>
              {authenticatedUser?.canSwitchRoles && <>
                <div className="live-role-note">Choose a role to inspect its real workspace and permissions.</div>
                <div className="role-menu-list live-role-list">
                  {authenticatedUser.availableRoles.map(option => <button
                    key={option}
                    className={authenticatedUser.role === option ? 'active' : ''}
                    disabled={switchingRole !== null}
                    onClick={() => void switchLiveRole(option)}
                  >
                    <span className="role-dot">{option.split(/\s+/).map(part => part[0]).join('').slice(0, 2)}</span>
                    <span><b>{option}</b><small>{authenticatedUser.role === option ? 'Current workspace' : 'Open workspace'}</small></span>
                    {switchingRole === option ? <em>Opening…</em> : authenticatedUser.role === option && <Icon name="check" size={15}/>}
                  </button>)}
                </div>
                {roleSwitchError && <p className="live-role-error">{roleSwitchError}</p>}
              </>}
              <button className="live-account-action" onClick={() => { setRoleMenuOpen(false); setUsernameModalOpen(true) }}><Icon name="settings" size={15}/>Change username</button>
              <button className="live-account-action" onClick={() => { setRoleMenuOpen(false); setPasswordModalOpen(true) }}><Icon name="settings" size={15}/>Change password</button>
              <button className="live-logout" onClick={() => void onLogout?.()}><Icon name="lock" size={15}/>Sign out</button>
            </div>}
            {roleMenuOpen && !liveMode && <div className="role-menu">
              <div className="role-menu-head"><div><span>DEMO AS A USER</span><b>Choose a workspace</b></div><button onClick={() => setRoleMenuOpen(false)} aria-label="Close role menu"><Icon name="close" size={16}/></button></div>
              <div className="role-menu-list">
                {demoProfiles.map(option => <button
                  key={option.id}
                  className={activeProfileId === option.id ? 'active' : ''}
                  onClick={() => switchProfile(option)}
                >
                  <span className="role-dot">{option.initials}</span>
                  <span><b>{option.role}</b><small>{option.description}</small></span>
                  {activeProfileId === option.id && <Icon name="check" size={15}/>}
                </button>)}
              </div>
              <p><Icon name="lock" size={13}/></p>
            </div>}
          </div>
        </div>
      </header>
      <div className="page-content">
        <Routes>
          {liveMode && <>
            <Route path="/" element={<LiveDashboardView currentUser={authenticatedUser!} onNavigate={destination => navigate(liveDestinationPaths[destination])}/>}/>
            <Route path="/projects" element={canAccess('/projects') ? <LiveProjectsView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/requisitions" element={canAccess('/requisitions') ? <LiveRequisitionsView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/procurement" element={canAccess('/requisitions') ? <LiveRequisitionsView currentUser={authenticatedUser!}/> : canAccess('/sourcing') ? <LiveProcurementView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/sourcing" element={canAccess('/sourcing') ? <LiveProcurementView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/purchase-orders" element={canAccess('/purchase-orders') ? <LivePurchaseOrdersView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/access" element={canAccess('/access') ? <LiveAccessView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/suppliers" element={canAccess('/suppliers') ? <LiveSuppliersView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/inventory" element={canAccess('/inventory') ? <LiveInventoryView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/finance" element={canAccess('/finance') ? <LiveFinanceView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/petty-cash" element={canAccess('/petty-cash') ? <LivePettyCashView currentUser={authenticatedUser!}/> : <AccessRestricted role={role}/>}/>
            <Route path="/audit" element={canAccess('/audit') ? <LiveAuditView/> : <AccessRestricted role={role}/>}/>
            <Route path="*" element={<LiveDashboardView currentUser={authenticatedUser!}/>}/>
          </>}
          {!liveMode && <>
          <Route path="/" element={<RoleDashboard role={role} profile={profile} projectScope={projectScope}/>}/>
          <Route path="/projects" element={canAccess('/projects') ? role === 'Engineer' ? <EngineerProgress projectScope={projectScope}/> : <Projects readOnly={role === 'CEO'} projectScope={projectScope}/> : <AccessRestricted role={role}/>}/>
          <Route path="/procurement" element={canAccess('/procurement') ? role === 'Foreman' ? <ForemanRequests projectScope={projectScope}/> : role === 'Procurement Officer' ? <ProcurementApprovedRequests/> : <Procurement readOnly={role === 'CEO'} projectScope={projectScope}/> : <AccessRestricted role={role}/>}/>
          <Route path="/inventory" element={canAccess('/inventory') ? role === 'Foreman' ? <ForemanMaterials projectScope={projectScope}/> : role === 'Storekeeper' ? <StorekeeperLedger/> : <Inventory readOnly={role === 'CEO' || role === 'Supervisor'} ownerView={role === 'CEO'} projectScope={projectScope}/> : <AccessRestricted role={role}/>}/>
          <Route path="/finance" element={canAccess('/finance') ? role === 'Cashier' ? <CashierFinance/> : role === 'Supervisor' ? <SupervisorBudget projectScope={projectScope}/> : role === 'Finance Officer' ? <FinanceControl/> : <Finance/> : <AccessRestricted role={role}/>}/>
          <Route path="/workforce" element={canAccess('/workforce') ? role === 'Foreman' ? <ForemanDailyLog projectScope={projectScope}/> : <Workforce readOnly={role === 'CEO' || role === 'Supervisor'} projectScope={projectScope}/> : <AccessRestricted role={role}/>}/>
          <Route path="/equipment" element={canAccess('/equipment') ? role === 'Foreman' ? <ForemanTools projectScope={projectScope}/> : <Equipment readOnly={role === 'CEO' || role === 'Supervisor'} projectScope={projectScope}/> : <AccessRestricted role={role}/>}/>
          <Route path="/quality" element={canAccess('/quality') ? <EngineerQuality projectScope={projectScope}/> : <AccessRestricted role={role}/>}/>
          <Route path="/drawings" element={canAccess('/drawings') ? <EngineerDrawings projectScope={projectScope}/> : <AccessRestricted role={role}/>}/>
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
          <Route path="*" element={<RoleDashboard role={role} profile={profile} projectScope={projectScope}/>}/>
          </>}
        </Routes>
      </div>
    </main>
    {usernameModalOpen && authenticatedUser && <UsernameChangeModal
      currentUsername={authenticatedUser.username}
      onClose={() => setUsernameModalOpen(false)}
      onChanged={() => {
        setUsernameModalOpen(false)
        onUsernameChanged?.()
      }}
    />}
    {passwordModalOpen && authenticatedUser && <PasswordChangeModal
      onClose={() => setPasswordModalOpen(false)}
      onChanged={() => {
        setPasswordModalOpen(false)
        onPasswordChanged?.()
      }}
    />}
  </div>
}

function RoleDashboard({ role, profile, projectScope }: { role: DemoRole; profile: DemoProfile; projectScope: ProjectName[] }) {
  if (role === 'Supervisor') return <SupervisorDashboard projectScope={projectScope}/>
  if (role === 'Engineer') return <EngineerDashboard profile={profile} projectScope={projectScope}/>
  if (role === 'Foreman') return <ForemanDashboard profile={profile} projectScope={projectScope}/>
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

function SimpleStat({ label, value, note, tone = 'neutral' }: { label: string; value: string; note?: string; tone?: 'neutral' | 'good' | 'warning' | 'danger' }) {
  return <article className={`simple-stat ${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {note && <small>{note}</small>}
  </article>
}

function Dashboard() {
  const navigate = useNavigate()
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)
  const ownerProjects = projects.map((project, index) => ({
    ...project,
    moneyUsed: Math.round((project.spent / project.budget) * 100),
    ownerStatus: index === 1 ? 'Check spending' : 'Okay',
  }))

  return <div className="ceo-view ceo-overview">
    <section className="simple-summary-grid three ceo-home-summary">
      <SimpleStat label="Projects" value="4" note="1 needs attention" tone="warning"/>
      <SimpleStat label="Money left" value="KES 72.5M" tone="good"/>
      <SimpleStat label="Low in stores" value="2 items" tone="danger"/>
    </section>

    <section className="panel ceo-attention-panel">
      <PanelHead title="Needs your attention" subtitle="2 items"/>
      <div className="simple-action-list ceo-attention-list">
        <article>
          <div className="simple-action-icon danger"><Icon name="alert" size={18}/></div>
          <div><h3>Church roof purchase needs your decision</h3><p>KES 784,500 · Finance checks are complete</p></div>
          <Button variant="secondary" onClick={() => setSelectedChain(transactionChains[2])}>Review</Button>
        </article>
        <article>
          <div className="simple-action-icon warning"><Icon name="wallet" size={18}/></div>
          <div><h3>Gilgal 3 is using money faster than planned</h3><p>Work done 74% · Money used 79%</p></div>
          <Button variant="secondary" onClick={() => navigate('/finance')}>See money</Button>
        </article>
      </div>
    </section>

    <section className="panel ceo-home-projects">
      <PanelHead title="Projects" subtitle="Work done compared with money used" action="See all projects" onClick={() => navigate('/projects')}/>
      <div className="ceo-home-project-list">
        {ownerProjects.map(project => <article className={project.ownerStatus !== 'Okay' ? 'attention' : ''} key={project.name}>
          <div className="simple-project-name"><b style={{background:project.color}}>{project.code}</b><strong>{project.name}</strong></div>
          <div><span>Work done</span><strong>{project.progress}%</strong></div>
          <div><span>Money used</span><strong>{project.moneyUsed}%</strong></div>
          <Status tone={project.ownerStatus === 'Okay' ? 'accepted' : 'at-risk'}>{project.ownerStatus}</Status>
        </article>)}
      </div>
    </section>

    <section className="ceo-home-material-grid">
      <div className="panel">
        <PanelHead title="Inside the stores" subtitle="Still held by the storekeeper" action="See all stores" onClick={() => navigate('/inventory')}/>
        <div className="ceo-stock-preview">
          <article><div><strong>Gilgal 2 store</strong><span>River sand</span></div><b>42.5 tonnes</b><Status tone="accepted">Enough</Status></article>
          <article><div><strong>Gilgal 3 store</strong><span>Y12 steel</span></div><b>186 lengths</b><Status tone="at-risk">Refill soon</Status></article>
          <article><div><strong>SNEP HQ store</strong><span>Cement · 1,248 bags</span></div><b>PVC · 64 lengths</b><Status tone="at-risk">1 low</Status></article>
          <article><div><strong>Church store</strong><span>Marine plywood</span></div><b>38 sheets</b><Status tone="at-risk">Watch</Status></article>
        </div>
      </div>
      <div className="panel">
        <PanelHead title="Materials moving" subtitle="Dispatched from one store to another" action="See all movement" onClick={() => navigate('/inventory')}/>
        <div className="ceo-movement-preview">
          <article><i><Icon name="truck" size={18}/></i><div><strong>Timber · 32 pieces</strong><span>Gilgal 2 store → Church store</span></div><Status tone="at-risk">Arrival late</Status></article>
          <article><i><Icon name="swap" size={18}/></i><div><strong>PVC conduit · 40 lengths</strong><span>SNEP HQ store → Gilgal 3 store</span></div><Status tone="issued">On the way</Status></article>
        </div>
      </div>
    </section>
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="CEO"/>
  </div>
}

function SupervisorDashboard({ projectScope }: { projectScope: ProjectName[] }) {
  const navigate = useNavigate()
  const milestones = [
    { project: 'Gilgal 2', code: 'G2', progress: 68, money: 65, next: 'Roof ring beam', date: '31 Jul', tone: '#1c5d52', status: 'On schedule' },
    { project: 'Gilgal 3', code: 'G3', progress: 74, money: 79, next: 'First-floor slab', date: '28 Jul', tone: '#bc6a35', status: 'Watch budget' },
    { project: 'SNEP HQ', code: 'HQ', progress: 39, money: 29, next: 'Ground floor walls', date: '04 Aug', tone: '#3d5b86', status: 'On schedule' },
    { project: 'Church', code: 'CH', progress: 31, money: 32, next: 'Column casting', date: '02 Aug', tone: '#765b8e', status: 'On schedule' },
  ].filter(project => projectScope.includes(project.project as ProjectName))
  const priorities = [
    { project: 'Gilgal 2', kind: 'PROGRAMME', title: 'Confirm roof ring-beam readiness', copy: 'The next milestone is due on 31 July.', action: 'Open project', route: '/projects' },
    { project: 'Gilgal 3', kind: 'BUDGET', title: 'Check the remaining structural budget', copy: 'Approved orders are growing faster than site progress.', action: 'See budget position', route: '/finance' },
    { project: 'SNEP HQ', kind: 'DELIVERY', title: 'Decide on a short cement delivery', copy: '40 bags were not delivered; the storekeeper recorded the evidence.', action: 'Review the issue', route: '/inventory' },
    { project: 'Church', kind: 'APPROVAL', title: 'Review the column-work request', copy: 'The site needs approval before the next activity is committed.', action: 'Review request', route: '/procurement' },
  ].filter(item => projectScope.includes(item.project as ProjectName))
  const scope = projectScopeLabel(projectScope)
  return <div className="simple-dashboard">
    <section className="simple-role-header">
      <div><span>SUPERVISOR</span><h2>{scope}</h2><p>Project progress and work that needs your action.</p></div>
      <Button icon="check" onClick={() => navigate('/procurement')}>Review material requests</Button>
    </section>

    <section className="simple-summary-grid three">
      <SimpleStat label="Actions waiting" value={`${priorities.length}`} tone={priorities.length ? 'warning' : 'good'}/>
      <SimpleStat label="Budget issues" value={`${priorities.filter(item => item.kind === 'BUDGET').length}`} tone={priorities.some(item => item.kind === 'BUDGET') ? 'danger' : 'good'}/>
      <SimpleStat label="Material issues" value={`${priorities.filter(item => item.kind === 'DELIVERY').length}`} tone={priorities.some(item => item.kind === 'DELIVERY') ? 'danger' : 'good'}/>
    </section>

    <section className="simple-two-column supervisor-simple-grid">
      <div className="panel">
        <PanelHead title="Your projects" subtitle="Built, paid and next milestone" action="Open projects" onClick={() => navigate('/projects')}/>
        <div className="simple-project-list supervisor-simple-projects">
          {milestones.map(project => <article key={project.project}>
            <div className="simple-project-name"><b style={{background:project.tone}}>{project.code}</b><strong>{project.project}</strong></div>
            <div className="simple-value"><span>Built</span><strong>{project.progress}%</strong></div>
            <div className="simple-value"><span>Paid</span><strong>{project.money}%</strong></div>
            <div className="simple-value wide"><span>Next</span><strong>{project.next}</strong><small>Due {project.date}</small></div>
            <Status tone={project.status === 'Watch budget' ? 'at-risk' : 'accepted'}>{project.status}</Status>
          </article>)}
        </div>
      </div>
      <aside className="panel">
        <PanelHead title="Needs action" subtitle={`${priorities.length} items`}/>
        <div className="simple-action-list supervisor-simple-actions">
          {priorities.map(item => <article key={`${item.project}-${item.kind}`}>
            <div className={`simple-action-icon ${item.kind === 'BUDGET' || item.kind === 'DELIVERY' ? 'warning' : ''}`}><Icon name={item.kind === 'DELIVERY' ? 'truck' : item.kind === 'BUDGET' ? 'wallet' : item.kind === 'APPROVAL' ? 'check' : 'calendar'} size={17}/></div>
            <div><span>{item.project.toUpperCase()} · {item.kind}</span><h3>{item.title}</h3><p>{item.copy}</p></div>
            <Button variant="secondary" onClick={() => navigate(item.route)}>{item.action}</Button>
          </article>)}
        </div>
      </aside>
    </section>
  </div>
}

function EngineerDashboard({ profile, projectScope }: { profile: DemoProfile; projectScope: ProjectName[] }) {
  const navigate = useNavigate()
  const sites = [
    ['Gilgal 2','68%','67%','Roof ring beam','On track'],
    ['Gilgal 3','74%','71%','First-floor slab','Verification due'],
    ['SNEP HQ','39%','39%','Ground-floor masonry','On track'],
    ['Church','31%','28%','Column casting','Inspection due'],
  ].filter(site => projectScope.includes(site[0] as ProjectName))
  const actions = [
    ['Gilgal 2','PROGRESS','Verify roof ring-beam completion','The field report is ready for measurement.','/projects'],
    ['Gilgal 3','BEFORE CONCRETE','Inspect first-floor slab reinforcement','Pour is planned for Monday at 07:00.','/quality'],
    ['Church','PROGRESS','Verify column-work progress','Reported progress is ahead of the last verified value.','/projects'],
    ['SNEP HQ','DRAWING','Issue revised electrical layout','Revision C is reviewed and ready for construction.','/drawings'],
  ].filter(action => projectScope.includes(action[0] as ProjectName))
  const inspections = [
    ['INS-0184','Gilgal 2','Roof ring-beam formwork','Passed','Today, 08:20'],
    ['INS-0183','SNEP HQ','Blockwork line and level','Passed with note','Yesterday, 15:10'],
    ['INS-0182','Church','Column starter bars','Correction required','Yesterday, 11:35'],
    ['INS-0181','Gilgal 3','Slab reinforcement','Verification due','Yesterday, 09:10'],
  ].filter(row => projectScope.includes(row[1] as ProjectName))
  const scope = projectScopeLabel(projectScope)
  return <>
    <section className="role-welcome engineer-welcome"><div><span>ENGINEER WORKSPACE</span><h2>{scope}</h2><p>{profile.projects ? 'Technical records are limited to your two assigned projects.' : 'Technical actions requiring attention.'}</p></div><Button icon="plus" onClick={()=>navigate('/quality')}>Record inspection</Button></section>
    <section className="engineer-guardrail"><Icon name="shield" size={17}/><p><b>Your technical authority:</b> verify construction progress, quality and approved drawings. You can raise corrective work, but cannot approve purchases, move stock or handle payments.</p></section>
    <section className="metrics-grid role-metrics">
      <Metric label="Technical actions" value={`${actions.length} open`} note={`${scope} only`} icon="shield" tone="orange"/>
      <Metric label="Open defects" value={`${Math.max(1, projectScope.length)} items`} note="Prioritised by construction risk" icon="alert" tone="red"/>
      <Metric label="Progress to verify" value={`${sites.filter(site => site[1] !== site[2]).length} reports`} note="Reported versus measured progress" icon="trend" tone="navy"/>
      <Metric label="Assigned sites" value={`${projectScope.length} projects`} note="No access outside this pair" icon="file" tone="green"/>
    </section>
    <section className="engineer-grid">
      <div className="panel engineer-progress-card"><PanelHead title="Reported versus verified progress" subtitle="Site claims only become official after technical verification" action="Full progress view" onClick={()=>navigate('/projects')}/>
        <div className="engineer-site-list"><div className="engineer-site-row engineer-site-head"><span>PROJECT</span><span>REPORTED</span><span>VERIFIED</span><span>CURRENT STAGE</span><span>STATUS</span></div>{sites.map(site=><div className="engineer-site-row" key={site[0]}><strong>{site[0]}</strong><b>{site[1]}</b><b>{site[2]}</b><span>{site[3]}</span><Status>{site[4]}</Status></div>)}</div>
      </div>
      <aside className="panel technical-actions"><PanelHead title="Technical actions" subtitle="Ordered by programme impact"/>
        <div className="technical-action-list">
          {actions.map((action, index) => <article className={index === 0 ? 'urgent' : ''} key={`${action[0]}-${action[1]}`}><i><Icon name={index === 0 ? 'alert' : action[1] === 'DRAWING' ? 'file' : 'eye'} size={15}/></i><div><span>{action[0].toUpperCase()} · {action[1]}</span><h3>{action[2]}</h3><p>{action[3]}</p><button onClick={()=>navigate(action[4])}>Open action <Icon name="arrow" size={13}/></button></div></article>)}
        </div>
      </aside>
      <div className="panel inspection-snapshot"><PanelHead title="Recent quality inspections" subtitle="Last five technical decisions" action="All inspections" onClick={()=>navigate('/quality')}/>
        <div className="inspection-snapshot-list">{inspections.map(row=><div key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[2]}</strong><small>{row[1]} · {row[4]}</small></span><Status>{row[3]}</Status></div>)}</div>
      </div>
      <div className="panel drawing-snapshot"><PanelHead title="Information used on site" subtitle="Current approved revisions" action="Drawing register" onClick={()=>navigate('/drawings')}/>
        <div className="drawing-count"><div><Icon name="file" size={21}/><span><strong>46</strong><small>Current drawings</small></span></div><div><Icon name="alert" size={21}/><span><strong>2</strong><small>Superseded on site</small></span></div></div>
      </div>
    </section>
  </>
}

function ForemanDashboard({ profile, projectScope }: { profile: DemoProfile; projectScope: ProjectName[] }) {
  const navigate=useNavigate()
  const scope = projectScopeLabel(projectScope)
  const isGilgalTeam = profile.id === 'foreman-gilgal'
  const workPlan = isGilgalTeam
    ? [
      { project: 'Gilgal 3', task: 'Fix slab reinforcement', crew: '9 people', progress: '65%', status: 'In progress' },
      { project: 'Gilgal 2', task: 'Complete roof ring-beam formwork', crew: '6 people', progress: '40%', status: 'In progress' },
      { project: 'Gilgal 3', task: 'Place electrical conduits', crew: '4 people', progress: '0%', status: 'Starts 13:00' },
    ]
    : [
      { project: 'Church', task: 'Continue column work', crew: '8 people', progress: '55%', status: 'In progress' },
      { project: 'SNEP HQ', task: 'Build ground-floor walls', crew: '12 people', progress: '45%', status: 'In progress' },
      { project: 'SNEP HQ', task: 'Set out electrical conduits', crew: '4 people', progress: '0%', status: 'Starts 13:00' },
    ]
  const handover = isGilgalTeam
    ? ['MIV-0087 · Y12 reinforcement steel','80 lengths issued by Lucy Njeri at 09:12','80 lengths']
    : ['MIV-0091 · Bamburi cement','140 bags issued by Lucy Njeri at 09:35','140 bags']
  return <div className="simple-dashboard">
    <section className="simple-role-header">
      <div><span>FOREMAN</span><h2>{scope}</h2><p>Today’s work and material records.</p></div>
      <Button icon="plus" onClick={()=>navigate('/procurement')}>Request materials</Button>
    </section>

    <section className="simple-quick-actions">
      <button onClick={()=>navigate('/workforce')}><i><Icon name="users"/></i><span><b>Record daily work</b><small>Crew and work completed</small></span><Icon name="chevron" size={17}/></button>
      <button onClick={()=>navigate('/inventory')}><i><Icon name="boxes"/></i><span><b>Record material use</b><small>What the crew used</small></span><Icon name="chevron" size={17}/></button>
      <button onClick={()=>navigate('/inventory')}><i><Icon name="truck"/></i><span><b>Confirm material receipt</b><small>1 voucher waiting</small></span><Icon name="chevron" size={17}/></button>
    </section>

    <section className="simple-two-column foreman-simple-grid">
      <div className="panel">
        <PanelHead title="Today’s work" subtitle="3 activities"/>
        <div className="simple-work-list">
          {workPlan.map(item => <article key={`${item.project}-${item.task}`}>
            <div><span>{item.project.toUpperCase()}</span><h3>{item.task}</h3><p>{item.crew}</p></div>
            <div className="simple-work-progress"><strong>{item.progress}</strong><span>complete</span></div>
            <Status tone={item.status === 'In progress' ? 'issued' : 'at-risk'}>{item.status}</Status>
          </article>)}
        </div>
      </div>
      <aside className="panel">
        <PanelHead title="Needs attention" subtitle="3 items" action="Report a problem" onClick={()=>navigate('/equipment')}/>
        <div className="simple-action-list foreman-attention-list">
          <article>
            <div className="simple-action-icon warning"><Icon name="alert" size={17}/></div>
            <div><span>MATERIAL</span><h3>{isGilgalTeam ? 'Y12 steel is running low' : 'Cement delivery is short'}</h3><p>{isGilgalTeam ? '38 lengths left' : '40 bags still due'}</p></div>
            <Button variant="secondary" onClick={()=>navigate('/procurement')}>Request</Button>
          </article>
          <article>
            <div className="simple-action-icon"><Icon name="truck" size={17}/></div>
            <div><span>RECEIPT TO CONFIRM</span><h3>{handover[0]}</h3><p>{handover[1]}</p></div>
            <Button variant="secondary" onClick={()=>navigate('/inventory')}>Confirm</Button>
          </article>
          <article>
            <div className="simple-action-icon"><Icon name="clock" size={17}/></div>
            <div><span>SITE RECORD</span><h3>Daily work log</h3><p>Due at 16:45</p></div>
            <Button variant="secondary" onClick={()=>navigate('/workforce')}>Open log</Button>
          </article>
        </div>
      </aside>
    </section>
  </div>
}

function StorekeeperDashboard() {
  const navigate=useNavigate()
  return <>
    <section className="role-welcome storekeeper-welcome"><div><span>STOREKEEPER WORKSPACE</span><h2>Good morning, Lucy.</h2><p>Three deliveries and two approved material issues need store action today.</p></div><Button icon="truck" onClick={()=>navigate('/receiving')}>Receive delivery</Button></section>
    <section className="storekeeper-guardrail"><Icon name="lock" size={17}/><p><b>You control physical custody, not commercial decisions.</b> Record what actually enters or leaves the store. You cannot choose suppliers, change prices, approve requests or handle payments.</p></section>
    <section className="metrics-grid role-metrics"><Metric label="Expected deliveries" value="3 today" note="1 delivery already late" icon="truck" tone="orange"/><Metric label="Ready to issue" value="2 vouchers" note="Both have approved requests" icon="boxes" tone="green"/><Metric label="Transfers in motion" value="3" note="1 inbound confirmation overdue" icon="swap" tone="navy"/><Metric label="Stock attention" value="7 items" note="2 critical for this week’s work" icon="alert" tone="red"/></section>
    <section className="storekeeper-grid">
      <div className="panel store-actions"><PanelHead title="Store actions in order" subtitle="Complete the physical check before recording the system event"/>
        <div className="store-action-list"><article className="urgent"><i>1</i><div><span>DELIVERY · SNEP HQ</span><h3>Count 180 cement bags from Bamburi</h3><p>PO-0188 · Driver arrived at 09:35</p></div><button onClick={()=>navigate('/receiving')}>Receive & inspect</button></article><article><i>2</i><div><span>MATERIAL ISSUE · GILGAL 2</span><h3>Prepare 80 Y12 steel lengths</h3><p>MR-0239 approved · Foreman Samuel Kariuki</p></div><button onClick={()=>navigate('/issues')}>Create voucher</button></article><article><i>3</i><div><span>INBOUND TRANSFER · CHURCH</span><h3>Confirm timber received from Gilgal 2</h3><p>TR-0063 · Dispatch recorded 3 days ago</p></div><button onClick={()=>navigate('/transfers')}>Count & confirm</button></article></div>
      </div>
      <aside className="panel store-integrity"><PanelHead title="Custody controls" subtitle="Today’s handover position"/><div className="integrity-list"><div><Icon name="check" size={15}/><span><b>All GRNs independently counted</b><small>Receiver differs from requester</small></span></div><div><Icon name="clock" size={15}/><span><b>1 foreman handover pending</b><small>MIV-0087 · issued at 09:12</small></span></div><div><Icon name="alert" size={15}/><span><b>1 unresolved count variance</b><small>Gilgal 3 steel · KES 62,400</small></span></div></div></aside>
      <div className="panel store-stock-view"><PanelHead title="Stock position by store" subtitle="Value and items needing replenishment" action="Open stock ledger" onClick={()=>navigate('/inventory')}/><div className="store-site-grid">{[['Gilgal 2','KES 3.18M','2 low items','Count current'],['Gilgal 3','KES 2.74M','3 low items','1 variance'],['SNEP HQ','KES 4.86M','1 low item','Count current'],['Church','KES 2.06M','1 low item','Count due']].map(row=><div key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><small>{row[2]}</small><Status tone={row[3].includes('variance')||row[3].includes('due')?'at-risk':'accepted'}>{row[3]}</Status></div>)}</div></div>
    </section>
  </>
}

function ProcurementOfficerDashboard() {
  const navigate=useNavigate()
  return <>
    <section className="role-welcome procurement-welcome"><div><span>PROCUREMENT OFFICER WORKSPACE</span><h2>Good morning, Paul.</h2><p>Four approved requests are ready for sourcing; two need comparative quotations.</p></div><Button icon="cart" onClick={()=>navigate('/procurement')}>Open sourcing queue</Button></section>
    <section className="procurement-guardrail"><Icon name="shield" size={17}/><p><b>You source and prepare; another role approves.</b> Requested items and quantities remain locked. You cannot approve your own PO, receive deliveries, match invoices or execute payments.</p></section>
    <section className="metrics-grid role-metrics"><Metric label="Ready to source" value="4 requests" note="KES 730,550 estimated value" icon="cart" tone="orange"/><Metric label="Quotes outstanding" value="5 suppliers" note="2 comparisons due today" icon="clock" tone="navy"/><Metric label="POs awaiting approval" value="2 drafts" note="KES 496,800 combined" icon="file" tone="green"/><Metric label="Price exceptions" value="1 flag" note="Steel is 8.4% above reference" icon="alert" tone="red"/></section>
    <section className="procurement-role-grid"><div className="panel sourcing-priorities"><PanelHead title="Approved requests ready to source" subtitle="Demand is locked to the approved requisition" action="Open all requests" onClick={()=>navigate('/procurement')}/><div className="sourcing-list">{[['MR-0245','River sand','18 tonnes','Gilgal 2','KES 63,000','Start sourcing'],['MR-0247','Bamburi cement','180 bags','SNEP HQ','KES 171,000','Compare quotes'],['MR-0248','Y12 reinforcement steel','240 lengths','Gilgal 3','KES 412,800','Price flagged'],['MR-0246','Machine-cut stones','1,200 pcs','Church','KES 84,000','Start sourcing']].map(row=><article key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[1]}</strong><small>{row[2]} · {row[3]}</small></span><b>{row[4]}</b><Status tone={row[5]==='Price flagged'?'at-risk':row[5]==='Compare quotes'?'issued':'approved'}>{row[5]}</Status><button onClick={()=>navigate('/procurement')}><Icon name="chevron" size={15}/></button></article>)}</div></div><aside className="panel quote-deadlines"><PanelHead title="Quotation deadlines" subtitle="Competitive bids above threshold"/><div>{[['Today, 14:00','MR-0248 · Steel','2 of 3 quotes'],['Today, 16:30','MR-0247 · Cement','3 of 3 quotes'],['Mon, 10:00','MR-0245 · River sand','1 of 3 quotes']].map(row=><article key={row[1]}><time>{row[0]}</time><span><b>{row[1]}</b><small>{row[2]}</small></span><Status tone={row[2].startsWith('3')?'accepted':'at-risk'}>{row[2].startsWith('3')?'Ready':'Waiting'}</Status></article>)}</div></aside><div className="panel delivery-followup"><PanelHead title="Delivery follow-up" subtitle="Issued orders that need supplier action" action="Purchase orders" onClick={()=>navigate('/purchase-orders')}/><div className="delivery-follow-list">{[['PO-0188','Bamburi Cement PLC','SNEP HQ','Partial: 140 / 180 bags','Resolve shortfall'],['PO-0187','Kaydee Hardware','Church','Due today at 15:00','On schedule'],['PO-0186','Mavoko Aggregates','Gilgal 2','Supplier acknowledged','Due Monday']].map(row=><div key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[1]}</strong><small>{row[2]} · {row[3]}</small></span><Status tone={row[4]==='Resolve shortfall'?'at-risk':'accepted'}>{row[4]}</Status></div>)}</div></div></section>
  </>
}

function AuditorDashboard() {
  const navigate=useNavigate()
  return <>
    <section className="role-welcome auditor-welcome"><div><span>AUDITOR · READ-ONLY</span><h2>Good morning, Mary.</h2><p>The audit chain is intact. Five exceptions need independent review.</p></div><Button icon="download" onClick={()=>navigate('/audit-reports')}>Export audit pack</Button></section>
    <section className="auditor-guardrail"><Icon name="eye" size={17}/><p><b>Independent read-only oversight.</b> You can search, trace, inspect evidence and export. You cannot change a source record, resolve an exception by editing it, or perform any operational transaction.</p></section>
    <section className="metrics-grid role-metrics"><Metric label="Open exceptions" value="5 findings" note="2 high · 2 medium · 1 low" icon="alert" tone="red"/><Metric label="Value exposed" value="KES 1.08M" note="Transactions under review" icon="wallet" tone="orange"/><Metric label="Control compliance" value="94%" note="Across the last 30 days" icon="shield" tone="green"/><Metric label="Audit chain" value="128,492" note="Consecutive verified events" icon="lock" tone="navy"/></section>
    <section className="auditor-grid"><div className="panel audit-risk-list"><PanelHead title="Highest-risk exceptions" subtitle="Prioritised by financial exposure and control failure" action="Review evidence" onClick={()=>navigate('/audit-samples')}/><div>{[['High','AUD-0094','Steel price 12.6% above reference','Gilgal 3 · KES 412,800'],['High','AUD-0091','Duplicate invoice reference detected','SNEP HQ · KES 384,000'],['Medium','AUD-0088','Transfer receipt overdue by 3 days','Gilgal 2 → Church · KES 156,000'],['Medium','AUD-0084','Repeated round-number petty cash','Gilgal 3 · KES 50,000']].map(row=><article key={row[1]}><span className={`severity ${row[0].toLowerCase()}`}>{row[0]}</span><b className="mono">{row[1]}</b><div><strong>{row[2]}</strong><small>{row[3]}</small></div><button onClick={()=>navigate('/audit-samples')}>Trace <Icon name="arrow" size={13}/></button></article>)}</div></div><aside className="panel audit-integrity-card"><PanelHead title="Evidence integrity" subtitle="Cryptographic chain status"/><div className="integrity-seal"><i><Icon name="shield" size={27}/></i><strong>Verified</strong><span>No breaks across 128,492 events</span></div><div className="integrity-facts"><span>Last verification <b>Today, 10:45</b></span><span>Records superseded <b>18</b></span><span>Records deleted <b>0</b></span><span>Attachments hashed <b>100%</b></span></div></aside><div className="panel audit-project-map"><PanelHead title="Exceptions by project" subtitle="Open findings and financially exposed value"/><div className="audit-project-list">{[['Gilgal 2','1 finding','KES 156,000','Low'],['Gilgal 3','3 findings','KES 512,800','High'],['SNEP HQ','1 finding','KES 384,000','High'],['Church','0 findings','KES 0','Clear']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><b>{row[2]}</b><Status tone={row[3]==='High'?'at-risk':row[3]==='Low'?'issued':'accepted'}>{row[3]}</Status></div>)}</div></div></section>
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
    { reference: 'PAY-0420', supplier: 'Mavoko Aggregates', invoice: 'INV-1072', project: 'Gilgal 2', amount: '63,000', method: 'M-Pesa' },
    { reference: 'PAY-0419', supplier: 'Musa Electrical Works', invoice: 'INV-2044', project: 'SNEP HQ', amount: '179,000', method: 'Bank transfer' },
  ]
  const unpaidPayments = readyPayments.filter(payment => !paid.includes(payment.reference))
  const paidThisSession = readyPayments
    .filter(payment => paid.includes(payment.reference))
    .reduce((total, payment) => total + Number(payment.amount.replaceAll(',', '')), 0)
  const readyTotal = unpaidPayments.reduce((total, payment) => total + Number(payment.amount.replaceAll(',', '')), 0)
  return <div className="simple-dashboard">
    <section className="simple-role-header">
      <div><span>CASHIER</span><h2>Payments</h2><p>Execute payments approved by Finance.</p></div>
      <Button icon="receipt" onClick={() => navigate('/finance')}>Open payments desk</Button>
    </section>

    <section className="simple-rule"><Icon name="lock" size={17}/><span><b>Only approved payments can be paid.</b> Amount and beneficiary are locked.</span></section>

    <section className="simple-summary-grid three">
      <SimpleStat label="Ready to pay" value={`KES ${readyTotal.toLocaleString('en-KE')}`} note={`${unpaidPayments.length} payments`} tone={unpaidPayments.length ? 'warning' : 'good'}/>
      <SimpleStat label="Paid today" value={`KES ${(684000 + paidThisSession).toLocaleString('en-KE')}`} note={`${1 + paid.length} payments`} tone="good"/>
      <SimpleStat label="Blocked" value="2 invoices" note="Missing proof" tone="danger"/>
    </section>

    <section className="panel simple-payment-panel">
      <PanelHead title="Ready to pay" subtitle="Purchase order, delivery and invoice checked" action="Full payments desk" onClick={() => navigate('/finance')}/>
      <div className="simple-payment-list">
        {readyPayments.map(payment => {
          const isPaid = paid.includes(payment.reference)
          return <article key={payment.reference} className={isPaid ? 'completed' : ''}>
            <div className="simple-payment-party"><span>{payment.supplier[0]}</span><div><strong>{payment.supplier}</strong><small>{payment.reference} · {payment.invoice} · {payment.project}</small></div></div>
            <div className="simple-payment-amount"><strong>KES {payment.amount}</strong><span>{payment.method}</span></div>
            <div className="simple-proof"><Icon name="check" size={14}/>Checks passed</div>
            {isPaid ? <Status tone="paid">Paid</Status> : <Button onClick={() => setSelectedPayment(payment)}>Pay</Button>}
          </article>
        })}
      </div>
    </section>
    {selectedPayment && <PaymentExecutionModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} onComplete={() => executePayment(selectedPayment)}/>}
    {toast && <div className="toast"><Icon name="check"/>{toast}</div>}
  </div>
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

function PageIntro({ title, copy, action, icon, onAction }: {title:string;copy:string;action?:string;icon?:IconName;onAction?:()=>void}) {
  return <section className="page-intro"><div><h2>{title}</h2><p>{copy}</p></div>{action && <Button icon={icon} onClick={onAction}>{action}</Button>}</section>
}

function CeoProjects({ visibleProjects }: { visibleProjects: typeof projects }) {
  const materialPosition: Record<ProjectName, string> = {
    'Gilgal 2': 'Enough in store',
    'Gilgal 3': 'Steel low in store',
    'SNEP HQ': 'PVC low in store',
    Church: 'Plywood needs watching',
  }
  return <div className="ceo-view ceo-projects-view">
    <section className="ceo-project-grid">
      {visibleProjects.map(project => {
        const moneyUsed = Math.round(project.spent / project.budget * 100)
        const needsAttention = project.name === 'Gilgal 3'
        const materials = materialPosition[project.name as ProjectName]
        return <article className={`panel ceo-project-card ${needsAttention ? 'attention' : ''}`} key={project.name}>
          <header>
            <div className="simple-project-name"><b style={{background:project.color}}>{project.code}</b><strong>{project.name}</strong></div>
            <Status tone={needsAttention ? 'at-risk' : 'accepted'}>{needsAttention ? 'Needs attention' : 'Okay'}</Status>
          </header>
          <div className="ceo-project-measures">
            <div><span>Work done</span><strong>{project.progress}%</strong><div><i style={{width:`${project.progress}%`,background:project.color}}/></div></div>
            <div><span>Money used</span><strong>{moneyUsed}%</strong><div><i style={{width:`${moneyUsed}%`}}/></div></div>
          </div>
          <footer className={materials === 'Enough in store' ? '' : 'warning'}><Icon name="boxes" size={20}/><span>Store stock</span><strong>{materials}</strong></footer>
        </article>
      })}
    </section>
  </div>
}

function Projects({readOnly=false, projectScope=[...allProjectNames]}:{readOnly?:boolean; projectScope?:ProjectName[]}) {
  const [modal, setModal] = useState(false)
  const visibleProjects = projects.filter(project => projectScope.includes(project.name as ProjectName))
  if (readOnly) return <CeoProjects visibleProjects={visibleProjects}/>
  const budget = visibleProjects.reduce((total, project) => total + project.budget, 0)
  const spent = visibleProjects.reduce((total, project) => total + project.spent, 0)
  const committed = visibleProjects.reduce((total, project) => total + project.committed, 0)
  return <>
    <PageIntro title="Project portfolio" copy="A single view of delivery, budgets and site responsibility." action="Add project" icon="plus" onAction={() => setModal(true)}/>
    <section className="portfolio-strip">
      <div><span>Assigned budget</span><strong>KES {budget.toFixed(1)}M</strong></div>
      <div><span>Actual spend</span><strong>KES {spent.toFixed(1)}M</strong><small>{budget ? (spent / budget * 100).toFixed(1) : '0.0'}% of budget</small></div>
      <div><span>Open commitments</span><strong>KES {committed.toFixed(1)}M</strong><small>{budget ? (committed / budget * 100).toFixed(1) : '0.0'}% of budget</small></div>
      <div><span>Active sites</span><strong>{visibleProjects.length}</strong><small>0 currently paused</small></div>
    </section>
    <section className="project-cards">
      {visibleProjects.map(p => <article className="project-card" key={p.name}>
        <div className="project-card-top"><div className="project-badge" style={{background:p.color}}>{p.code}</div><Status>{p.status}</Status><button aria-label="More options"><Icon name="more"/></button></div>
        <h3>{p.name}</h3><p><Icon name="pin" size={15}/>{p.location}</p>
        <div className="site-progress"><div><span>Site completion</span><b>{p.progress}%</b></div><div className="progress large"><i style={{width:`${p.progress}%`, background:p.color}}/></div></div>
        <div className="card-stats"><div><span>Approved budget</span><strong>KES {p.budget.toFixed(1)}M</strong></div><div><span>Remaining</span><strong>KES {(p.budget-p.spent-p.committed).toFixed(1)}M</strong></div></div>
        <div className="card-budget"><span>Spent <b>KES {p.spent.toFixed(1)}M</b></span><span>Committed <b>KES {p.committed.toFixed(1)}M</b></span></div>
        <footer><div className="supervisor-avatar">{p.supervisor.split(' ').map(word => word[0]).join('').slice(0, 2)}</div><div><span>Site supervisor</span><b>{p.supervisor}</b></div><button>Open project <Icon name="arrow" size={14}/></button></footer>
      </article>)}
    </section>
    {modal && <ProjectModal onClose={() => setModal(false)}/>}
  </>
}

function ProjectModal({onClose}:{onClose:()=>void}) {
  const [saved,setSaved]=useState(false)
  const submit=(e:FormEvent)=>{e.preventDefault();setSaved(true);setTimeout(onClose,900)}
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal" onSubmit={submit}>
    <div className="modal-head"><div><span className="eyebrow">PROJECT SETUP</span><h2>Add a construction site</h2><p>New sites inherit the standard approval controls.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div>
    {saved ? <div className="success-state"><div><Icon name="check" size={28}/></div><h3>Project created</h3><p>The site is ready for budget allocation and team access.</p></div> : <>
      <div className="form-grid"><label className="full">Project name<input required placeholder="e.g. Gilgal 3"/></label><label className="full">Location<input required placeholder="Site address or area"/></label><label>Approved budget (KES)<input required type="number" placeholder="0.00"/></label><label>Start date<input required type="date"/></label><label>Planned end date<input type="date"/></label><label>Status<select><option>Active</option><option>On Hold</option></select></label><label className="full">Site supervisor<select><option>Select a supervisor…</option><option>Gilgal Sites Supervisor</option><option>Church & SNEP Supervisor</option></select></label></div>
      <div className="control-callout"><Icon name="shield"/><div><b>Standard control policy will apply</b><span>Four-person purchase-to-pay segregation and immutable activity logging.</span></div></div>
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create project</Button></div>
    </>}
  </form></div>
}

function Procurement({readOnly=false,projectScope=[...allProjectNames]}:{readOnly?:boolean;projectScope?:ProjectName[]}) {
  const [tab,setTab]=useState('Requisitions')
  const [toast,setToast]=useState('')
  const visibleRequisitions=requisitions.filter(requisition=>projectScope.includes(requisition.site as ProjectName))
  const approve=(id:string)=>{setToast(`${id} approved and released to procurement`);setTimeout(()=>setToast(''),3000)}
  const returnRequest=(id:string)=>{setToast(`${id} returned to the Foreman for correction`);setTimeout(()=>setToast(''),3000)}
  return <>
    <PageIntro title={readOnly?'Procurement oversight':'Material request approvals'} copy={readOnly?'Follow requests, orders and deliveries without entering the operational approval queue.':'Foremen create material requests. Review the need, quantity and timing before Procurement can source them.'} action={readOnly?'Export overview':undefined} icon={readOnly?'download':undefined}/>
    {readOnly&&<section className="role-guardrail owner-readonly-note"><Icon name="eye" size={17}/><p><b>Observer mode:</b> routine requests are handled by the Supervisor and Procurement team. Only a high-value or unresolved exception returns to your CEO workspace.</p></section>}
    {!readOnly&&<section className="role-guardrail"><Icon name="shield" size={17}/><p><b>Approval only:</b> you may approve or return requests raised by a Foreman. You cannot create and approve the same requisition.</p></section>}
    <div className="tabs">{['Requisitions','Purchase orders','Goods received','Suppliers'].map((t,i)=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}{i<3&&<span>{[12,7,4][i]}</span>}</button>)}</div>
    <section className="panel table-panel">
      <div className="table-tools"><button><Icon name="download"/>Export</button></div>
      {tab==='Requisitions' ? <div className="data-table procurement-table">
        <div className="data-row data-head"><span>REFERENCE</span><span>DESCRIPTION</span><span>SITE</span><span>REQUESTED BY</span><span>EST. VALUE</span><span>STATUS</span><span></span></div>
        {visibleRequisitions.map(r=><div className="data-row" key={r.id}>
          <div><b className="mono">{r.id}</b><small>{r.date}</small></div>
          <div><strong>{r.item}</strong><small>{r.qty}{r.risk&&<em><Icon name="alert" size={11}/>{r.risk}</em>}</small></div>
          <span>{r.site}</span><span>{r.requester}</span><strong>{r.value}</strong><Status>{r.status}</Status>
          <div className="row-actions">{r.status==='Needs approval'&&!readOnly?<><button className="approve" onClick={()=>approve(r.id)}><Icon name="check" size={15}/>Approve</button><button onClick={()=>returnRequest(r.id)}>Return</button></>:<button><Icon name="eye" size={16}/>View</button>}</div>
        </div>)}
      </div> : <ModuleTable tab={tab} projectScope={projectScope}/>}
      <footer className="table-footer"><span>Showing 1–5 of {tab==='Suppliers'?28:12} records</span><div><button disabled>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div></footer>
    </section>
    {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function ModuleTable({tab,projectScope}:{tab:string;projectScope:ProjectName[]}) {
  const rows:Record<string,string[][]>={
    'Purchase orders':[['PO-0189','Apex Steel Ltd','Gilgal 3','KES 412,800','Awaiting approval'],['PO-0188','Bamburi Cement PLC','SNEP HQ','KES 171,000','Issued'],['PO-0187','Kaydee Hardware','Church','KES 84,000','Part delivered'],['PO-0186','Mavoko Aggregates','Gilgal 2','KES 63,000','Closed']],
    'Goods received':[['GRN-0112','PO-0188 · Cement','SNEP HQ','140 / 180 bags','Discrepancy'],['GRN-0111','PO-0186 · River sand','Gilgal 2','18 / 18 tonnes','Accepted'],['GRN-0110','PO-0185 · Ballast','Church','12 / 12 tonnes','Accepted'],['GRN-0109','PO-0184 · Steel','Gilgal 3','180 / 180 lengths','Accepted']],
    'Suppliers':[['SUP-0031','Apex Steel Ltd','Steel & reinforcement','3 open orders','Approved'],['SUP-0014','Bamburi Cement PLC','Cement','2 open orders','Approved'],['SUP-0022','Kaydee Hardware','General hardware','1 open order','Review due'],['SUP-0008','Mavoko Aggregates','Aggregates','0 open orders','Approved']],
  }
  const visibleRows=tab==='Suppliers'?rows[tab]:rows[tab].filter(row=>projectScope.includes(row[2] as ProjectName))
  return <div className="simple-module-table">
    <div className="simple-head">{['REFERENCE','PARTY / ITEM','CATEGORY / SITE','ACTIVITY','STATUS',''].map(x=><span key={x}>{x}</span>)}</div>
    {visibleRows.map(row=><div className="simple-row" key={row[0]}>{row.map((c,j)=>j===4?<Status key={c}>{c}</Status>:<span className={j===0?'mono':''} key={c}>{c}</span>)}<button><Icon name="eye" size={16}/>View</button></div>)}
  </div>
}

function RequisitionModal({onClose,onSaved,lockedProject,projectOptions}:{onClose:()=>void;onSaved:()=>void;lockedProject?:string;projectOptions?:readonly ProjectName[]}) {
  const [step,setStep]=useState(1)
  const submit=(e:FormEvent)=>{e.preventDefault(); if(step===1)setStep(2);else onSaved()}
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal requisition-modal" onSubmit={submit}>
    <div className="modal-head"><div><span className="eyebrow">MATERIAL REQUEST</span><h2>New requisition</h2><p>Request materials for an approved project activity.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div>
    <div className="stepper"><div className="active"><i>{step>1?<Icon name="check" size={13}/>:1}</i><span>Request details</span></div><em/><div className={step===2?'active':''}><i>2</i><span>Review & submit</span></div></div>
    {step===1?<div className="form-grid">
      <label>Project / site<select required disabled={Boolean(lockedProject)} defaultValue={lockedProject ?? ''}>{!lockedProject&&<option value="" disabled>Select project…</option>}{projects.filter(project=>(!lockedProject||project.name===lockedProject)&&(!projectOptions||projectOptions.includes(project.name as ProjectName))).map(project=><option key={project.name}>{project.name}</option>)}</select></label>
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

function ForemanRequests({ projectScope }: { projectScope: ProjectName[] }) {
  const [modal,setModal]=useState(false)
  const [toast,setToast]=useState('')
  const ownRequests=[['MR-0248','Y12 reinforcement steel','240 lengths','Today, 09:42','Needs approval'],['MR-0239','PVC conduit 25mm','150 lengths','23 Jul, 14:05','Approved'],['MR-0234','Binding wire 16G','12 rolls','22 Jul, 10:18','PO created'],['MR-0228','Marine plywood 18mm','24 sheets','20 Jul, 08:40','Fulfilled']]
  return <>
    <PageIntro title="My material requests" copy="Ask for materials before they are purchased or issued to your site." action="New material request" icon="plus" onAction={()=>setModal(true)}/>
    <section className="field-boundary"><Icon name="lock" size={16}/><span><b>You request; the Supervisor approves.</b> You cannot approve your own request, choose a supplier, change a price or create a purchase order.</span></section>
    <section className="field-request-summary"><div><span>Waiting for approval</span><strong>1</strong></div><div><span>Approved / being sourced</span><strong>2</strong></div><div><span>Ready at store</span><strong>1</strong></div><div><span>Fulfilled this month</span><strong>8</strong></div></section>
    <section className="panel foreman-request-panel"><PanelHead title="Requests raised by you" subtitle={`${projectScopeLabel(projectScope)} only`}/>
      <div className="foreman-request-table"><div className="foreman-request-row request-head"><span>REFERENCE</span><span>MATERIAL</span><span>QUANTITY</span><span>RAISED</span><span>STATUS</span><span></span></div>{ownRequests.map(row=><div className="foreman-request-row" key={row[0]}><b className="mono">{row[0]}</b><strong>{row[1]}</strong><span>{row[2]}</span><span>{row[3]}</span><Status>{row[4]}</Status><button><Icon name="eye" size={15}/>View</button></div>)}</div>
    </section>
    <section className="request-explainer"><div><i>1</i><span><b>You request</b><small>Purpose and quantity</small></span></div><em/><div><i>2</i><span><b>Supervisor approves</b><small>Need and budget</small></span></div><em/><div><i>3</i><span><b>Procurement buys</b><small>Supplier and price</small></span></div><em/><div><i>4</i><span><b>Store issues</b><small>You confirm handover</small></span></div></section>
    {modal&&<RequisitionModal projectOptions={projectScope} onClose={()=>setModal(false)} onSaved={()=>{setModal(false);setToast('Material request submitted to the Supervisor for approval.')}}/>}
    {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function ForemanMaterials({ projectScope }: { projectScope: ProjectName[] }) {
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
      <div className="panel span-full"><PanelHead title="Recent records by you" subtitle={`Today · ${projectScopeLabel(projectScope)}`}/>
        <div className="field-ledger">{[['10:20','Material used','Y12 reinforcement steel','42 lengths','Slab reinforcement · Grid A–D'],['09:25','Handover confirmed','Binding wire 16G','4 rolls','MIV-0084'],['Yesterday','Wastage','Marine plywood 18mm','2 sheets','Split during stripping · photo attached']].map(row=><div key={row.join('-')}><span>{row[0]}</span><Status tone={row[1]==='Wastage'?'at-risk':row[1]==='Material used'?'issued':'accepted'}>{row[1]}</Status><strong>{row[2]}</strong><b>{row[3]}</b><small>{row[4]}</small></div>)}</div>
      </div>
    </section>
    {recordMode&&<MaterialRecordModal mode={recordMode} projectScope={projectScope} onClose={()=>setRecordMode(null)} onComplete={()=>completeRecord(recordMode==='usage'?'Material usage recorded against today’s work activity.':'Wastage report submitted with an accountable reason.')}/>}
    {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function MaterialRecordModal({mode,projectScope,onClose,onComplete}:{mode:'usage'|'wastage';projectScope:ProjectName[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal field-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">{projectScopeLabel(projectScope).toUpperCase()} · MATERIAL CONTROL</span><h2>{mode==='usage'?'Record material used':'Report waste or damage'}</h2><p>This record reduces the quantity under your custody.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="form-grid"><label>Project<select required>{projectScope.map(project=><option key={project}>{project}</option>)}</select></label><label>Material<select required defaultValue=""><option value="" disabled>Select issued material…</option><option>Y12 reinforcement steel · 38 lengths held</option><option>Bamburi cement · 124 bags held</option><option>Binding wire 16G · 8 rolls held</option><option>Marine plywood 18mm · 18 sheets held</option></select></label><label>Quantity<input required min="1" type="number" placeholder="0"/></label><label>Unit<select><option>lengths</option><option>bags</option><option>rolls</option><option>sheets</option></select></label><label className="full">{mode==='usage'?'Work activity / location':'Reason for waste or damage'}<textarea required rows={3} placeholder={mode==='usage'?'e.g. First-floor slab, grid A–D':'Explain exactly what happened and where…'}/></label>{mode==='wastage'&&<label className="full">Evidence photo<input type="file" accept="image/*"/></label>}</div><div className="control-callout"><Icon name="lock"/><div><b>Quantity cannot be edited after submission</b><span>A correction must be requested through the Supervisor and remains visible in the audit trail.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{mode==='usage'?'Record usage':'Submit wastage report'}</Button></div></form></div>
}

function ForemanDailyLog({ projectScope }: { projectScope: ProjectName[] }) {
  const [modal,setModal]=useState(false)
  const [submitted,setSubmitted]=useState(false)
  return <>
    <PageIntro title="Daily site log" copy={`Accountable records of people, progress, delays and safety across ${projectScopeLabel(projectScope)}.`} action={submitted?'Update today’s log':'Complete today’s log'} icon="plus" onAction={()=>setModal(true)}/>
    <section className="daily-log-status"><div><Icon name={submitted?'check':'clock'} size={20}/><span><b>{submitted?'Today’s site log is submitted':'Today’s site log is still open'}</b><small>{submitted?'Submitted by Samuel Kariuki at 16:42':'Complete work progress and blockers before 17:00'}</small></span></div><strong>Saturday, 25 July 2026</strong></section>
    <section className="daily-log-grid"><div className="panel"><PanelHead title="Crew attendance" subtitle="31 people confirmed at morning roll call"/>
      <div className="crew-breakdown">{[['Masons','9','08:00'],['General labourers','16','07:00'],['Steel fixers','4','07:00'],['Electricians','2','13:00']].map(row=><div key={row[0]}><span><b>{row[0]}</b><small>Shift started {row[2]}</small></span><strong>{row[1]}</strong><Status>Present</Status></div>)}</div>
    </div><aside className="panel"><PanelHead title="Site readiness" subtitle="Morning checks"/><div className="readiness-list">{[['Toolbox safety talk','Complete'],['PPE check','Complete'],['Work areas released','Complete'],['Weather interruption','None']].map(row=><div key={row[0]}><span>{row[0]}</span><Status tone={row[1]==='None'?'accepted':'complete'}>{row[1]}</Status></div>)}</div></aside>
      <div className="panel span-full"><PanelHead title="Today’s activity record" subtitle="Planned versus completed work"/><div className="daily-activity-table">{[['Slab reinforcement','65%','65%','On plan'],['Slab-edge formwork','50%','40%','10% behind'],['Electrical conduits','30%','0%','Starts 13:00']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>Planned <b>{row[1]}</b></span><span>Recorded <b>{row[2]}</b></span><Status tone={row[3]==='On plan'?'accepted':'at-risk'}>{row[3]}</Status></div>)}</div></div>
    </section>
    {modal&&<DailyLogModal projectScope={projectScope} onClose={()=>setModal(false)} onComplete={()=>{setModal(false);setSubmitted(true)}}/>}
  </>
}

function DailyLogModal({projectScope,onClose,onComplete}:{projectScope:ProjectName[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal field-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">DAILY FIELD RECORD · 25 JUL 2026</span><h2>Complete today’s site log</h2><p>Record what actually happened—not what was planned.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="form-grid"><label>Project<select required>{projectScope.map(project=><option key={project}>{project}</option>)}</select></label><label>Total people on site<input required type="number" defaultValue="31"/></label><label>Hours worked<input required type="number" defaultValue="8"/></label><label className="full">Work completed<textarea required rows={3} defaultValue="Work completed against today’s approved activity plan."/></label><label className="full">Delays or blockers<textarea rows={2} placeholder="Record material, weather, drawing, labour or equipment delays…"/></label><label className="full">Site photos<input type="file" multiple accept="image/*"/></label><label className="full cashier-confirm"><input required type="checkbox"/><span>I confirm this log reflects the people and work physically observed on site today.</span></label></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Save draft</Button><Button type="submit">Submit daily log</Button></div></form></div>
}

function ForemanTools({ projectScope }: { projectScope: ProjectName[] }) {
  const [reported,setReported]=useState<string[]>([])
  const tools=[['TL-0244','Bosch rotary hammer','Good','Issued 11 Jul'],['TL-0198','Makita angle grinder','Good','Issued 18 Jul'],['TL-0302','Rebar cutter 25mm','Service due','Issued 20 Jul'],['TL-0164','Laser level','Good','Issued 22 Jul']]
  return <><PageIntro title="Tools issued to me" copy={`Custody, condition and return history across ${projectScopeLabel(projectScope)}.`} action="Report tool problem" icon="alert" onAction={()=>setReported(current=>current.includes('TL-0302')?current:[...current,'TL-0302'])}/><section className="field-boundary"><Icon name="tool" size={16}/><span><b>You are the current custodian.</b> Report loss or damage immediately; the equipment record cannot be deleted or backdated.</span></section><section className="tool-custody-grid">{tools.map(tool=><article className="panel" key={tool[0]}><div><span className="tool-code">{tool[0]}</span><Status tone={reported.includes(tool[0])?'at-risk':tool[2]==='Good'?'healthy':'service-due'}>{reported.includes(tool[0])?'Problem reported':tool[2]}</Status></div><i><Icon name="tool" size={24}/></i><h3>{tool[1]}</h3><p>{tool[3]} · Assigned foreman custody</p><button onClick={()=>setReported(current=>current.includes(tool[0])?current:[...current,tool[0]])}>{reported.includes(tool[0])?<><Icon name="check" size={14}/>Report submitted</>:<>Report damage <Icon name="arrow" size={13}/></>}</button></article>)}</section></>
}

function EngineerProgress({ projectScope }: { projectScope: ProjectName[] }) {
  const [verified,setVerified]=useState<string[]>([])
  const [toast,setToast]=useState('')
  const rows=[['Gilgal 2','Roof structure','68%','67%','18 Dec 2026','1%'],['Gilgal 3','First-floor slab','74%','71%','30 Sep 2026','3%'],['SNEP HQ','Ground-floor masonry','39%','39%','28 Feb 2027','0%'],['Church','Column works','31%','28%','15 Apr 2027','3%']].filter(row=>projectScope.includes(row[0] as ProjectName))
  const milestones=[['28 Jul','Gilgal 3','Slab reinforcement approved','Inspection required'],['31 Jul','Gilgal 2','Roof ring beam complete','On schedule'],['02 Aug','Church','Ground-floor columns cast','Inspection required'],['04 Aug','SNEP HQ','Masonry reaches lintel level','On schedule']].filter(row=>projectScope.includes(row[1] as ProjectName))
  const verify=(name:string)=>{setVerified(current=>[...current,name]);setToast(`${name} progress verified and added to its technical history.`);setTimeout(()=>setToast(''),3000)}
  return <><PageIntro title="Progress & milestones" copy={`Technically verified progress for ${projectScopeLabel(projectScope)}.`} action="Export progress report" icon="download"/><section className="engineer-guardrail"><Icon name="eye" size={16}/><p><b>Only verified progress becomes official.</b> A Foreman may report completion, but the Engineer confirms workmanship and measured quantities before certification.</p></section><section className="panel engineer-progress-register"><PanelHead title="Project progress register" subtitle="Latest reporting cycle · 25 July 2026"/><div className="progress-register"><div className="progress-register-row progress-register-head"><span>PROJECT</span><span>CURRENT STAGE</span><span>REPORTED</span><span>VERIFIED</span><span>EXPECTED FINISH</span><span>GAP</span><span></span></div>{rows.map(row=><div className="progress-register-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><b>{row[2]}</b><b>{verified.includes(row[0])?row[2]:row[3]}</b><span>{row[4]}</span><Status tone={row[5]==='0%'?'accepted':'at-risk'}>{verified.includes(row[0])?'0%':row[5]}</Status>{verified.includes(row[0])?<Status>Verified</Status>:<button onClick={()=>verify(row[0])}>Verify <Icon name="arrow" size={12}/></button>}</div>)}</div></section><section className="milestone-board"><div className="panel"><PanelHead title="Milestones in the next 14 days" subtitle="Inspections gate the next construction stage"/><div className="milestone-list">{milestones.map(row=><div key={row[0]+row[1]}><time>{row[0]}</time><span><b>{row[2]}</b><small>{row[1]}</small></span><Status>{row[3]}</Status></div>)}</div></div></section>{toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</>
}

function EngineerQuality({ projectScope }: { projectScope: ProjectName[] }) {
  const [modal,setModal]=useState(false)
  const [toast,setToast]=useState('')
  const inspections=[['INS-0186','Gilgal 3','Slab reinforcement before pour','Today, 14:00','Scheduled'],['INS-0185','Church','Column formwork and plumb','Today, 16:00','Scheduled'],['INS-0184','Gilgal 2','Roof ring-beam formwork','Today, 08:20','Passed'],['INS-0183','SNEP HQ','Blockwork line and level','24 Jul, 15:10','Passed with note']].filter(row=>projectScope.includes(row[1] as ProjectName))
  const defects=[['High','Gilgal 3','Insufficient cover at beam B4','Due before slab pour'],['Medium','Church','Column C2 is 12mm out of plumb','Due 27 Jul'],['Low','SNEP HQ','Uneven mortar joint at grid F','Due 29 Jul'],['Low','Gilgal 2','Ring-beam shutter requires bracing','Due 30 Jul']].filter(row=>projectScope.includes(row[1] as ProjectName))
  return <><PageIntro title="Quality inspections" copy={`Technical hold points and corrective work for ${projectScopeLabel(projectScope)}.`} action="Record inspection" icon="plus" onAction={()=>setModal(true)}/><section className="quality-summary"><div><span>Due today</span><strong>{inspections.filter(row=>row[4]==='Scheduled').length}</strong><small>Before covered work</small></div><div><span>Open defects</span><strong>{defects.length}</strong><small>Prioritised by risk</small></div><div><span>Assigned projects</span><strong>{projectScope.length}</strong><small>Scope enforced</small></div><div><span>First-time pass rate</span><strong>86%</strong><small>Last 30 days</small></div></section><section className="quality-grid"><div className="panel"><PanelHead title="Inspection schedule" subtitle="Work cannot proceed past a hold point without a result"/><div className="inspection-register">{inspections.map(row=><div key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[2]}</strong><small>{row[1]} · {row[3]}</small></span><Status>{row[4]}</Status><button onClick={()=>setModal(true)}>{row[4]==='Scheduled'?'Inspect':'View'} <Icon name="arrow" size={12}/></button></div>)}</div></div><aside className="panel defect-register"><PanelHead title="Open corrective work" subtitle="Must be re-inspected before closure"/><div>{defects.map(row=><article key={row[2]}><span className={`severity ${row[0].toLowerCase()}`}>{row[0]}</span><div><b>{row[2]}</b><small>{row[1]} · {row[3]}</small></div><button><Icon name="chevron" size={14}/></button></article>)}</div></aside></section>{modal&&<InspectionModal projectScope={projectScope} onClose={()=>setModal(false)} onComplete={()=>{setModal(false);setToast('Inspection recorded with a permanent technical reference.')}}/>}{toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</>
}

function InspectionModal({projectScope,onClose,onComplete}:{projectScope:ProjectName[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal inspection-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">TECHNICAL INSPECTION</span><h2>Record inspection result</h2><p>The result gates whether construction may proceed.</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="form-grid"><label>Project<select required>{projectScope.map(project=><option key={project}>{project}</option>)}</select></label><label>Inspection type<select required><option>Structural work before covering</option><option>Formwork, line and level</option></select></label><label className="full">Result<select required defaultValue=""><option value="" disabled>Select technical result…</option><option>Passed — work may proceed</option><option>Passed with note</option><option>Correction required — work held</option></select></label><label className="full">Measurements and observations<textarea required rows={3} placeholder="Record dimensions, levels, cover, workmanship and referenced drawing…"/></label><label>Drawing revision<input required placeholder="e.g. STR-204 Rev B"/></label><label>Evidence photos<input type="file" multiple accept="image/*"/></label></div><div className="payment-audit-note"><Icon name="shield" size={16}/><span>This decision is signed with your Engineer identity. A failed hold-point inspection automatically blocks the next stage.</span></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save inspection result</Button></div></form></div>
}

function EngineerDrawings({ projectScope }: { projectScope: ProjectName[] }) {
  const drawings=[['STR-204','First-floor slab reinforcement','B','Gilgal 3','Approved for construction','24 Jul 2026'],['ARC-118','Ground-floor general arrangement','C','SNEP HQ','Approved for construction','22 Jul 2026'],['STR-091','Ground-floor column details','A','Church','Under review','23 Jul 2026'],['ELE-044','Electrical conduit layout','C','SNEP HQ','Ready to issue','25 Jul 2026'],['STR-112','Roof ring-beam details','A','Gilgal 2','Approved for construction','23 Jul 2026']].filter(row=>projectScope.includes(row[3] as ProjectName))
  const rfis=[['RFI-0038','Gilgal 3','Beam B4 / conduit clash','Engineer reply due today'],['RFI-0037','Church','Column C2 setting-out dimension','Answered'],['RFI-0035','SNEP HQ','Window schedule discrepancy','Architect reply due 27 Jul'],['RFI-0034','Gilgal 2','Ring-beam level confirmation','Answered']].filter(row=>projectScope.includes(row[1] as ProjectName))
  return <><PageIntro title="Drawings & technical documents" copy={`Controlled information for ${projectScopeLabel(projectScope)}.`} action="Upload revision" icon="plus"/><section className="drawing-warning"><Icon name="alert" size={18}/><span><b>Superseded drawings must be withdrawn from site.</b><small>Only records within your assigned project pair are shown.</small></span><button>Track withdrawal</button></section><section className="drawing-layout"><div className="panel"><PanelHead title="Controlled drawing register" subtitle="Only ‘Approved for construction’ revisions may be built"/><div className="drawing-register"><div className="drawing-row drawing-head"><span>NUMBER</span><span>TITLE</span><span>REV.</span><span>PROJECT</span><span>STATUS</span><span>ISSUED</span><span></span></div>{drawings.map(row=><div className="drawing-row" key={row[0]}><b className="mono">{row[0]}</b><strong>{row[1]}</strong><b>{row[2]}</b><span>{row[3]}</span><Status>{row[4]}</Status><span>{row[5]}</span><button><Icon name="eye" size={14}/>Open</button></div>)}</div></div><aside className="panel rfi-panel"><PanelHead title="Requests for information" subtitle="Questions blocking site work"/><div>{rfis.map(row=><article key={row[0]}><div><b className="mono">{row[0]}</b><Status>{row[3]}</Status></div><h3>{row[2]}</h3><p>{row[1]}</p><button>Open RFI <Icon name="arrow" size={12}/></button></article>)}</div></aside></section></>
}

function StorekeeperLedger() {
  return <><PageIntro title="Immutable stock ledger" copy="Current balances derived from received, issued, transferred and adjusted events." action="Export ledger" icon="download"/><section className="storekeeper-guardrail"><Icon name="lock" size={16}/><p><b>No direct balance editing.</b> Every change must originate from a GRN, issue voucher, confirmed transfer, approved wastage adjustment or stock-count variance.</p></section><section className="metrics-grid compact"><Metric label="Stock value" value="KES 12.84M" note="Across four project stores" icon="boxes" tone="navy"/><Metric label="Ledger events today" value="18" note="6 receipts · 9 issues · 3 transfers" icon="file" tone="green"/><Metric label="Low stock" value="7 items" note="2 project-critical" icon="alert" tone="orange"/><Metric label="Unresolved variance" value="KES 94,600" note="Two submitted count records" icon="shield" tone="red"/></section><section className="panel store-ledger-panel"><div className="store-ledger-table"><div className="store-ledger-row store-ledger-head"><span>MATERIAL</span><span>STORE</span><span>UNIT</span><span>ON HAND</span><span>REORDER AT</span><span>LEVEL</span><span></span></div>{storeStockRecords.map(item=><div className="store-ledger-row" key={`${item.store}-${item.material}`}><strong>{item.material}</strong><span>{item.store}</span><span>{item.unit}</span><b>{item.onHand}</b><span>{item.reorderAt}</span><Status tone={item.level==='Healthy'?'healthy':'low-stock'}>{item.level}</Status><button><Icon name="eye" size={14}/>History</button></div>)}</div></section></>
}

function StorekeeperReceiving() {
  const [selected,setSelected]=useState<string[]|null>(null)
  const [received,setReceived]=useState<string[]>([])
  const [toast,setToast]=useState('')
  const deliveries=[['PO-0188','Bamburi Cement PLC','Bamburi cement','180 bags','SNEP HQ','Arrived 09:35'],['PO-0190','Apex Steel Ltd','Y12 reinforcement steel','240 lengths','Gilgal 3','Due 13:00'],['PO-0191','Kaydee Hardware','PVC conduit 25mm','150 lengths','SNEP HQ','Due 15:30']]
  const finish=(po:string)=>{setReceived(current=>[...current,po]);setSelected(null);setToast(`${po} received. GRN created from the physical count.`);setTimeout(()=>setToast(''),3000)}
  return <><PageIntro title="Receive deliveries" copy="Count and inspect actual goods against an issued purchase order." action="Scan delivery note" icon="plus"/><section className="storekeeper-guardrail"><Icon name="shield" size={16}/><p><b>Record reality, not the supplier document.</b> Short, excess, rejected or damaged quantities create a discrepancy and remain visible to Procurement and Finance.</p></section><section className="receiving-board">{deliveries.map(delivery=>{const done=received.includes(delivery[0]);return <article className={`panel delivery-card ${done?'done':''}`} key={delivery[0]}><div><b className="mono">{delivery[0]}</b><Status tone={done?'accepted':delivery[5].startsWith('Arrived')?'at-risk':'issued'}>{done?'GRN created':delivery[5]}</Status></div><h3>{delivery[2]}</h3><p>{delivery[1]} · Deliver to {delivery[4]}</p><strong>{delivery[3]}</strong><button disabled={done} onClick={()=>setSelected(delivery)}>{done?<><Icon name="check" size={14}/>Received</>:<>Count & receive <Icon name="arrow" size={13}/></>}</button></article>})}</section>{selected&&<GoodsReceiptModal delivery={selected} onClose={()=>setSelected(null)} onComplete={()=>finish(selected[0])}/>} {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</>
}

function GoodsReceiptModal({delivery,onClose,onComplete}:{delivery:string[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal grn-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">GOODS RECEIVED NOTE</span><h2>Count and inspect delivery</h2><p>{delivery[0]} · {delivery[1]}</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="locked-order"><span>ORDERED ITEM</span><strong>{delivery[2]}</strong><b>{delivery[3]}</b><small><Icon name="lock" size={12}/>Purchase order details are locked</small></div><div className="form-grid"><label>Quantity physically received<input required type="number" min="0" placeholder="Count every unit"/></label><label>Rejected / damaged quantity<input required type="number" min="0" defaultValue="0"/></label><label>Overall condition<select required><option>Good</option><option>Partly damaged</option><option>Rejected</option></select></label><label>Supplier delivery note<input required placeholder="Delivery note number"/></label><label className="full">Discrepancy or condition notes<textarea rows={3} placeholder="Explain any short, excess, rejected or damaged quantity…"/></label><label className="full">Delivery evidence<input type="file" multiple accept="image/*"/></label></div><div className="control-callout"><Icon name="alert"/><div><b>A mismatch will not be silently corrected</b><span>The GRN records the physical count and automatically flags the PO for follow-up.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create GRN</Button></div></form></div>
}

function StorekeeperIssues() {
  const [selected,setSelected]=useState<string[]|null>(null)
  const [issued,setIssued]=useState<string[]>([])
  const requests=[['MR-0239','Gilgal 3','Y12 reinforcement steel','80 lengths','Samuel Kariuki','186 available'],['MR-0245','Gilgal 2','River sand','18 tonnes','Joseph Maina','42.5 available']]
  return <><PageIntro title="Issue approved materials" copy="Release stock only against an approved requisition and available balance." action="Print pick list" icon="file"/><section className="storekeeper-guardrail"><Icon name="lock" size={16}/><p><b>You may issue less, never more.</b> The approved material and maximum quantity are locked. Foreman confirmation completes the custody handover.</p></section><section className="panel"><PanelHead title="Approved requests ready for issue" subtitle="Stock availability checked automatically"/><div className="issue-ready-list">{requests.map(row=>{const done=issued.includes(row[0]);return <article key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[2]}</strong><small>{row[1]} · Issue to {row[4]}</small></span><b>{row[3]}</b><small>{row[5]}</small>{done?<Status>Awaiting foreman</Status>:<button onClick={()=>setSelected(row)}>Create issue voucher <Icon name="arrow" size={13}/></button>}</article>})}</div></section>{selected&&<MaterialIssueModal request={selected} onClose={()=>setSelected(null)} onComplete={()=>{setIssued(current=>[...current,selected[0]]);setSelected(null)}}/>}</>
}

function MaterialIssueModal({request,onClose,onComplete}:{request:string[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">MATERIAL ISSUE VOUCHER</span><h2>Record physical issue</h2><p>{request[0]} · Approved for {request[1]}</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="locked-order"><span>APPROVED MATERIAL</span><strong>{request[2]}</strong><b>Maximum {request[3]}</b><small><Icon name="lock" size={12}/>{request[5]} in the store</small></div><div className="form-grid"><label>Quantity actually issued<input required type="number" min="1" max={Number.parseFloat(request[3])} placeholder={`Maximum ${request[3]}`}/></label><label>Issue to<input readOnly value={request[4]}/></label><label className="full">Work activity / location<textarea required rows={2} placeholder="Where will the material be used?"/></label></div><div className="control-callout"><Icon name="swap"/><div><b>Handover remains incomplete</b><span>{request[4]} must physically count and confirm receipt before custody changes.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create issue voucher</Button></div></form></div>
}

function StorekeeperTransfers() {
  const [confirmed,setConfirmed]=useState<string[]>([])
  const statusLabel = (transfer: StoreTransferRecord) => transfer.status === 'Awaiting receipt' ? `Inbound · ${transfer.age}` : transfer.status === 'In transit' ? `In transit · ${transfer.age}` : transfer.status
  return <><PageIntro title="Inter-site transfers" copy="Separate dispatch and receipt records expose anything lost in transit." action="New transfer request" icon="plus"/><section className="storekeeper-guardrail"><Icon name="swap" size={16}/><p><b>No single person confirms both ends.</b> The sending store records dispatch; an independently assigned receiving storekeeper records the physical arrival.</p></section><section className="transfer-workspace">{storeTransferRecords.map(transfer=><article className="panel" key={transfer.reference}><div><b className="mono">{transfer.reference}</b><Status tone={transfer.status==='Awaiting receipt'?'at-risk':'issued'}>{confirmed.includes(transfer.reference)?'Received':statusLabel(transfer)}</Status></div><div className="transfer-route-large"><span>{transfer.fromProject}</span><i><Icon name="arrow" size={15}/></i><span>{transfer.toProject}</span></div><h3>{transfer.material} · {transfer.quantity}</h3><p>{transfer.status==='Awaiting receipt'?'Count actual received quantity and record any variance.':'Movement is visible to both site stores.'}</p><button onClick={()=>setConfirmed(current=>[...current,transfer.reference])} disabled={confirmed.includes(transfer.reference)}>{confirmed.includes(transfer.reference)?<><Icon name="check" size={14}/>Confirmation recorded</>:transfer.status==='Awaiting receipt'?'Confirm physical receipt':'Open transfer'}</button></article>)}</section></>
}

function StorekeeperCounts() {
  const [modal,setModal]=useState(false)
  const [submitted,setSubmitted]=useState(false)
  return <><PageIntro title="Physical stock counts" copy="Compare independently counted quantities with the system balance." action="Start count" icon="plus" onAction={()=>setModal(true)}/><section className="count-cycle"><div><span>CURRENT COUNT CYCLE</span><h2>July month-end stock count</h2><p>Due 31 July 2026 · 4 project stores · Independent observer required</p></div><div><strong>{submitted?'1 of 4':'0 of 4'}</strong><span>stores submitted</span></div></section><section className="panel"><PanelHead title="Count schedule" subtitle="Submitted variances require review; they do not directly overwrite stock"/><div className="count-list">{[['Gilgal 2','29 Jul','Lucy Njeri','James Kamau','Not started'],['Gilgal 3','29 Jul','Lucy Njeri','Mercy Wanjiku',submitted?'Submitted':'Not started'],['SNEP HQ','30 Jul','David Ouma','Mary Atienza','Not started'],['Church','31 Jul','Esther Muli','James Kamau','Not started']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span><small>Counter</small>{row[2]}</span><span><small>Observer</small>{row[3]}</span><Status>{row[4]}</Status><button onClick={()=>setModal(true)}>{row[4]==='Submitted'?'View':'Count now'}</button></div>)}</div></section>{modal&&<StockCountModal onClose={()=>setModal(false)} onComplete={()=>{setModal(false);setSubmitted(true)}}/>}</>
}

function StockCountModal({onClose,onComplete}:{onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">PHYSICAL STOCK COUNT</span><h2>Record counted quantity</h2><p>Gilgal 3 store · July month-end cycle</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="form-grid"><label className="full">Material<select><option>Y12 reinforcement steel · system balance hidden</option><option>Bamburi cement · system balance hidden</option></select></label><label>Physical quantity counted<input required type="number" min="0"/></label><label>Unit<select><option>lengths</option><option>bags</option></select></label><label className="full">Count notes<textarea rows={2} placeholder="Location, unopened stacks and counting method…"/></label><label className="full cashier-confirm"><input required type="checkbox"/><span>The independent observer was present and confirms this physical count.</span></label></div><div className="control-callout"><Icon name="eye"/><div><b>System balance is hidden during entry</b><span>This reduces anchoring and makes the physical count independent.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Submit count</Button></div></form></div>
}

function ProcurementApprovedRequests() {
  const [selected,setSelected]=useState<string[]|null>(null)
  const [started,setStarted]=useState<string[]>([])
  const requests=[['MR-0248','Y12 reinforcement steel','240 lengths','Gilgal 3','KES 412,800','3 quotes required'],['MR-0247','Bamburi cement','180 bags','SNEP HQ','KES 171,000','3 quotes required'],['MR-0245','River sand','18 tonnes','Gilgal 2','KES 63,000','Direct sourcing allowed'],['MR-0246','Machine-cut stones','1,200 pcs','Church','KES 84,000','Direct sourcing allowed']]
  return <><PageIntro title="Approved sourcing queue" copy="Turn approved project demand into accountable supplier competition." action="Export sourcing plan" icon="download"/><section className="procurement-guardrail"><Icon name="lock" size={16}/><p><b>Demand is locked.</b> Procurement may source the approved item and quantity but cannot increase it, change the project, or approve the resulting purchase order.</p></section><section className="panel"><PanelHead title="Requests ready for Procurement" subtitle="Ordered by needed-by date"/><div className="procurement-source-list">{requests.map(row=><article key={row[0]}><b className="mono">{row[0]}</b><span><strong>{row[1]}</strong><small>{row[2]} · {row[3]}</small></span><b>{row[4]}</b><Status tone={row[5].startsWith('3')?'at-risk':'approved'}>{row[5]}</Status>{started.includes(row[0])?<Status>Sourcing open</Status>:<button onClick={()=>setSelected(row)}>Start sourcing <Icon name="arrow" size={13}/></button>}</article>)}</div></section>{selected&&<SourcingModal request={selected} onClose={()=>setSelected(null)} onComplete={()=>{setStarted(current=>[...current,selected[0]]);setSelected(null)}}/>}</>
}

function SourcingModal({request,onClose,onComplete}:{request:string[];onClose:()=>void;onComplete:()=>void}) {
  return <div className="modal-wrap"><div className="modal-backdrop" onClick={onClose}/><form className="modal sourcing-modal" onSubmit={event=>{event.preventDefault();onComplete()}}><div className="modal-head"><div><span className="eyebrow">SOURCE APPROVED REQUEST</span><h2>Open supplier quotation round</h2><p>{request[0]} · {request[3]}</p></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><div className="locked-order"><span>LOCKED DEMAND</span><strong>{request[1]}</strong><b>{request[2]}</b><small><Icon name="lock" size={12}/>Approved estimated value {request[4]}</small></div><div className="form-grid"><label className="full">Suppliers invited<select multiple required size={3}><option>Apex Steel Ltd</option><option>Steel Centre Kenya</option><option>Devki Steel Mills</option><option>Kaydee Hardware</option></select></label><label>Quotation deadline<input required type="datetime-local"/></label><label>Delivery required by<input required type="date"/></label><label className="full">Commercial instructions<textarea rows={2} placeholder="Delivery location, taxes, transport and payment terms…"/></label><label className="full cashier-confirm"><input required type="checkbox"/><span>I declare no undisclosed personal interest in the invited suppliers.</span></label></div><div className="control-callout"><Icon name="shield"/><div><b>The resulting PO remains a draft</b><span>A different authorised role must approve it before it can be issued to the supplier.</span></div></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Open quotation round</Button></div></form></div>
}

function ProcurementOrders() {
  const orders=[['PO-0192','MR-0248','Apex Steel Ltd','Gilgal 3','KES 412,800','Awaiting approval'],['PO-0191','MR-0244','Kaydee Hardware','SNEP HQ','KES 33,750','Draft'],['PO-0188','MR-0247','Bamburi Cement PLC','SNEP HQ','KES 171,000','Part delivered'],['PO-0187','MR-0246','Kaydee Hardware','Church','KES 84,000','Issued']]
  return <><PageIntro title="Purchase orders" copy="Prepare and follow orders without self-approval or goods receipt access." action="Create from approved request" icon="plus"/><section className="procurement-guardrail"><Icon name="shield" size={16}/><p><b>Submitting is not approving.</b> Draft POs preserve their requisition link, quote evidence and creator identity for independent approval.</p></section><section className="panel"><div className="po-role-table"><div className="po-role-row po-role-head"><span>PO</span><span>REQUEST</span><span>SUPPLIER</span><span>PROJECT</span><span>VALUE</span><span>STATUS</span><span></span></div>{orders.map(row=><div className="po-role-row" key={row[0]}><b className="mono">{row[0]}</b><span className="mono">{row[1]}</span><strong>{row[2]}</strong><span>{row[3]}</span><b>{row[4]}</b><Status>{row[5]}</Status><button>{row[5]==='Draft'?'Submit':'View'} <Icon name="arrow" size={12}/></button></div>)}</div></section></>
}

function ProcurementSuppliers() {
  const suppliers=[['Apex Steel Ltd','Steel & reinforcement','A013847219X','92%','Approved','3 open quotes'],['Bamburi Cement PLC','Cement','P000600438H','96%','Approved','1 open quote'],['Kaydee Hardware','General hardware','A008124190L','84%','Review due','2 open quotes'],['Mavoko Aggregates','Aggregates','A005671122P','89%','Approved','1 open quote']]
  return <><PageIntro title="Suppliers & quotations" copy="Commercial performance, compliance and competitive sourcing evidence." action="Add supplier" icon="plus"/><section className="supplier-alert"><Icon name="alert" size={17}/><span><b>Supplier bank-detail changes require independent verification.</b><small>Procurement can request a change but cannot make a new payout account immediately usable.</small></span></section><section className="panel"><PanelHead title="Approved supplier register" subtitle="KRA, compliance, performance and active sourcing"/><div className="supplier-role-list">{suppliers.map(row=><div key={row[0]}><div className="supplier-letter">{row[0][0]}</div><span><strong>{row[0]}</strong><small>{row[1]} · KRA {row[2]}</small></span><div><small>ON-TIME DELIVERY</small><b>{row[3]}</b></div><Status>{row[4]}</Status><span>{row[5]}</span><button><Icon name="eye" size={14}/>Profile</button></div>)}</div></section></>
}

function AuditEvidence() {
  const [selected,setSelected]=useState('AUD-0094')
  const findings=[['AUD-0094','High','Steel price above reference','KES 412,800'],['AUD-0091','High','Duplicate invoice reference','KES 384,000'],['AUD-0088','Medium','Transfer confirmation overdue','KES 156,000'],['AUD-0084','Medium','Round-number petty cash pattern','KES 50,000'],['AUD-0081','Low','Stock count submitted late','No direct exposure']]
  return <><PageIntro title="Evidence review" copy="Trace a flagged record through every predecessor, actor and attachment." action="Export selected evidence" icon="download"/><section className="auditor-guardrail"><Icon name="eye" size={16}/><p><b>Read-only evidence mode.</b> Notes are appended to the audit review; source transactions, approvals and attachments cannot be changed here.</p></section><section className="evidence-workspace"><aside className="panel finding-list"><PanelHead title="Audit sample" subtitle="5 items selected for review"/><div>{findings.map(finding=><button className={selected===finding[0]?'active':''} onClick={()=>setSelected(finding[0])} key={finding[0]}><span className={`severity ${finding[1].toLowerCase()}`}>{finding[1]}</span><span><b>{finding[2]}</b><small>{finding[0]} · {finding[3]}</small></span><Icon name="chevron" size={14}/></button>)}</div></aside><div className="panel evidence-detail"><div className="evidence-head"><div><span>SELECTED EVIDENCE CHAIN</span><h2>{selected} · Steel price above reference</h2><p>Gilgal 3 · Structural works · Apex Steel Ltd</p></div><Status tone="at-risk">Open finding</Status></div><div className="evidence-facts"><div><span>Financial exposure</span><b>KES 412,800</b></div><div><span>Reference price difference</span><b>+8.4%</b></div><div><span>Events in chain</span><b>7 verified</b></div><div><span>Attachments</span><b>5 hashed files</b></div></div><div className="evidence-timeline">{[['Material request','MR-0248','Samuel Kariuki · Foreman','25 Jul, 09:42','Created from device 8AF2'],['Supervisor approval','APR-0441','Steven Kakai · Supervisor','25 Jul, 10:06','Approved within KES 500K limit'],['Quote comparison','QC-0068','Paul Kimani · Procurement','25 Jul, 11:20','Apex selected; not lowest quote'],['Purchase order','PO-0192','Paul Kimani · Procurement','25 Jul, 11:34','Submitted for independent approval'],['Price exception','FLAG-0183','System control','25 Jul, 11:34','8.4% above reference price']].map((event,index)=><article key={event[1]}><i>{index+1}</i><div><span>{event[0]}</span><h3>{event[1]}</h3><p>{event[2]} · {event[3]}</p><small>{event[4]}</small></div><Icon name="check" size={15}/></article>)}</div><div className="hash-proof"><Icon name="lock" size={16}/><span><b>Hash chain verified</b><small>Previous: 7f4a…821c · Current: c92e…044a</small></span><button>Copy hashes</button></div></div></section></>
}

function AuditReports() {
  const reports=[['Monthly control assurance','All projects · July 2026','PDF + evidence index','Generated 24 Jul'],['Procurement exception report','Price, quote and supplier controls','XLSX','Generated 25 Jul'],['Inventory variance report','Counts, transfers and wastage','XLSX + photos','Generated 25 Jul'],['Payment audit trail','Approvals, execution and receipts','PDF + CSV','Generated 24 Jul']]
  return <><PageIntro title="Audit reports & exports" copy="Independent outputs generated from immutable source events." action="Build custom report" icon="plus"/><section className="report-control-note"><Icon name="shield" size={17}/><span><b>Every export carries a verification manifest.</b><small>Recipients can confirm that records and attachments have not changed after export.</small></span></section><section className="audit-report-grid">{reports.map(report=><article className="panel" key={report[0]}><div><Icon name="file" size={22}/><Status>Ready</Status></div><h3>{report[0]}</h3><p>{report[1]}</p><span>{report[2]}</span><footer><small>{report[3]}</small><button><Icon name="download" size={14}/>Download</button></footer></article>)}</section><section className="panel scheduled-reports"><PanelHead title="Scheduled assurance reports" subtitle="Delivery does not grant transactional access"/><div>{[['CEO weekly exception brief','Every Monday, 07:00','Josephine Charles','Active'],['Month-end stock variance','Last day, 18:00','CEO + Auditor','Active'],['High-value payment alert','On every payment > KES 500K','CEO + Auditor','Active']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><Status>{row[3]}</Status><button><Icon name="eye" size={14}/>View rule</button></div>)}</div></section></>
}

function MaterialTraceDrawer({ onClose }: { onClose: () => void }) {
  const [selectedId, setSelectedId] = useState(cementMaterialTrace.branches[0].id)
  const [proofOpen, setProofOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const selected = cementMaterialTrace.branches.find(branch => branch.id === selectedId) ?? cementMaterialTrace.branches[0]
  const unexplained = cementMaterialTrace.received - cementMaterialTrace.inStore - cementMaterialTrace.withForeman - cementMaterialTrace.used
  const bags = (value: number) => value.toLocaleString('en-KE')

  useEffect(() => {
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return <div className="material-trace-wrap" role="dialog" aria-modal="true" aria-labelledby="material-trace-title">
    <button className="material-trace-backdrop" type="button" onClick={onClose} aria-label="Close material journey"/>
    <aside className="material-trace-drawer">
      <header className="material-trace-head">
        <div><span><Icon name="lock" size={12}/> CEO ONLY · MATERIAL PATH</span><h2 id="material-trace-title">Where the 2,000 cement bags went</h2><p>{cementMaterialTrace.batch} · {cementMaterialTrace.source}</p></div>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close"><Icon name="close"/></button>
      </header>

      <div className="material-trace-body">
        <section className="material-balance">
          <div><span>Still in store</span><strong>{bags(cementMaterialTrace.inStore)}</strong><small>bags</small></div>
          <div><span>With foreman</span><strong>{bags(cementMaterialTrace.withForeman)}</strong><small>bags</small></div>
          <div><span>Used in work</span><strong>{bags(cementMaterialTrace.used)}</strong><small>bags</small></div>
          <div><span>Not explained</span><strong>{bags(unexplained)}</strong><small>bags</small></div>
        </section>
        <div className="material-balance-proof"><Icon name="check" size={17}/><div><strong>All 2,000 bags are accounted for</strong><span>1,248 in store + 124 with foreman + 628 used = 2,000</span></div></div>

        <section className="material-entry-card">
          <div className="material-trace-section-title"><h3>How they entered the store</h3><p>The need was approved before Procurement ordered.</p></div>
          <div>
            {cementMaterialTrace.entry.map((step,index) => <article key={step.reference}>
              <i><Icon name="check" size={13}/></i>
              <div><strong>{step.title}</strong><span>{step.actor} · {step.role}</span><small>{step.quantity} · {step.date}{proofOpen && <code> · {step.reference}</code>}</small></div>
              {index === cementMaterialTrace.entry.length - 1 && <Status tone="accepted">In store</Status>}
            </article>)}
          </div>
        </section>

        <section className="material-distribution">
          <div className="material-trace-section-title"><h3>Where they went</h3><p>Choose one project to see every person and approval.</p></div>
          <div className="material-branch-tabs">
            {cementMaterialTrace.branches.map(branch => <button className={branch.id === selected.id ? 'active' : ''} type="button" aria-pressed={branch.id === selected.id} onClick={() => setSelectedId(branch.id)} key={branch.id}>
              <span>{branch.project}</span><strong>{branch.released} bags</strong>
            </button>)}
          </div>

          <article className="material-branch-summary">
            <div><span>Work</span><strong>{selected.purpose}</strong></div>
            <div><span>Requested</span><strong>{selected.requested} bags</strong></div>
            <div><span>Released</span><strong>{selected.released} bags</strong></div>
            <div><span>Now</span><strong>{selected.used} used{selected.remaining ? ` · ${selected.remaining} held` : ''}</strong></div>
          </article>

          <div className="material-step-list">
            {selected.steps.map((step,index) => <article key={step.reference}>
              <i><Icon name="check" size={13}/></i>
              <div><strong>{step.title}</strong><span>{step.actor} · {step.role}</span><small>{step.quantity} · {step.date}{proofOpen && <code> · {step.reference}</code>}</small>{step.note && <em>{step.note}</em>}</div>
              <b>{index + 1}</b>
            </article>)}
          </div>
        </section>
      </div>

      <footer className="material-trace-actions"><span><Icon name="lock" size={14}/>Other roles see only their own step</span><button className="material-proof-toggle" type="button" aria-pressed={proofOpen} onClick={() => setProofOpen(!proofOpen)}><Icon name="shield" size={14}/>{proofOpen ? 'Hide proof' : 'Show proof'}</button><Button variant="secondary" onClick={onClose}>Close</Button></footer>
    </aside>
  </div>
}

function CeoStock({ stock, transfers }: { stock: readonly StoreStockRecord[]; transfers: readonly StoreTransferRecord[] }) {
  const [traceOpen, setTraceOpen] = useState(false)
  const journeyButtonRef = useRef<HTMLButtonElement>(null)
  const stores = Array.from(new Set(stock.map(item => item.store))).map(store => ({
    name: store,
    items: stock.filter(item => item.store === store),
  }))
  const movingTransfers = transfers.filter(transfer => transfer.status !== 'Ready to dispatch')
  const closeTrace = () => {
    setTraceOpen(false)
    requestAnimationFrame(() => journeyButtonRef.current?.focus())
  }

  return <div className="ceo-view ceo-stock-view">
    <section className="simple-summary-grid three ceo-stock-summary">
      <SimpleStat label="Stores reporting" value={`${stores.length}`} note="All project stores" tone="good"/>
      <SimpleStat label="Low in stores" value={`${stock.filter(item => item.level === 'Low stock').length} materials`} tone="danger"/>
      <SimpleStat label="Moving now" value={`${movingTransfers.length} transfers`} note="1 arrival is late" tone="warning"/>
    </section>

    <section className="ceo-material-follow">
      <i><Icon name="boxes" size={20}/></i>
      <div><span>CEO ONLY</span><strong>Follow the 2,000 cement bags</strong><small>See who requested, checked, approved, released and used them.</small></div>
      <div className="ceo-material-accounted"><Icon name="check" size={16}/><span><strong>2,000 of 2,000</strong><small>accounted for</small></span></div>
      <button ref={journeyButtonRef} className="button secondary" type="button" onClick={() => setTraceOpen(true)}><Icon name="eye" size={16}/>See journey</button>
    </section>

    <section className="ceo-stock-layout">
      <div className="panel">
        <PanelHead title="Inside the stores" subtitle="Still under storekeeper control"/>
        <div className="ceo-store-groups">
          {stores.map(store => {
            const lowItems = store.items.filter(item => item.level === 'Low stock').length
            const watchItems = store.items.filter(item => item.level === 'Watch').length
            return <article className="ceo-store-group" key={store.name}>
              <header><div><Icon name="boxes" size={17}/><span><strong>{store.name}</strong><small>{store.items.length} material {store.items.length === 1 ? 'type' : 'types'}</small></span></div><Status tone={lowItems || watchItems ? 'at-risk' : 'accepted'}>{lowItems ? `${lowItems} low` : watchItems ? 'Watch' : 'Okay'}</Status></header>
              <div>
                {store.items.map(item => <div className="ceo-store-item" key={`${item.store}-${item.material}`}>
                  <span><strong>{item.material}</strong><small>{item.category}</small></span>
                  <b>{item.onHand} {item.unit}</b>
                  <Status tone={item.level === 'Healthy' ? 'accepted' : 'at-risk'}>{item.level === 'Low stock' ? 'Refill soon' : item.level === 'Watch' ? 'Watch' : 'Enough'}</Status>
                </div>)}
              </div>
            </article>
          })}
        </div>
      </div>
      <div className="ceo-stock-side">
        <div className="panel">
          <PanelHead title="With site teams" subtitle="Issued from a store and held by a foreman"/>
          <div className="ceo-site-team-stock">
            {siteTeamMaterialRecords.map(item => <article key={`${item.project}-${item.material}`}>
              <div><strong>{item.material}</strong><span>{item.project} · {item.holder}</span></div>
              <b>{item.quantity}</b>
            </article>)}
          </div>
        </div>
        <div className="panel">
          <PanelHead title="Moving between stores" subtitle="The receiving store must confirm arrival"/>
          <div className="ceo-transfer-list">
            {movingTransfers.map(transfer => {
              const plainStatus = transfer.status === 'Awaiting receipt' ? 'Arrival late' : 'On the way'
              const stages = transfer.status === 'Awaiting receipt' ? ['done','done','current'] : ['done','current','pending']
              return <article key={transfer.reference}>
                <header><div><strong>{transfer.material} · {transfer.quantity}</strong><span>{transfer.fromProject} store → {transfer.toProject} store</span></div><Status tone={transfer.status === 'Awaiting receipt' ? 'at-risk' : 'issued'}>{plainStatus}</Status></header>
                <div className="ceo-transfer-journey">
                  {['Sent','On the way','Received'].map((label,index) => <span className={stages[index]} key={label}><i>{stages[index] === 'done' ? <Icon name="check" size={13}/> : index + 1}</i><b>{label}</b></span>)}
                </div>
              </article>
            })}
          </div>
        </div>
      </div>
    </section>
    {traceOpen && <MaterialTraceDrawer onClose={closeTrace}/>}
  </div>
}

function Inventory({readOnly=false,ownerView=false,projectScope=[...allProjectNames]}:{readOnly?:boolean;ownerView?:boolean;projectScope?:ProjectName[]}) {
  const visibleStoreStock = storeStockRecords.filter(item => projectScope.includes(item.project))
  const visibleStoreTransfers = storeTransferRecords.filter(transfer => projectScope.includes(transfer.fromProject) || projectScope.includes(transfer.toProject))
  const stock = visibleStoreStock.map(item => [item.material,item.category,item.unit,item.onHand,item.store,item.level])
  const transfers = visibleStoreTransfers.filter(transfer => transfer.status !== 'Ready to dispatch').map(transfer => [transfer.reference,transfer.fromProject,transfer.toProject,`${transfer.material} · ${transfer.quantity}`,transfer.status,transfer.age])
  if (ownerView) return <CeoStock stock={visibleStoreStock} transfers={visibleStoreTransfers}/>
  return <>
    <PageIntro title="Materials & stores" copy="Live balances, accountable movements, and dual-confirmed transfers." action={readOnly?'Export stock view':'Record movement'} icon={readOnly?'download':'swap'}/>
    {readOnly&&<section className="role-guardrail owner-readonly-note"><Icon name="eye" size={17}/><p><b>Read-only movement view:</b> Storekeepers record receipts, issues and transfers. Supervisors and the CEO monitor custody and exceptions without altering stock.</p></section>}
    <section className="metrics-grid compact">
      <Metric label="Assigned stores" value={`${projectScope.length} sites`} note={projectScopeLabel(projectScope)} icon="boxes" tone="navy"/>
      <Metric label="Low-stock items" value={`${stock.filter(row=>row[5]==='Low stock').length} items`} note="Within assigned projects" icon="alert" tone="orange"/>
      <Metric label="Visible transfers" value={`${transfers.length} transfers`} note="Involving an assigned site" icon="truck" tone="green"/>
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
        {transfers.map(t=><div className="transfer" key={t[0]}><div className="transfer-top"><b className="mono">{t[0]}</b><Status>{t[4]}</Status></div><div className="route"><span>{t[1]}</span><i><Icon name="arrow" size={14}/></i><span>{t[2]}</span></div><p>{t[3]}</p><small><Icon name="clock" size={13}/>{t[5]} since dispatch</small></div>)}
      </aside>
    </section>
  </>
}

function SupervisorBudget({ projectScope }: { projectScope: ProjectName[] }) {
  const bars=[['Gilgal 2',48.2,31.4,5.7],['Gilgal 3',36.5,28.9,3.2],['SNEP HQ',72,20.6,9.8],['Church',25.8,8.3,2.1]].filter(row=>projectScope.includes(row[0] as ProjectName))
  const budget=bars.reduce((total,row)=>total+Number(row[1]),0)
  const spent=bars.reduce((total,row)=>total+Number(row[2]),0)
  const committed=bars.reduce((total,row)=>total+Number(row[3]),0)
  const watchItems=[['high','HIGH','Gilgal 3 · Structural works','92% reserved while the structural stage is 78% complete.','KES 680,000 remains'],['medium','WATCH','SNEP HQ · Masonry','Cement price is trending 6% above the reference rate.','Review next requisition'],['low','GOOD','Church · Foundation','Work completed KES 240,000 below its allocated cost.','Funds remain in the cost code'],['low','GOOD','Gilgal 2 · Roof works','Spending and verified progress remain aligned.','No intervention required']].filter(row=>projectScope.some(project=>row[2].startsWith(project)))
  return <>
    <PageIntro title="Project budget tracking" copy={`Read-only spending and commitments for ${projectScopeLabel(projectScope)}.`} action="Download report" icon="download"/>
    <section className="role-guardrail supervisor-budget-note"><Icon name="eye" size={17}/><p><b>Read-only financial view:</b> supervisors use this information to control site work. Invoice approval and payment execution remain separated.</p></section>
    <section className="metrics-grid compact">
      <Metric label="Approved project budgets" value={`KES ${budget.toFixed(1)}M`} note={`${projectScope.length} assigned projects`} icon="wallet" tone="navy"/>
      <Metric label="Already spent" value={`KES ${spent.toFixed(1)}M`} note={`${budget ? (spent/budget*100).toFixed(1) : '0.0'}% of assigned budget`} icon="trend" tone="green"/>
      <Metric label="Approved orders" value={`KES ${committed.toFixed(1)}M`} note="Not paid yet" icon="file" tone="orange"/>
      <Metric label="Available to plan" value={`KES ${(budget-spent-committed).toFixed(1)}M`} note="After open commitments" icon="check" tone="green"/>
    </section>
    <section className="supervisor-budget-grid">
      <div className="panel">
        <PanelHead title="Cost position by project" subtitle="Paid and committed amounts against the approved budget"/>
        <div className="budget-bars">{bars.map(([n,b,s,c])=><div key={String(n)}><div><b>{n}</b><span><strong>KES {Number(s).toFixed(1)}M</strong> paid · KES {Number(c).toFixed(1)}M ordered</span><em>KES {Number(b).toFixed(1)}M budget</em></div><div className="stack-bar"><i style={{width:`${Number(s)/Number(b)*100}%`}}/><b style={{width:`${Number(c)/Number(b)*100}%`}}/></div></div>)}</div>
        <div className="legend"><span><i/>Already paid</span><span><i/>Approved orders</span><span><i/>Still available</span></div>
      </div>
      <aside className="panel budget-watch">
        <PanelHead title="Supervisor’s budget watch" subtitle="Areas to manage before raising more requests"/>
        {watchItems.map(row=><div key={row[2]}><span className={`severity ${row[0]}`}>{row[1]}</span><section><b>{row[2]}</b><p>{row[3]}</p><small>{row[4]}</small></section></div>)}
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
    {reference:'PAY-0420',supplier:'Mavoko Aggregates',invoice:'INV-1072',project:'Gilgal 2',method:'M-Pesa',amount:'63,000'},
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
      <div className="cashier-desk-head"><div><h3>Approved payment queue</h3><p>Approval and delivery checks were completed by other roles.</p></div></div>
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
        {[['Gilgal 2','182,400','24 Jul, 17:30','No variance'],['Gilgal 3','94,850','24 Jul, 17:12','KES 1,150 under review'],['SNEP HQ','287,000','23 Jul, 17:46','No variance'],['Church','120,000','24 Jul, 16:58','No variance']].map(row=><div key={row[0]}><strong>{row[0]}</strong><span>KES {row[1]}</span><small>Last reconciled {row[2]}</small><Status tone={row[3] === 'No variance' ? 'accepted' : 'at-risk'}>{row[3]}</Status><button>Open ledger <Icon name="arrow" size={13}/></button></div>)}
      </div>
    </section>:<section className="panel">
      <PanelHead title="Payment history" subtitle="Completed transactions with external references"/>
      <div className="cashier-history">
        {[['PAY-0418','Bamburi Cement PLC','SNEP HQ','KES 684,000','FT26206K1','Today, 09:18'],['PAY-0417','Musa Electrical Works','Gilgal 3','KES 420,000','QGH8D22Q1','23 Jul, 15:42'],['PAY-0416','Mavoko Aggregates','Church','KES 126,000','QGH7M90P3','23 Jul, 11:06']].map(row=><div key={row[0]}><b className="mono">{row[0]}</b><strong>{row[1]}</strong><span>{row[2]}</span><b>{row[3]}</b><span className="mono">{row[4]}</span><small>{row[5]}</small><button><Icon name="receipt" size={15}/>Receipt</button></div>)}
      </div>
    </section>}
    {selectedPayment&&<PaymentExecutionModal payment={selectedPayment} onClose={()=>setSelectedPayment(null)} onComplete={()=>execute(selectedPayment)}/>}
    {toast&&<div className="toast"><Icon name="check"/>{toast}</div>}
  </>
}

function Finance() {
  const bars=[['Gilgal 2',48.2,31.4,5.7],['Gilgal 3',36.5,28.9,3.2],['SNEP HQ',72,20.6,9.8],['Church',25.8,8.3,2.1]]
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)
  return <div className="ceo-view ceo-money-view">
    <section className="simple-summary-grid four ceo-money-summary">
      <SimpleStat label="Budget" value="KES 182.5M"/>
      <SimpleStat label="Paid" value="KES 89.2M" note="Money already sent"/>
      <SimpleStat label="Ordered, not yet paid" value="KES 20.8M" tone="warning"/>
      <SimpleStat label="Money left" value="KES 72.5M" tone="good"/>
    </section>

    <section className="panel ceo-money-projects">
      <PanelHead title="Money by project" subtitle="Paid, ordered and still available"/>
      <div className="ceo-money-project-list">
        {bars.map(([name,budget,spent,ordered]) => {
          const left = Number(budget) - Number(spent) - Number(ordered)
          const attention = name === 'Gilgal 3'
          return <article className={attention ? 'attention' : ''} key={String(name)}>
            <strong>{name}</strong>
            <div><b>KES {Number(spent).toFixed(1)}M paid</b><span>of KES {Number(budget).toFixed(1)}M budget</span></div>
            <div><b>KES {Number(ordered).toFixed(1)}M ordered</b><span>KES {left.toFixed(1)}M left</span></div>
            <Status tone={attention ? 'at-risk' : 'accepted'}>{attention ? 'Watch' : 'Okay'}</Status>
          </article>
        })}
      </div>
    </section>

    <section className="panel ceo-money-movement">
      <PanelHead title="Latest money movement" subtitle="Open an item only when you want to see its steps"/>
      <div className="ceo-money-movement-list">
        {transactionChains.map(chain => {
          const plainStatus = chain.status === 'Paid & audited' ? 'Paid' : chain.status === 'Finance review' ? 'Being checked' : 'Needs your decision'
          const tone = chain.status === 'Paid & audited' ? 'accepted' : chain.status === 'Finance review' ? 'issued' : 'at-risk'
          return <article key={chain.id}>
            <div><strong>{chain.item}</strong><span>{chain.project} · {chain.supplier}</span></div>
            <b>KES {chain.amount.toLocaleString('en-KE')}</b>
            <Status tone={tone}>{plainStatus}</Status>
            <Button variant="secondary" onClick={() => setSelectedChain(chain)}>{chain.ceoActionRequired ? 'Review' : 'See steps'}</Button>
          </article>
        })}
      </div>
    </section>
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="CEO"/>
  </div>
}

function Workforce({readOnly=false,projectScope=[...allProjectNames]}:{readOnly?:boolean;projectScope?:ProjectName[]}) {
  const rows=[['Gilgal 2','38','12 masons · 18 labourers · 8 skilled','Gilgal Sites Foreman','Confirmed'],['Gilgal 3','31','9 masons · 16 labourers · 6 skilled','Gilgal Sites Foreman','Confirmed'],['SNEP HQ','42','14 masons · 20 labourers · 8 skilled','Church & SNEP Foreman','Confirmed'],['Church','15','5 masons · 7 labourers · 3 skilled','Church & SNEP Foreman','Confirmed']].filter(row=>projectScope.includes(row[0] as ProjectName))
  const headcount=rows.reduce((total,row)=>total+Number(row[1]),0)
  return <GenericOperations
    title="Workforce & labour" copy="Site attendance and subcontractor obligations, without phantom headcount." action={readOnly?'Download attendance':'Log attendance'} readOnly={readOnly}
    metrics={[['On site today',`${headcount} people`,projectScopeLabel(projectScope),'users','navy'],['Attendance logged',`${rows.length} of ${projectScope.length} sites`,'Complete by 08:15','check','green'],['Assigned sites',`${projectScope.length} projects`,'User scope enforced','file','orange'],['Pending payroll','Controlled by Finance','Read-only here','clock','red']]}
    heading="Today’s site attendance"
    rows={rows}
  />
}

function Equipment({readOnly=false,projectScope=[...allProjectNames]}:{readOnly?:boolean;projectScope?:ProjectName[]}) {
  const rows=[['EQ-0038','Concrete mixer 400L · Gilgal 2','Plant','Gilgal Sites Foreman','In use'],['EQ-0071','Plate compactor · Church','Plant','Church & SNEP Foreman','Service due'],['TL-0244','Bosch rotary hammer · SNEP HQ','Power tool','Church & SNEP Foreman','In use'],['EQ-0018','Diesel generator 12kVA · Gilgal 3','Plant','Gilgal Sites Foreman','Available']].filter(row=>projectScope.some(project=>row[1].includes(project)))
  return <GenericOperations
    title="Equipment & tools" copy="Assignment history, condition reports and rental exposure by site." action={readOnly?'Export asset view':'Register equipment'} readOnly={readOnly}
    metrics={[['Visible assets',`${rows.length} demo records`,projectScopeLabel(projectScope),'tool','navy'],['Currently assigned',`${rows.filter(row=>row[4]==='In use').length} in use`,'Assigned project equipment','check','green'],['Due for service',`${rows.filter(row=>row[4]==='Service due').length} items`,'Within assigned sites','clock','orange'],['Project access',`${projectScope.length} sites`,'No cross-team records','wallet','red']]}
    heading="Equipment register"
    rows={rows}
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

function CeoRecords() {
  const navigate = useNavigate()
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)
  return <div className="ceo-view ceo-records-view">
    <section className="ceo-record-protection"><i><Icon name="shield" size={22}/></i><div><strong>Records are protected</strong><span>No recent record has been changed or removed.</span></div><Status tone="accepted">Protected</Status></section>

    <section className="panel ceo-record-attention">
      <PanelHead title="Needs attention" subtitle="3 items"/>
      <div className="ceo-record-attention-list">
        <article><i className="danger"><Icon name="lock" size={18}/></i><div><strong>A self-approval was stopped</strong><span>The same person tried to request and approve a purchase. No money moved.</span></div><Status tone="accepted">Stopped</Status></article>
        <article><i className="warning"><Icon name="alert" size={18}/></i><div><strong>Steel price is higher than usual</strong><span>Gilgal 3 · KES 412,800 · Finance is checking it</span></div><Button variant="secondary" onClick={() => setSelectedChain(transactionChains[1])}>See steps</Button></article>
        <article><i className="warning"><Icon name="truck" size={18}/></i><div><strong>Church store has not confirmed a transfer</strong><span>32 timber pieces sent from Gilgal 2 store</span></div><Button variant="secondary" onClick={() => navigate('/inventory')}>Open movement</Button></article>
      </div>
    </section>

    <section className="panel ceo-purchase-trace">
      <PanelHead title="Trace a purchase" subtitle="See the five main steps from request to payment"/>
      <div className="ceo-purchase-trace-list">
        {transactionChains.map(chain => {
          const plainStatus = chain.status === 'Paid & audited' ? 'Complete' : chain.status === 'Finance review' ? 'Being checked' : 'Needs your decision'
          const tone = chain.status === 'Paid & audited' ? 'accepted' : chain.status === 'Finance review' ? 'issued' : 'at-risk'
          return <article key={chain.id}>
            <div><strong>{chain.item}</strong><span>{chain.project}</span></div>
            <b>KES {chain.amount.toLocaleString('en-KE')}</b>
            <Status tone={tone}>{plainStatus}</Status>
            <Button variant="secondary" onClick={() => setSelectedChain(chain)}>See steps</Button>
          </article>
        })}
      </div>
    </section>
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="CEO"/>
  </div>
}

function Audit({readOnly=false,ownerView=false}:{readOnly?:boolean;ownerView?:boolean}) {
  if (ownerView) return <CeoRecords/>
  const events=[['10:42:18','Steven Kakai','APPROVED','Purchase order PO-0192','KES 412,800 · Gilgal 3','197.232.44.18'],['10:18:04','Lucy Njeri','CREATED','GRN-0112','Short delivery: 40 bags · SNEP HQ','41.90.64.202'],['09:57:36','James Kamau','APPROVED','Payment PAY-0419','KES 171,000 · Bamburi Cement','102.68.78.11'],['09:42:12','Samuel Kariuki','CREATED','Requisition MR-0248','240 lengths Y12 steel · Gilgal 3','105.163.2.84'],['08:16:50','Daniel Otieno','CREATED','Requisition MR-0247','180 bags cement · SNEP HQ','41.90.64.199']]
  return <>
    <PageIntro title="Audit & control centre" copy="Immutable activity history and automated fraud-control exceptions." action="Export audit report" icon="download"/>
    {readOnly&&<section className="auditor-guardrail"><Icon name="eye" size={16}/><p><b>{ownerView?'CEO oversight mode.':'Auditor read-only mode.'}</b> You may search, trace and export this evidence. Control configuration and source-record changes remain unavailable.</p></section>}
    <section className="control-banner"><div><Icon name="shield" size={24}/></div><div><b>Audit chain verified</b><span>128,492 consecutive events · Last verification today at 10:45 EAT</span></div><Status>Integrity intact</Status></section>
    <section className="audit-grid">
      <div className="panel exceptions"><PanelHead title="Open control exceptions" subtitle="Prioritised by financial and operational risk" action={readOnly?'View rule definitions':'Control rules'}/>
        {[['High','Segregation check blocked an approval','Requester attempted to approve MR-0243','Today, 08:51'],['High','Invoice price exceeds reference by 8.4%','INV-8831 · Apex Steel Ltd · KES 412,800','Yesterday, 16:02'],['Medium','Transfer confirmation is overdue','TR-0063 · Gilgal 2 → Church · 3 days','22 Jul, 14:18'],['Low','Repeated round-number petty cash entries','5 entries at KES 10,000 · Gilgal 3','20 Jul, 17:40']].map(x=><div key={x[1]}><span className={`severity ${x[0].toLowerCase()}`}>{x[0]}</span><div><b>{x[1]}</b><span>{x[2]}</span></div><time>{x[3]}</time><button><Icon name="chevron" size={15}/></button></div>)}
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
    ['S1','Gilgal Sites Supervisor','Supervisor','Gilgal 2 · Gilgal 3','Active'],
    ['S2','Church & SNEP Supervisor','Supervisor','Church · SNEP HQ','Active'],
    ['E1','Gilgal Sites Engineer','Engineer','Gilgal 2 · Gilgal 3','Active'],
    ['E2','Church & SNEP Engineer','Engineer','Church · SNEP HQ','Active'],
    ['F1','Gilgal Sites Foreman','Foreman','Gilgal 2 · Gilgal 3','Active'],
    ['F2','Church & SNEP Foreman','Foreman','Church · SNEP HQ','Active'],
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

      <div className="people-table"><div className="people-row people-head"><span>PERSON</span><span>ROLE</span><span>PROJECT ACCESS</span><span>STATUS</span><span>LAST ACTIVE</span><span></span></div>
        {people.map((p,i)=><div className="people-row" key={p[1]}><div className="person"><span>{p[0]}</span><div><b>{p[1]}</b><small>{demoEmail(p[1])}</small></div></div><span>{p[2]}</span><span>{p[3]}</span><Status>{p[4]}</Status><span>{i<2?'Today':i===2?'Yesterday':'23 Jul'}</span><button><Icon name="more"/></button></div>)}
      </div>
    </section>:tab==='Approval policy'?<section className="settings-grid">
      <div className="panel"><PanelHead title="Spend and payment thresholds" subtitle="Purchase commitment stays separate from invoice authorisation"/>
        <div className="policy-list">{[['Up to KES 100,000','Supervisor PO approval → Finance authorisation','CEO observes'],['KES 100,001 – 500,000','Supervisor PO approval → Finance authorisation','Two independent controls'],['Above KES 500,000','Finance review → CEO exception decision','Before the PO is issued']].map(p=><div key={p[0]}><div><b>{p[0]}</b><span>{p[2]}</span></div><strong>{p[1]}</strong><button><Icon name="settings" size={15}/>Edit</button></div>)}</div>
      </div>
      <aside className="panel"><PanelHead title="Structural controls" subtitle="Mandatory safeguards"/>
        <div className="toggle-list">{[['Segregation of duties','Requester cannot approve, receive or pay'],['Three-way invoice match','PO, GRN and invoice must agree'],['Dual-confirmed transfers','Both stores must confirm quantity'],['Immutable transaction history','Changes create a superseding version']].map(t=><div key={t[0]}><div><b>{t[0]}</b><span>{t[1]}</span></div><i className="toggle on"><em/></i></div>)}</div>
      </aside>
    </section>:<section className="panel empty-config"><div><Icon name={tab==='Cost codes'?'receipt':tab==='Notifications'?'bell':'building'} size={28}/></div><h3>{tab}</h3><p>This configuration area is ready for its corresponding backend endpoint.</p><Button variant="secondary">Configure {tab.toLowerCase()}</Button></section>}
  </>
}

function LiveSession() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>()
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    authApi.me(controller.signal)
      .then(user => {
        setCurrentUser(user)
        setSessionError(null)
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setCurrentUser(null)
        if (!(error instanceof ApiError && error.status === 401)) {
          setSessionError(error instanceof Error ? error.message : 'The server could not be reached.')
        }
      })

    return () => controller.abort()
  }, [])

  if (currentUser === undefined) {
    return <main className="lav-session-state" role="status"><span/><p>Opening your workspace…</p></main>
  }

  if (currentUser === null) {
    return <>
      {sessionError && <div className="lav-bootstrap-notice" role="alert">{sessionError}</div>}
      {sessionMessage && <div className="lav-bootstrap-notice success" role="status">{sessionMessage}</div>}
      <LiveLoginView onAuthenticated={user => {
        setCurrentUser(user)
        setSessionError(null)
        setSessionMessage(null)
      }}/>
    </>
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      setCurrentUser(null)
    }
  }

  const switchRole = async (role: ConstructionRole) => {
    const user = await authApi.switchRole({ role })
    setCurrentUser(user)
  }

  return <BrowserRouter><Shell
    authenticatedUser={currentUser}
    onLogout={logout}
    onSwitchRole={switchRole}
    onUsernameChanged={() => {
      setCurrentUser(null)
      setSessionError(null)
      setSessionMessage('Username changed. Sign in with your new username.')
    }}
    onPasswordChanged={() => {
      setCurrentUser(null)
      setSessionError(null)
      setSessionMessage('Password changed. Sign in with your new password.')
    }}
  /></BrowserRouter>
}

export default function App() {
  return <Suspense fallback={<main className="lav-session-state" role="status"><span/><p>Opening your workspace…</p></main>}>
    {isLiveApiMode ? <LiveSession/> : <BrowserRouter><Shell/></BrowserRouter>}
  </Suspense>
}
