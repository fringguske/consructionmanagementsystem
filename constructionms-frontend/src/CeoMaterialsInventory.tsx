import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type {
  CurrentUser,
  GoodsReceipt,
  MaterialIssue,
  PurchaseOrder,
  Requisition,
  StockBalance,
  StockCount,
  StockLedgerEntry,
  StockTransfer,
} from './api'
import './ceo-materials-inventory.css'

type InventoryTab = 'overview' | 'ledger' | 'movements' | 'exceptions'
type StockState = 'In stock' | 'Low stock' | 'Out of stock'

type MaterialPosition = {
  materialId: number
  materialName: string
  category: string
  unit: string
  inStore: number
  siteCustody: number
  inTransit: number
  reorderLevel: number
  totalControlled: number
  status: StockState
}

type MovementContext = {
  entry: StockLedgerEntry
  action: string
  route: string
  recipient: string
  approvedBy: string
  activity: string
}

type Props = {
  currentUser: CurrentUser
  balances: StockBalance[]
  ledger: StockLedgerEntry[]
  issues: MaterialIssue[]
  transfers: StockTransfer[]
  counts: StockCount[]
  receipts: GoodsReceipt[]
  requisitions: Requisition[]
  orders: PurchaseOrder[]
}

function number(value: number) {
  return new Intl.NumberFormat('en-KE', { maximumFractionDigits: 3 }).format(value)
}

function quantity(value: number, unit: string) {
  return `${number(value)} ${unit}`
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function inputDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function custodyAmount(issue: MaterialIssue) {
  const received = issue.status === 'AwaitingConfirmation'
    ? issue.quantityIssued
    : issue.confirmedQuantity ?? 0
  return Math.max(0, received - issue.usedQuantity - issue.wastedQuantity)
}

function materialPositions(
  balances: StockBalance[],
  issues: MaterialIssue[],
  transfers: StockTransfer[],
  ledger: StockLedgerEntry[],
) {
  const ids = new Set<number>()
  balances.forEach(item => ids.add(item.materialId))
  issues.forEach(item => ids.add(item.materialId))
  transfers.forEach(item => ids.add(item.materialId))
  ledger.forEach(item => ids.add(item.materialId))

  return [...ids].map(materialId => {
    const balance = balances.find(item => item.materialId === materialId)
    const issue = issues.find(item => item.materialId === materialId)
    const transfer = transfers.find(item => item.materialId === materialId)
    const movement = ledger.find(item => item.materialId === materialId)
    const materialName = balance?.materialName ?? issue?.materialName ?? transfer?.materialName ?? movement?.materialName ?? 'Material'
    const unit = balance?.unit ?? issue?.materialUnit ?? transfer?.materialUnit ?? movement?.unit ?? 'units'
    const inStore = balances.filter(item => item.materialId === materialId).reduce((sum, item) => sum + item.quantityOnHand, 0)
    const siteCustody = issues.filter(item => item.materialId === materialId).reduce((sum, item) => sum + custodyAmount(item), 0)
    const inTransit = transfers.filter(item => item.materialId === materialId && item.status === 'InTransit').reduce((sum, item) => sum + item.quantity, 0)
    const reorderLevel = Math.max(0, ...balances.filter(item => item.materialId === materialId).map(item => item.reorderLevel))
    const status: StockState = inStore <= 0 ? 'Out of stock' : inStore <= reorderLevel ? 'Low stock' : 'In stock'
    return {
      materialId,
      materialName,
      category: balance?.category ?? 'Other',
      unit,
      inStore,
      siteCustody,
      inTransit,
      reorderLevel,
      totalControlled: inStore + siteCustody + inTransit,
      status,
    }
  }).sort((a, b) => a.materialName.localeCompare(b.materialName))
}

function movementContext(
  entry: StockLedgerEntry,
  issues: MaterialIssue[],
  transfers: StockTransfer[],
  counts: StockCount[],
  receipts: GoodsReceipt[],
  requisitions: Requisition[],
  orders: PurchaseOrder[],
): MovementContext {
  const issue = entry.referenceType === 'MaterialIssue'
    ? issues.find(item => item.id === entry.referenceId)
    : undefined
  const transfer = entry.referenceType === 'StockTransfer'
    ? transfers.find(item => item.id === entry.referenceId)
    : undefined
  const count = entry.referenceType === 'StockCount'
    ? counts.find(item => item.id === entry.referenceId)
    : undefined
  const receipt = entry.referenceType === 'GoodsReceipt'
    ? receipts.find(item => item.id === entry.referenceId)
    : undefined
  const requisitionId = issue?.requisitionId ?? receipt?.requisitionId
  const requisition = requisitions.find(item => item.id === requisitionId)
  const order = receipt ? orders.find(item => item.id === receipt.purchaseOrderId) : undefined

  if (issue) return {
    entry,
    action: `Issued to ${issue.issuedToName}`,
    route: `${entry.projectName} Store → ${issue.issuedToName}`,
    recipient: issue.issuedToName,
    approvedBy: requisition?.decidedByUserName ?? 'Supervisor approval recorded',
    activity: requisition ? `${requisition.costCodeName}: ${requisition.purpose}` : entry.projectName,
  }
  if (receipt) return {
    entry,
    action: 'Received',
    route: `${receipt.supplierName} → ${entry.projectName} Store`,
    recipient: `${entry.projectName} Store`,
    approvedBy: order?.approvedByUserName ?? 'Purchase order approval recorded',
    activity: requisition ? `${requisition.costCodeName}: ${requisition.purpose}` : entry.projectName,
  }
  if (transfer) return {
    entry,
    action: entry.movementType === 'TransferOut' ? 'Transfer dispatched' : 'Transfer received',
    route: `${transfer.fromProjectName} Store → ${transfer.toProjectName} Store`,
    recipient: transfer.receivedByName ?? `${transfer.toProjectName} Store`,
    approvedBy: transfer.requestedByName,
    activity: transfer.reason,
  }
  if (count) return {
    entry,
    action: 'Count adjusted',
    route: `${entry.projectName} Store`,
    recipient: `${entry.projectName} Store`,
    approvedBy: count.reviewedByName ?? 'Awaiting Supervisor review',
    activity: count.notes,
  }
  return {
    entry,
    action: entry.movementType.replaceAll(/([A-Z])/g, ' $1').trim(),
    route: `${entry.projectName} Store`,
    recipient: `${entry.projectName} Store`,
    approvedBy: 'Recorded workflow',
    activity: entry.notes ?? entry.projectName,
  }
}

export function CeoMaterialsInventory(props: Props) {
  const { currentUser, balances, ledger, issues, transfers, counts, receipts, requisitions, orders } = props
  const [tab, setTab] = useState<InventoryTab>('overview')
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null)
  const [expandedMovementId, setExpandedMovementId] = useState<number | null>(null)
  const now = useMemo(() => new Date(), [])
  const [fromDate, setFromDate] = useState(inputDate(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [toDate, setToDate] = useState(inputDate(now))
  const [projectId, setProjectId] = useState('all')
  const [category, setCategory] = useState('all')
  const [stockStatus, setStockStatus] = useState('all')

  const positions = useMemo(
    () => materialPositions(balances, issues, transfers, ledger),
    [balances, issues, transfers, ledger],
  )
  const contexts = useMemo(
    () => [...ledger]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime() || b.id - a.id)
      .map(entry => movementContext(entry, issues, transfers, counts, receipts, requisitions, orders)),
    [ledger, issues, transfers, counts, receipts, requisitions, orders],
  )
  const selected = positions.find(item => item.materialId === selectedMaterialId) ?? null

  if (selected) return <MaterialStockCard
    position={selected}
    movements={contexts.filter(item => item.entry.materialId === selected.materialId)}
    issues={issues.filter(item => item.materialId === selected.materialId)}
    expandedMovementId={expandedMovementId}
    setExpandedMovementId={setExpandedMovementId}
    onBack={() => { setSelectedMaterialId(null); setExpandedMovementId(null) }}
  />

  const pendingHandovers = issues.filter(item => item.status === 'AwaitingConfirmation')
  const countDifferences = counts.filter(item => item.status === 'AwaitingReview' && item.variance !== 0)
  const disputedTransfers = transfers.filter(item => item.status === 'Disputed')
  const categories = [...new Set(positions.map(item => item.category))].sort()

  const from = new Date(`${fromDate}T00:00:00`)
  const toExclusive = new Date(`${toDate}T00:00:00`)
  toExclusive.setDate(toExclusive.getDate() + 1)
  const scopedLedger = ledger.filter(item => projectId === 'all' || item.projectId === Number(projectId))
  const scopedIssues = issues.filter(item => projectId === 'all' || item.projectId === Number(projectId))
  const scopedMaterialIds = new Set([
    ...scopedLedger.map(item => item.materialId),
    ...scopedIssues.map(item => item.materialId),
    ...balances.filter(item => projectId === 'all' || item.projectId === Number(projectId)).map(item => item.materialId),
  ])
  const ledgerRows = positions.map(position => {
    const materialEntries = scopedLedger.filter(item => item.materialId === position.materialId)
    const opening = materialEntries.filter(item => new Date(item.occurredAt) < from).reduce((sum, item) => sum + item.quantityDelta, 0)
    const periodEntries = materialEntries.filter(item => {
      const occurred = new Date(item.occurredAt)
      return occurred >= from && occurred < toExclusive
    })
    const received = periodEntries.filter(item => item.movementType === 'Receipt' || item.movementType === 'TransferIn').reduce((sum, item) => sum + Math.max(0, item.quantityDelta), 0)
    const issued = Math.abs(periodEntries.filter(item => item.movementType === 'Issue' || item.movementType === 'TransferOut').reduce((sum, item) => sum + Math.min(0, item.quantityDelta), 0))
    const returned = periodEntries.filter(item => item.movementType === 'Return').reduce((sum, item) => sum + Math.max(0, item.quantityDelta), 0)
    const other = periodEntries.filter(item => !['Receipt', 'TransferIn', 'Issue', 'TransferOut', 'Return'].includes(item.movementType)).reduce((sum, item) => sum + item.quantityDelta, 0)
    const closing = opening + periodEntries.reduce((sum, item) => sum + item.quantityDelta, 0)
    const usage = scopedIssues.flatMap(item => item.materialId === position.materialId ? item.usage : []).filter(item => {
      const occurred = new Date(item.recordedAt)
      return occurred >= from && occurred < toExclusive
    })
    const consumed = usage.filter(item => item.usageType === 'Used').reduce((sum, item) => sum + item.quantity, 0)
    const wasted = usage.filter(item => item.usageType === 'Wastage').reduce((sum, item) => sum + item.quantity, 0)
    const status: StockState = closing <= 0 ? 'Out of stock' : closing <= position.reorderLevel ? 'Low stock' : 'In stock'
    return { ...position, opening, received, issued, returned, other, closing, consumed, wasted, status }
  }).filter(item => projectId === 'all' || scopedMaterialIds.has(item.materialId))
    .filter(item => category === 'all' || item.category === category)
    .filter(item => stockStatus === 'all' || item.status === stockStatus)
  const showOther = ledgerRows.some(item => item.other !== 0)
  const showUsage = ledgerRows.some(item => item.consumed !== 0 || item.wasted !== 0)

  return <section className="ceo-inventory">
    <nav className="ceo-inventory-tabs" aria-label="Materials inventory sections">
      {([
        ['overview', 'Overview'],
        ['ledger', 'Materials ledger'],
        ['movements', 'Movement history'],
        ['exceptions', 'Counts & exceptions'],
      ] as [InventoryTab, string][]).map(([value, label]) => <button
        type="button"
        key={value}
        className={tab === value ? 'active' : ''}
        aria-current={tab === value ? 'page' : undefined}
        onClick={() => setTab(value)}
      >{label}</button>)}
    </nav>

    {tab === 'overview' && <>
      <div className="ceo-inventory-summary">
        <article><strong>{positions.length}</strong><span>materials tracked</span></article>
        <article className={positions.some(item => item.status === 'Out of stock') ? 'attention' : ''}><strong>{positions.filter(item => item.status === 'Out of stock').length}</strong><span>out of stock</span></article>
        <article className={pendingHandovers.length ? 'attention' : ''}><strong>{pendingHandovers.length}</strong><span>handovers awaiting confirmation</span></article>
        <article className={countDifferences.length ? 'attention' : ''}><strong>{countDifferences.length}</strong><span>count differences</span></article>
      </div>

      <section className="ceo-inventory-panel">
        <header><h2>Current material position</h2></header>
        {positions.length ? <div className="ceo-inventory-table position-table">
          <div className="ceo-inventory-row table-head"><span>Material</span><span>In store</span><span>Site custody</span><span>In transit</span><span>Status</span></div>
          {positions.map(item => <button type="button" className="ceo-inventory-row" key={item.materialId} onClick={() => setSelectedMaterialId(item.materialId)}>
            <span data-label="Material"><strong>{item.materialName}</strong><small>{item.category}</small></span>
            <span data-label="In store">{quantity(item.inStore, item.unit)}</span>
            <span data-label="Site custody">{quantity(item.siteCustody, item.unit)}</span>
            <span data-label="In transit">{quantity(item.inTransit, item.unit)}</span>
            <span data-label="Status"><b className={`inventory-state ${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</b></span>
          </button>)}
        </div> : <InventoryEmpty>No materials have entered a project store.</InventoryEmpty>}
      </section>

      <section className="ceo-inventory-panel recent-movements">
        <header><h2>Recent movements</h2></header>
        {contexts.length ? <div className="recent-movement-list">{contexts.slice(0, 5).map(item => <button type="button" key={item.entry.id} onClick={() => { setTab('movements'); setExpandedMovementId(item.entry.id) }}>
          <strong>{quantity(Math.abs(item.entry.quantityDelta), item.entry.unit)} {item.action.toLowerCase()}</strong>
          <span>{item.entry.materialName} · {dateTime(item.entry.occurredAt)}</span>
        </button>)}</div> : <InventoryEmpty>No material movement has been recorded.</InventoryEmpty>}
        {contexts.length > 0 && <button type="button" className="inventory-text-button" onClick={() => setTab('movements')}>View complete movement history</button>}
      </section>
    </>}

    {tab === 'ledger' && <section className="ceo-inventory-panel">
      <header className="ledger-heading"><div><h2>Materials ledger</h2><p>{new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }).format(from)} to {new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(toDate))}</p></div></header>
      <div className="inventory-filters">
        <label><span>From</span><input type="date" value={fromDate} max={toDate} onChange={event => setFromDate(event.target.value)}/></label>
        <label><span>To</span><input type="date" value={toDate} min={fromDate} onChange={event => setToDate(event.target.value)}/></label>
        <label><span>Project</span><select value={projectId} onChange={event => setProjectId(event.target.value)}><option value="all">All projects</option>{currentUser.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span>Stock status</span><select value={stockStatus} onChange={event => setStockStatus(event.target.value)}><option value="all">All statuses</option><option>In stock</option><option>Low stock</option><option>Out of stock</option></select></label>
      </div>
      <div className={`ceo-inventory-table ledger-table${showOther ? ' show-other' : ''}${showUsage ? ' show-usage' : ''}`}>
        <div className="ceo-inventory-row table-head"><span>Material</span><span>Opening</span><span>Received</span><span>Issued</span><span>Returned</span>{showOther && <span>Other changes</span>}{showUsage && <><span>Consumed</span><span>Wasted</span></>}<span>Closing</span><span>Status</span></div>
        {ledgerRows.map(item => <button type="button" className="ceo-inventory-row" key={item.materialId} onClick={() => setSelectedMaterialId(item.materialId)}>
          <span data-label="Material"><strong>{item.materialName}</strong><small>{item.unit}</small></span>
          <span data-label="Opening">{number(item.opening)}</span>
          <span data-label="Received" className="positive">+{number(item.received)}</span>
          <span data-label="Issued" className="negative">−{number(item.issued)}</span>
          <span data-label="Returned">{number(item.returned)}</span>
          {showOther && <span data-label="Other changes">{item.other > 0 ? '+' : ''}{number(item.other)}</span>}
          {showUsage && <><span data-label="Consumed">{number(item.consumed)}</span><span data-label="Wasted">{number(item.wasted)}</span></>}
          <span data-label="Closing"><strong>{quantity(item.closing, item.unit)}</strong></span>
          <span data-label="Status"><b className={`inventory-state ${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</b></span>
        </button>)}
      </div>
      {!ledgerRows.length && <InventoryEmpty>No materials match these filters.</InventoryEmpty>}
    </section>}

    {tab === 'movements' && <section className="ceo-inventory-panel">
      <header><h2>Movement history</h2></header>
      <MovementHistory
        movements={contexts}
        expandedMovementId={expandedMovementId}
        setExpandedMovementId={setExpandedMovementId}
      />
    </section>}

    {tab === 'exceptions' && <section className="ceo-inventory-panel exception-panel">
      <header><h2>Counts & exceptions</h2></header>
      <div className="exception-summary"><span><strong>{pendingHandovers.length}</strong> handovers waiting</span><span><strong>{countDifferences.length}</strong> count differences</span><span><strong>{disputedTransfers.length}</strong> disputed transfers</span></div>
      <ExceptionList title="Handovers awaiting confirmation" empty="No handovers are waiting.">
        {pendingHandovers.map(item => <article key={item.id}><div><strong>{item.materialName}</strong><span>{item.projectName} · issued to {item.issuedToName}</span></div><b>{quantity(item.quantityIssued, item.materialUnit)}</b></article>)}
      </ExceptionList>
      <ExceptionList title="Count differences" empty="No count difference is awaiting review.">
        {countDifferences.map(item => <article key={item.id}><div><strong>{item.materialName}</strong><span>{item.projectName} · counted by {item.countedByName}</span></div><b>{item.variance > 0 ? '+' : ''}{quantity(item.variance, item.materialUnit)}</b></article>)}
      </ExceptionList>
      <ExceptionList title="Transfer differences" empty="No transfer is disputed.">
        {disputedTransfers.map(item => <article key={item.id}><div><strong>{item.materialName}</strong><span>{item.fromProjectName} to {item.toProjectName}</span></div><b>{quantity(item.quantity, item.materialUnit)}</b></article>)}
      </ExceptionList>
    </section>}
  </section>
}

function MaterialStockCard({ position, movements, issues, expandedMovementId, setExpandedMovementId, onBack }: {
  position: MaterialPosition
  movements: MovementContext[]
  issues: MaterialIssue[]
  expandedMovementId: number | null
  setExpandedMovementId: (id: number | null) => void
  onBack: () => void
}) {
  const custody = issues.filter(item => custodyAmount(item) > 0)
  return <section className="ceo-inventory material-stock-card">
    <button type="button" className="inventory-back" onClick={onBack}>← Materials Inventory</button>
    <header className="material-stock-heading"><div><h1>{position.materialName}</h1><span>{position.category}</span></div><b className={`inventory-state ${position.status.toLowerCase().replaceAll(' ', '-')}`}>{position.status}</b></header>
    <div className="material-stock-facts">
      <span>In store<strong>{quantity(position.inStore, position.unit)}</strong></span>
      <span>Site custody<strong>{quantity(position.siteCustody, position.unit)}</strong></span>
      <span>In transit<strong>{quantity(position.inTransit, position.unit)}</strong></span>
      <span>Reorder level<strong>{quantity(position.reorderLevel, position.unit)}</strong></span>
      <span className="total">Total company-controlled quantity<strong>{quantity(position.totalControlled, position.unit)}</strong></span>
    </div>
    {custody.length > 0 && <section className="ceo-inventory-panel"><header><h2>Site custody</h2></header><div className="custody-list">{custody.map(item => <article key={item.id}><div><strong>{item.issuedToName}</strong><span>{item.projectName}</span></div><b>{quantity(custodyAmount(item), item.materialUnit)}</b><span>{item.status === 'AwaitingConfirmation' ? 'Awaiting confirmation' : 'Confirmed'}</span></article>)}</div></section>}
    <section className="ceo-inventory-panel"><header><h2>Material history</h2></header><MovementHistory movements={movements} expandedMovementId={expandedMovementId} setExpandedMovementId={setExpandedMovementId}/></section>
  </section>
}

function MovementHistory({ movements, expandedMovementId, setExpandedMovementId }: {
  movements: MovementContext[]
  expandedMovementId: number | null
  setExpandedMovementId: (id: number | null) => void
}) {
  if (!movements.length) return <InventoryEmpty>No movement has been recorded.</InventoryEmpty>
  return <div className="movement-history">
    <div className="movement-history-row table-head"><span>Date</span><span>Reference</span><span>Material</span><span>Movement</span><span>From → To</span><span>Quantity</span><span>Balance</span></div>
    {movements.map(item => <div className={`movement-history-item ${expandedMovementId === item.entry.id ? 'expanded' : ''}`} key={item.entry.id}>
      <button type="button" className="movement-history-row" onClick={() => setExpandedMovementId(expandedMovementId === item.entry.id ? null : item.entry.id)}>
        <span data-label="Date">{dateTime(item.entry.occurredAt)}</span>
        <span data-label="Reference"><strong>{item.entry.referenceNumber}</strong></span>
        <span data-label="Material"><strong>{item.entry.materialName}</strong><small>{item.entry.projectName}</small></span>
        <span data-label="Movement">{item.action}</span>
        <span data-label="From to">{item.route}</span>
        <span data-label="Quantity" className={item.entry.quantityDelta < 0 ? 'negative' : 'positive'}>{item.entry.quantityDelta > 0 ? '+' : ''}{quantity(item.entry.quantityDelta, item.entry.unit)}</span>
        <span data-label="Balance">{quantity(item.entry.balanceAfter, item.entry.unit)}</span>
      </button>
      {expandedMovementId === item.entry.id && <div className="movement-evidence">
        <span>Project and activity<strong>{item.activity}</strong></span>
        <span>Recipient<strong>{item.recipient}</strong></span>
        <span>Recorded by<strong>{item.entry.actorName}</strong></span>
        <span>Approved by<strong>{item.approvedBy}</strong></span>
        <Link to="/audit">Open complete audit history</Link>
      </div>}
    </div>)}
  </div>
}

function ExceptionList({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  return <section className="exception-list"><h3>{title}</h3>{items.length && items.some(Boolean) ? items : <p>{empty}</p>}</section>
}

function InventoryEmpty({ children }: { children: ReactNode }) {
  return <p className="inventory-empty">{children}</p>
}
