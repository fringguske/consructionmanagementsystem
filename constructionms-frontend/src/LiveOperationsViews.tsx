import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ApiError,
  type CashBook,
  financeApi,
  inventoryApi,
  materialsApi,
  pettyCashApi,
  projectsApi,
  purchaseOrdersApi,
  requisitionsApi,
  type ControlEvent,
  type CurrentUser,
  type GoodsReceipt,
  type Material,
  type MaterialIssue,
  type Payment,
  type PaymentAuthorization,
  type PettyCashRequest,
  type ProjectSummary,
  type PurchaseOrder,
  type Requisition,
  type StockBalance,
  type StockCount,
  type StockLedgerEntry,
  type StockTransfer,
  type SupplierInvoice,
  type TechnicalAcceptanceOutcome,
  type TechnicalAcceptanceWorkItem,
} from './api'
import './live-api.css'
import './live-operations.css'
import { CeoMaterialsInventory } from './CeoMaterialsInventory'

function messageOf(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'The action could not be completed.'
}

function money(value: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value)
}

function when(value: string | null) {
  return value ? new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—'
}

function committedReceiptQuantity(order: PurchaseOrder, receipts: GoodsReceipt[]) {
  const requiresEngineer = order.lines[0]?.requiresTechnicalAcceptance ?? false
  return receipts
    .filter(receipt => receipt.purchaseOrderId === order.id)
    .filter(receipt => !requiresEngineer || receipt.technicalAcceptanceStatus !== 'Rejected')
    .reduce((total, receipt) => total + receipt.acceptedQuantity, 0)
}

function invoiceEligibleQuantity(order: PurchaseOrder, receipts: GoodsReceipt[]) {
  const requiresEngineer = order.lines[0]?.requiresTechnicalAcceptance ?? false
  return receipts
    .filter(receipt => receipt.purchaseOrderId === order.id)
    .filter(receipt => !requiresEngineer || receipt.technicalAcceptanceStatus === 'Accepted')
    .reduce((total, receipt) => total + receipt.acceptedQuantity, 0)
}

function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' | 'success' }) {
  return <div className={`lav-notice ${tone}`}>{children}</div>
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="ops-empty"><strong>Nothing waiting</strong><span>{children}</span></div>
}

function Loading({ children }: { children: ReactNode }) {
  return <div className="lav-loading" role="status" aria-live="polite"><span/><p>{children}</p></div>
}

export function LiveInventoryView({ currentUser }: { currentUser: CurrentUser }) {
  const [balances, setBalances] = useState<StockBalance[]>([])
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([])
  const [issues, setIssues] = useState<MaterialIssue[]>([])
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [counts, setCounts] = useState<StockCount[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const role = currentUser.role

  useEffect(() => {
    const controller = new AbortController()
    const tasks: Promise<unknown>[] = [inventoryApi.balances(controller.signal), inventoryApi.issues(controller.signal)]
    if (['Storekeeper', 'Supervisor', 'CEO', 'Auditor'].includes(role)) {
      tasks.push(inventoryApi.transfers(controller.signal), inventoryApi.counts(controller.signal))
    }
    if (['Storekeeper', 'Supervisor', 'Finance Officer', 'CEO', 'Auditor'].includes(role)) {
      tasks.push(inventoryApi.ledger(controller.signal))
    }
    if (role === 'CEO') {
      tasks.push(inventoryApi.receipts(controller.signal))
    }
    if (role === 'Storekeeper') {
      tasks.push(purchaseOrdersApi.list({ page: 1, pageSize: 100, status: 'Issued' }, controller.signal))
      tasks.push(requisitionsApi.list({ page: 1, pageSize: 100, status: 'Approved' }, controller.signal))
      tasks.push(materialsApi.list({ page: 1, pageSize: 100 }, controller.signal))
      tasks.push(inventoryApi.receipts(controller.signal))
      tasks.push(Promise.all(currentUser.projects.map(project => projectsApi.getSummary(project.id, controller.signal))))
    }
    if (role === 'Supervisor') tasks.push(materialsApi.list({ page: 1, pageSize: 100 }, controller.signal))

    Promise.all(tasks).then(results => {
      let index = 0
      setBalances((results[index++] as { items: StockBalance[] }).items)
      setIssues((results[index++] as { items: MaterialIssue[] }).items)
      if (['Storekeeper', 'Supervisor', 'CEO', 'Auditor'].includes(role)) {
        setTransfers((results[index++] as { items: StockTransfer[] }).items)
        setCounts((results[index++] as { items: StockCount[] }).items)
      }
      if (['Storekeeper', 'Supervisor', 'Finance Officer', 'CEO', 'Auditor'].includes(role)) {
        setLedger((results[index++] as { items: StockLedgerEntry[] }).items)
      }
      if (role === 'CEO') {
        setReceipts((results[index++] as { items: GoodsReceipt[] }).items)
      }
      if (role === 'Storekeeper') {
        setOrders((results[index++] as { items: PurchaseOrder[] }).items)
        setRequisitions((results[index++] as { items: Requisition[] }).items)
        setMaterials((results[index++] as { items: Material[] }).items)
        setReceipts((results[index++] as { items: GoodsReceipt[] }).items)
        setProjectSummaries(results[index++] as ProjectSummary[])
      }
      if (role === 'Supervisor') setMaterials((results[index] as { items: Material[] }).items)
      setError(null)
    }).catch(error => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setError(messageOf(error))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [currentUser.projects, refresh, role])

  const changed = (text: string) => { setNotice(text); setRefresh(value => value + 1) }

  if (loading) return <Loading>Loading stock records…</Loading>
  return <div className="lav-view ops-view">
    {role === 'Foreman' && <header className="lav-page-head"><div><h1>{currentUser.canSwitchRoles ? 'Foreman material handovers' : 'Materials issued to me'}</h1></div></header>}
    {error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}
    {role === 'Storekeeper' && <StorekeeperActions currentUser={currentUser} projectSummaries={projectSummaries} orders={orders} receipts={receipts} requisitions={requisitions} balances={balances} materials={materials} issues={issues} transfers={transfers} counts={counts} onChanged={changed}/>}
    {role === 'Supervisor' && <SupervisorInventoryActions currentUser={currentUser} balances={balances} materials={materials} transfers={transfers} counts={counts} onChanged={changed}/>}
    {role === 'Foreman' && <ForemanIssueActions currentUser={currentUser} issues={issues} onChanged={changed}/>}
    {role === 'CEO'
      ? <CeoMaterialsInventory currentUser={currentUser} balances={balances} ledger={ledger} issues={issues} transfers={transfers} counts={counts} receipts={receipts}/>
      : <>
        <StockCards balances={balances}/>
        {role !== 'Foreman' && <section className="lav-panel ops-panel">
          {ledger.length ? <div className="ops-table"><div className="ops-row head"><span>Material</span><span>Movement</span><span>Quantity</span><span>Balance</span><span>Recorded by</span></div>{ledger.slice(0, 12).map(item => <div className="ops-row movement" key={item.id}><span data-label="Material"><b>{item.materialName}</b><small>{item.projectName}</small></span><span data-label="Movement">{item.movementType === 'TechnicalAcceptance' ? 'Engineer accepted' : item.movementType}</span><span data-label="Quantity" className={item.quantityDelta < 0 ? 'negative' : 'positive'}>{item.quantityDelta > 0 ? '+' : ''}{item.quantityDelta} {item.unit}</span><span data-label="Balance">{item.balanceAfter} {item.unit}</span><span data-label="Recorded by"><b>{item.actorName}</b><small>{when(item.occurredAt)}</small></span></div>)}</div> : <Empty>No receipts, issues, transfers or count adjustments yet.</Empty>}
        </section>}
        {['Auditor', 'Storekeeper', 'Supervisor'].includes(role) && <MovementSummary issues={issues} transfers={transfers} counts={counts}/>}
      </>}
  </div>
}

export function LiveTechnicalAcceptanceView({ currentUser }: { currentUser: CurrentUser }) {
  const [items, setItems] = useState<TechnicalAcceptanceWorkItem[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [activeList, setActiveList] = useState<'pending' | 'reviewed'>('pending')
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null)
  const [form, setForm] = useState<{ outcome: '' | TechnicalAcceptanceOutcome; notes: string; evidenceReference: string }>({ outcome: '', notes: '', evidenceReference: '' })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    inventoryApi.technicalAcceptances({ page }, controller.signal)
      .then(result => {
        setItems(current => page === 1
          ? result.items
          : [...new Map([...current, ...result.items].map(item => [item.goodsReceiptId, item])).values()])
        setTotalCount(result.totalCount)
        setError(null)
      })
      .catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setError(messageOf(error)) })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setLoadingMore(false) } })
    return () => controller.abort()
  }, [page, refresh])

  useEffect(() => {
    if (selectedReceiptId === null) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setSelectedReceiptId(null) }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [busy, selectedReceiptId])

  const pending = items.filter(item => item.requiresTechnicalAcceptance && !item.outcome)
  const reviewed = items.filter(item => item.requiresTechnicalAcceptance && item.outcome)
  const visible = activeList === 'pending' ? pending : reviewed
  const selected = items.find(item => item.goodsReceiptId === selectedReceiptId)
  const openReview = (item: TechnicalAcceptanceWorkItem) => {
    setSelectedReceiptId(item.goodsReceiptId)
    setForm({ outcome: '', notes: '', evidenceReference: '' })
    setReviewError(null)
  }
  const closeReview = () => { if (!busy) setSelectedReceiptId(null) }
  const submitReview = async () => {
    const outcome = form.outcome
    if (!selected || !outcome || form.notes.trim().length < 3) return
    setBusy(true)
    setReviewError(null)
    try {
      await inventoryApi.recordTechnicalAcceptance(selected.goodsReceiptId, {
        outcome,
        notes: form.notes.trim(),
        evidenceReference: form.evidenceReference.trim() || null,
      })
      setNotice(`${selected.materialName} marked ${outcome.toLowerCase()}.`)
      setSelectedReceiptId(null)
      setPage(1)
      setRefresh(value => value + 1)
    } catch (error) {
      setReviewError(messageOf(error))
    } finally {
      setBusy(false)
    }
  }

  if (currentUser.role !== 'Engineer') return <Notice tone="error">Only an Engineer can record technical acceptance.</Notice>
  if (loading) return <Loading>Loading delivery checks…</Loading>
  return <div className="lav-view ops-view technical-acceptance-view">
    {error && <Notice tone="error">{error}</Notice>}
    {notice && <Notice tone="success">{notice}</Notice>}
    <section className="lav-panel technical-acceptance-panel">
      <header className="technical-acceptance-toolbar">
        <div>
          <h2>Received materials</h2>
          <span>{pending.length} waiting</span>
        </div>
        <nav aria-label="Delivery check status">
          <button type="button" className={activeList === 'pending' ? 'active' : ''} aria-current={activeList === 'pending' ? 'page' : undefined} onClick={() => setActiveList('pending')}>Waiting <b>{pending.length}</b></button>
          <button type="button" className={activeList === 'reviewed' ? 'active' : ''} aria-current={activeList === 'reviewed' ? 'page' : undefined} onClick={() => setActiveList('reviewed')}>Reviewed <b>{reviewed.length}</b></button>
        </nav>
      </header>
      {visible.length ? <div className="technical-delivery-list">{visible.map(item => <article key={item.goodsReceiptId}>
        <header>
          <div><span>{item.projectName}</span><h2>{item.materialName}</h2></div>
          <b className={`technical-decision ${item.outcome ? item.outcome.toLowerCase() : 'pending'}`}>{item.outcome ?? 'Waiting'}</b>
        </header>
        <div className="technical-delivery-facts">
          <span><small>Received for inspection</small><strong>{item.acceptedQuantity.toLocaleString()} {item.materialUnit}</strong></span>
          <span><small>Supplier</small><strong>{item.supplierName}</strong></span>
          <span><small>Received by</small><strong>{item.receivedByName}</strong><em>{when(item.receivedAt)}</em></span>
          <span><small>Condition</small><strong>{item.condition}</strong><em>Delivery note {item.deliveryNoteReference}</em></span>
        </div>
        {item.outcome
          ? <footer><div className="technical-review-result"><span>Reviewed by <b>{item.reviewedByName}</b>{item.reviewedAt ? ` · ${when(item.reviewedAt)}` : ''}</span>{item.notes && <p>{item.notes}</p>}</div>{item.outcome === 'Rejected' && <button type="button" className="lav-button secondary" onClick={() => openReview(item)}>Review again</button>}</footer>
          : <footer><span>Confirm the material and specification.</span><button type="button" className="lav-button primary" onClick={() => openReview(item)}>Review delivery</button></footer>}
      </article>)}</div> : <Empty>{activeList === 'pending' ? 'No delivery needs an Engineer decision.' : 'No delivery has been reviewed.'}</Empty>}
      {items.length < totalCount && <footer className="technical-load-more"><button type="button" className="lav-button secondary" disabled={loadingMore} onClick={() => { setLoadingMore(true); setPage(current => current + 1) }}>{loadingMore ? 'Loading…' : 'Load more deliveries'}</button><span>{items.length} of {totalCount}</span></footer>}
    </section>
    {selected && <div className="ops-modal-wrap" role="presentation">
      <button type="button" className="ops-modal-backdrop" aria-label="Close technical acceptance" onClick={closeReview}/>
      <form className="lav-panel ops-form ops-modal technical-acceptance-modal" role="dialog" aria-modal="true" aria-labelledby="technical-acceptance-title" onSubmit={event => { event.preventDefault(); void submitReview() }}>
        <header><div><span className="lav-kicker">{selected.projectName}</span><h2 id="technical-acceptance-title">{selected.materialName}</h2><p>{selected.acceptedQuantity.toLocaleString()} {selected.materialUnit} from {selected.supplierName}</p></div><button type="button" className="ops-modal-close" aria-label="Close" disabled={busy} onClick={closeReview}>×</button></header>
        {reviewError && <Notice tone="error">{reviewError}</Notice>}
        <div className="technical-receipt-summary"><span>Received by <b>{selected.receivedByName}</b></span><span>{selected.acceptedQuantity.toLocaleString()} of {selected.deliveredQuantity.toLocaleString()} {selected.materialUnit} awaiting decision · {selected.condition}</span><span>{when(selected.receivedAt)}</span></div>
        <fieldset className="technical-outcome-options">
          <legend>Decision</legend>
          <label className={form.outcome === 'Accepted' ? 'selected accepted' : ''}><input type="radio" name="technical-outcome" value="Accepted" checked={form.outcome === 'Accepted'} onChange={() => setForm({ ...form, outcome: 'Accepted' })}/><span>Accept</span></label>
          <label className={form.outcome === 'Rejected' ? 'selected rejected' : ''}><input type="radio" name="technical-outcome" value="Rejected" checked={form.outcome === 'Rejected'} onChange={() => setForm({ ...form, outcome: 'Rejected' })}/><span>Reject</span></label>
        </fieldset>
        <label><span>Engineer finding</span><textarea autoFocus required minLength={3} maxLength={1000} rows={4} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })}/></label>
        <label><span>Evidence reference (optional)</span><input maxLength={500} value={form.evidenceReference} onChange={event => setForm({ ...form, evidenceReference: event.target.value })}/></label>
        <div className="ops-buttons"><button type="button" className="lav-button secondary" disabled={busy} onClick={closeReview}>Cancel</button><button type="submit" className="lav-button primary" disabled={busy || !form.outcome || form.notes.trim().length < 3}>{busy ? 'Saving…' : 'Submit decision'}</button></div>
      </form>
    </div>}
  </div>
}

function StockCards({ balances }: { balances: StockBalance[] }) {
  const groups = useMemo(() => [...balances].sort((a, b) => a.projectName.localeCompare(b.projectName) || a.materialName.localeCompare(b.materialName)), [balances])
  return <section className="lav-panel ops-panel"><header className="lav-panel-head"><div><span className="lav-kicker">IN STORE NOW</span><h2>Current balances</h2></div><strong>{groups.length} stocked items</strong></header>
    {groups.length ? <div className="ops-stock-grid">{groups.map(item => <article className={item.quantityOnHand <= item.reorderLevel ? 'low' : ''} key={item.id}><span>{item.projectName}</span><h3>{item.materialName}</h3><strong>{item.quantityOnHand.toLocaleString()} <small>{item.unit}</small></strong><p>{item.quantityOnHand <= item.reorderLevel ? `At or below reorder level (${item.reorderLevel})` : item.category}</p></article>)}</div> : <Empty>Stock appears after a Storekeeper records the first GRN.</Empty>}
  </section>
}

function StorekeeperActions({ currentUser, projectSummaries, orders, receipts, requisitions, balances, materials, issues, transfers, counts, onChanged }: { currentUser: CurrentUser; projectSummaries: ProjectSummary[]; orders: PurchaseOrder[]; receipts: GoodsReceipt[]; requisitions: Requisition[]; balances: StockBalance[]; materials: Material[]; issues: MaterialIssue[]; transfers: StockTransfer[]; counts: StockCount[]; onChanged: (text: string) => void }) {
  const [activeAction, setActiveAction] = useState<'restock' | 'receive' | 'issue' | 'count'>('restock')
  const [receiving, setReceiving] = useState({ purchaseOrderId: '', delivered: '', accepted: '', condition: 'Good', deliveryNote: '', evidence: '', notes: '' })
  const [issuing, setIssuing] = useState({ requisitionId: '', quantity: '', notes: '' })
  const [count, setCount] = useState({ projectId: '', materialId: '', quantity: '', notes: '' })
  const [replenishment, setReplenishment] = useState({ projectId: '', costCodeId: '', materialId: '', quantity: '', neededByDate: '', reason: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receiptTransferId, setReceiptTransferId] = useState<number | null>(null)
  const [transferReceipt, setTransferReceipt] = useState({ quantity: '', notes: '' })
  const availableReqs = requisitions.filter(requisition => requisition.requestType === 'SiteUse' && !issues.some(issue => issue.requisitionId === requisition.id))
  const selectedReq = requisitions.find(item => item.id === Number(issuing.requisitionId))
  const selectedOrder = orders.find(item => item.id === Number(receiving.purchaseOrderId))
  const selectedOrderLine = selectedOrder?.lines[0]
  const selectedBalance = balances.find(item => item.projectId === Number(count.projectId) && item.materialId === Number(count.materialId))
  const receiptTransfer = transfers.find(item => item.id === receiptTransferId)
  const replenishmentProject = projectSummaries.find(item => item.project.id === Number(replenishment.projectId))
  const replenishmentMaterial = materials.find(item => item.id === Number(replenishment.materialId))
  const expectedOrders = orders.filter(order => {
    const ordered = order.lines[0]?.quantity ?? 0
    return committedReceiptQuantity(order, receipts) < ordered
  })
  const assignedProjectIds = new Set(currentUser.projects.map(project => project.id))
  const actionableTransfers = transfers.filter(transfer =>
    (transfer.status === 'PendingDispatch' && assignedProjectIds.has(transfer.fromProjectId))
    || (transfer.status === 'InTransit' && assignedProjectIds.has(transfer.toProjectId) && transfer.dispatchedByUserId !== currentUser.id))
  const countableMaterials = materials.filter(material =>
    balances.some(balance => balance.projectId === Number(count.projectId) && balance.materialId === material.id)
    && !counts.some(stockCount => stockCount.projectId === Number(count.projectId) && stockCount.materialId === material.id && stockCount.status === 'AwaitingReview'))
  const submit = async (work: () => Promise<unknown>, success: string) => { setBusy(true); setError(null); try { await work(); onChanged(success); return true } catch (error) { setError(messageOf(error)); return false } finally { setBusy(false) } }
  return <section className="ops-storekeeper-workspace">
    <nav className="ops-action-nav" aria-label="Storekeeper stock actions">
      <button type="button" className={activeAction === 'restock' ? 'active' : ''} aria-current={activeAction === 'restock' ? 'page' : undefined} onClick={() => { setActiveAction('restock'); setError(null) }}>Restock</button>
      <button type="button" className={activeAction === 'receive' ? 'active' : ''} aria-current={activeAction === 'receive' ? 'page' : undefined} onClick={() => { setActiveAction('receive'); setError(null) }}>Receive delivery</button>
      <button type="button" className={activeAction === 'issue' ? 'active' : ''} aria-current={activeAction === 'issue' ? 'page' : undefined} onClick={() => { setActiveAction('issue'); setError(null) }}>Create issue voucher</button>
      <button type="button" className={activeAction === 'count' ? 'active' : ''} aria-current={activeAction === 'count' ? 'page' : undefined} onClick={() => { setActiveAction('count'); setError(null) }}>Submit count</button>
    </nav>
    {error && <Notice tone="error">{error}</Notice>}
    <div className="ops-action-panel">
    {activeAction === 'restock' && <form className="lav-panel ops-form ops-replenishment" onSubmit={event => { event.preventDefault(); void submit(() => requisitionsApi.createStockReplenishment({ projectId: Number(replenishment.projectId), materialId: Number(replenishment.materialId), costCodeId: Number(replenishment.costCodeId), quantity: Number(replenishment.quantity), neededByDate: replenishment.neededByDate, reason: replenishment.reason, notes: replenishment.notes.trim() || null }), 'Store replenishment request submitted.').then(saved => { if (saved) setReplenishment({ projectId: '', costCodeId: '', materialId: '', quantity: '', neededByDate: '', reason: '', notes: '' }) }) }}>
      <h2>Restock</h2>
      <div className="ops-fields"><label><span>Project store</span><select required value={replenishment.projectId} onChange={event => setReplenishment({ ...replenishment, projectId: event.target.value, costCodeId: '' })}><option value="">Choose project</option>{projectSummaries.map(item => <option key={item.project.id} value={item.project.id}>{item.project.name}</option>)}</select></label><label><span>Budget area</span><select required disabled={!replenishmentProject} value={replenishment.costCodeId} onChange={event => setReplenishment({ ...replenishment, costCodeId: event.target.value })}><option value="">Choose budget area</option>{replenishmentProject?.costCodes.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <label><span>Material</span><select required value={replenishment.materialId} onChange={event => setReplenishment({ ...replenishment, materialId: event.target.value })}><option value="">Choose material</option>{materials.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
      <div className="ops-fields"><label><span>Quantity</span><input type="number" min="0.001" step="0.001" required value={replenishment.quantity} onChange={event => setReplenishment({ ...replenishment, quantity: event.target.value })}/></label><label><span>Unit</span><select disabled value={replenishmentMaterial?.unit ?? ''}><option>{replenishmentMaterial?.unit || 'Choose material'}</option></select></label></div>
      <label><span>Needed in store by</span><input type="date" required value={replenishment.neededByDate} onChange={event => setReplenishment({ ...replenishment, neededByDate: event.target.value })}/></label><label><span>Why the store needs this stock</span><textarea minLength={3} maxLength={500} rows={3} required value={replenishment.reason} onChange={event => setReplenishment({ ...replenishment, reason: event.target.value })} placeholder="For example: maintain a 1,000-bag cement reserve for the next work stages"/></label><label><span>Notes (optional)</span><input maxLength={1000} value={replenishment.notes} onChange={event => setReplenishment({ ...replenishment, notes: event.target.value })}/></label><button className="lav-button primary" disabled={busy}>Request store stock</button>
    </form>}
    {activeAction === 'receive' && <form className="lav-panel ops-form" onSubmit={event => { event.preventDefault(); void submit(() => inventoryApi.receive({ purchaseOrderId: Number(receiving.purchaseOrderId), deliveredQuantity: Number(receiving.delivered), acceptedQuantity: Number(receiving.accepted), condition: receiving.condition, deliveryNoteReference: receiving.deliveryNote, evidenceReference: receiving.evidence || null, discrepancyNotes: receiving.notes || null }), selectedOrderLine?.requiresTechnicalAcceptance && Number(receiving.accepted) > 0 ? 'GRN saved. Engineer acceptance is now waiting.' : Number(receiving.accepted) > 0 ? 'GRN saved and accepted stock added to the store.' : 'GRN saved with no quantity added to stock.').then(saved => { if (saved) setReceiving({ purchaseOrderId: '', delivered: '', accepted: '', condition: 'Good', deliveryNote: '', evidence: '', notes: '' }) }) }}>
      <h2>Receive delivery</h2>
      <label><span>Issued purchase order</span><select required value={receiving.purchaseOrderId} onChange={e => setReceiving({ ...receiving, purchaseOrderId: e.target.value })}><option value="">Choose order</option>{expectedOrders.map(order => { const committed = committedReceiptQuantity(order, receipts); const line = order.lines[0]; return <option value={order.id} key={order.id}>{line?.materialName} · {order.supplierName} · {line ? line.quantity - committed : 0} {line?.materialUnit} outstanding</option> })}</select></label>
      <div className="ops-fields three"><label><span>Delivered</span><input type="number" min="0.001" step="0.001" required value={receiving.delivered} onChange={e => setReceiving({ ...receiving, delivered: e.target.value })}/></label><label><span>Accepted</span><input type="number" min="0" step="0.001" required value={receiving.accepted} onChange={e => setReceiving({ ...receiving, accepted: e.target.value })}/></label><label><span>Unit</span><select disabled value={selectedOrderLine?.materialUnit ?? ''}><option>{selectedOrderLine?.materialUnit || 'Choose order'}</option></select></label></div>
      <div className="ops-fields"><label><span>Condition</span><select value={receiving.condition} onChange={e => setReceiving({ ...receiving, condition: e.target.value })}><option>Good</option><option>Mixed</option><option>Damaged</option></select></label><label><span>Delivery note</span><input required value={receiving.deliveryNote} onChange={e => setReceiving({ ...receiving, deliveryNote: e.target.value })}/></label></div>
      <label><span>Evidence reference</span><input placeholder="Photo/file reference" value={receiving.evidence} onChange={e => setReceiving({ ...receiving, evidence: e.target.value })}/></label><label><span>Discrepancy notes</span><input placeholder="Required for rejected quantity" value={receiving.notes} onChange={e => setReceiving({ ...receiving, notes: e.target.value })}/></label><button className="lav-button primary" disabled={busy}>Save GRN</button>
    </form>}
    {activeAction === 'issue' && <form className="lav-panel ops-form" onSubmit={event => { event.preventDefault(); void submit(() => inventoryApi.issue({ requisitionId: Number(issuing.requisitionId), quantity: Number(issuing.quantity), notes: issuing.notes || null }), selectedReq?.requestedByUserName ? `Issue voucher created for ${selectedReq.requestedByUserName}.` : 'Material issue saved.').then(saved => { if (saved) setIssuing({ requisitionId: '', quantity: '', notes: '' }) }) }}>
      <h2>Create issue voucher</h2>
      <label><span>Approved request</span><select required value={issuing.requisitionId} onChange={e => { const req = requisitions.find(item => item.id === Number(e.target.value)); setIssuing({ ...issuing, requisitionId: e.target.value, quantity: req ? String(req.quantity) : '' }) }}><option value="">Choose request</option>{availableReqs.map(req => <option value={req.id} key={req.id}>{req.materialName} · {req.projectName} · {req.quantity} {req.materialUnit} · for {req.requestedByUserName ?? 'requester'}</option>)}</select></label>
      {selectedReq && <label><span>Receiving Foreman</span><input readOnly value={selectedReq.requestedByUserName ?? 'Requester not available'}/></label>}
      <div className="ops-fields"><label><span>Approved quantity</span><input type="number" min="0.001" step="0.001" required readOnly value={issuing.quantity}/></label><label><span>Unit</span><select disabled value={selectedReq?.materialUnit ?? ''}><option>{selectedReq?.materialUnit || 'Select material'}</option></select></label></div>
      <label><span>Handover note</span><input value={issuing.notes} onChange={e => setIssuing({ ...issuing, notes: e.target.value })}/></label><button className="lav-button primary" disabled={busy}>Create issue voucher</button>
    </form>}
    {activeAction === 'count' && <form className="lav-panel ops-form" onSubmit={event => { event.preventDefault(); void submit(() => inventoryApi.createCount({ projectId: Number(count.projectId), materialId: Number(count.materialId), countedQuantity: Number(count.quantity), notes: count.notes }), 'Physical count submitted for independent Supervisor review.').then(saved => { if (saved) setCount({ projectId: '', materialId: '', quantity: '', notes: '' }) }) }}>
      <h2>Submit count</h2>
      <label><span>Project store</span><select required value={count.projectId} onChange={e => setCount({ ...count, projectId: e.target.value, materialId: '' })}><option value="">Choose project</option>{[...new Map(balances.map(item => [item.projectId, item.projectName])).entries()].map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
      <label><span>Material</span><select required value={count.materialId} onChange={e => setCount({ ...count, materialId: e.target.value })}><option value="">Choose material</option>{countableMaterials.map(item => <option value={item.id} key={item.id}>{item.name} ({item.unit})</option>)}</select></label>
      {selectedBalance && <small>System shows {selectedBalance.quantityOnHand} {selectedBalance.unit}</small>}
      <label><span>Physical quantity counted</span><input type="number" min="0" step="0.001" required value={count.quantity} onChange={e => setCount({ ...count, quantity: e.target.value })}/></label><label><span>Count note</span><input minLength={3} required value={count.notes} onChange={e => setCount({ ...count, notes: e.target.value })}/></label><button className="lav-button primary" disabled={busy}>Submit count</button>
    </form>}
    </div>
    <div className="lav-panel ops-form"><h2>Transfers awaiting Stores</h2><p>Dispatch and receipt are confirmed by different Storekeepers.</p>{actionableTransfers.map(item => <article className="ops-action-item" key={item.id}><b>{item.materialName}</b><span>{item.quantity} {item.materialUnit} · {item.fromProjectName} → {item.toProjectName}</span>{item.status === 'PendingDispatch' ? <button type="button" className="lav-button secondary" onClick={() => void submit(() => inventoryApi.dispatchTransfer(item.id), 'Transfer dispatched.')}>Dispatch</button> : <button type="button" className="lav-button secondary" onClick={() => { setReceiptTransferId(item.id); setTransferReceipt({ quantity: String(item.quantity), notes: '' }) }}>Confirm receipt</button>}</article>)}{actionableTransfers.length === 0 && <Empty>No transfer handoff requires action for this account.</Empty>}</div>
    {receiptTransfer && <div className="ops-modal-wrap" role="presentation"><button type="button" className="ops-modal-backdrop" aria-label="Close transfer form" onClick={() => setReceiptTransferId(null)}/><form className="lav-panel ops-form ops-modal" onSubmit={event => { event.preventDefault(); void submit(() => inventoryApi.receiveTransfer(receiptTransfer.id, { receivedQuantity: Number(transferReceipt.quantity), notes: transferReceipt.notes.trim() || null }), 'Destination receipt recorded and the movement trail updated.').then(saved => { if (saved) setReceiptTransferId(null) }) }}><header><div><span className="lav-kicker">DESTINATION CHECK</span><h2>Confirm transfer receipt</h2><p>{receiptTransfer.fromProjectName} → {receiptTransfer.toProjectName}</p></div><button type="button" className="ops-modal-close" onClick={() => setReceiptTransferId(null)}>×</button></header><label><span>Material</span><input value={receiptTransfer.materialName} disabled/></label><div className="ops-fields"><label><span>Quantity received</span><input type="number" min="0" step="0.001" required value={transferReceipt.quantity} onChange={event => setTransferReceipt({ ...transferReceipt, quantity: event.target.value })}/></label><label><span>Unit</span><select disabled value={receiptTransfer.materialUnit}><option>{receiptTransfer.materialUnit}</option></select></label></div><label><span>Receipt note {Number(transferReceipt.quantity) === receiptTransfer.quantity ? '(optional)' : '(explain the difference)'}</span><textarea required={Number(transferReceipt.quantity) !== receiptTransfer.quantity} minLength={3} rows={3} value={transferReceipt.notes} onChange={event => setTransferReceipt({ ...transferReceipt, notes: event.target.value })}/></label><div className="ops-buttons"><button type="button" className="lav-button secondary" onClick={() => setReceiptTransferId(null)}>Cancel</button><button className="lav-button primary" disabled={busy}>Save destination receipt</button></div></form></div>}
  </section>
}

function ForemanIssueActions({ currentUser, issues, onChanged }: { currentUser: CurrentUser; issues: MaterialIssue[]; onChanged: (text: string) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<{ issueId: number; mode: 'confirm' | 'usage' } | null>(null)
  const [confirmation, setConfirmation] = useState({ quantity: '', notes: '' })
  const [usage, setUsage] = useState<{ type: 'Used' | 'Wastage'; quantity: string; reason: string; evidence: string }>({ type: 'Used', quantity: '', reason: '', evidence: '' })
  const work = async (action: () => Promise<unknown>, text: string) => { setError(null); try { await action(); onChanged(text); return true } catch (error) { setError(messageOf(error)); return false } }
  const activeIssue = issues.find(issue => issue.id === active?.issueId)
  return <section className="lav-panel ops-panel"><header className="lav-panel-head"><div><span className="lav-kicker">{currentUser.canSwitchRoles ? 'HANDOVERS' : 'MY CUSTODY'}</span><h2>{currentUser.canSwitchRoles ? 'Material issued to Foremen' : 'Confirm and account for material'}</h2></div></header>{error && <Notice tone="error">{error}</Notice>}
    <div className="ops-issue-grid">{issues.map(issue => { const assignedToCurrentUser = issue.issuedToUserId === currentUser.id; return <article key={issue.id}><div><span>{issue.projectName}</span><b>{issue.materialName}</b><strong>{issue.quantityIssued} {issue.materialUnit}</strong></div><p>Issued to {issue.issuedToName} · by {issue.issuedByName}</p>{issue.status === 'AwaitingConfirmation' && assignedToCurrentUser && <button type="button" className="lav-button primary" onClick={() => { setActive({ issueId: issue.id, mode: 'confirm' }); setConfirmation({ quantity: String(issue.quantityIssued), notes: '' }) }}>Confirm receipt</button>}{issue.status === 'AwaitingConfirmation' && !assignedToCurrentUser && <span className="ops-status awaitingconfirmation">Awaiting {issue.issuedToName}</span>}{issue.status === 'Confirmed' && <><div className="ops-account"><span>Used <b>{issue.usedQuantity}</b></span><span>Wasted <b>{issue.wastedQuantity}</b></span><span>Still with team <b>{issue.unaccountedQuantity}</b></span></div>{assignedToCurrentUser && <button type="button" className="lav-button secondary" onClick={() => { setActive({ issueId: issue.id, mode: 'usage' }); setUsage({ type: 'Used', quantity: '', reason: '', evidence: '' }) }}>Record use or wastage</button>}</>}{issue.status === 'Disputed' && <Notice tone="error">Receipt difference recorded: {issue.confirmedQuantity} of {issue.quantityIssued} {issue.materialUnit}.</Notice>}</article> })}{issues.length === 0 && <Empty>No material issue has been handed to this Foreman.</Empty>}</div>
    {active && activeIssue && <div className="ops-modal-wrap" role="presentation"><button type="button" className="ops-modal-backdrop" aria-label="Close material form" onClick={() => setActive(null)}/><form className="lav-panel ops-form ops-modal" onSubmit={event => { event.preventDefault(); if (active.mode === 'confirm') void work(() => inventoryApi.confirmIssue(activeIssue.id, { receivedQuantity: Number(confirmation.quantity), notes: confirmation.notes.trim() || null }), 'Receipt confirmation recorded.').then(saved => { if (saved) setActive(null) }); else void work(() => inventoryApi.recordUsage(activeIssue.id, { usageType: usage.type, quantity: Number(usage.quantity), purposeOrReason: usage.reason, evidenceReference: usage.evidence.trim() || null }), `${usage.type} record saved.`).then(saved => { if (saved) setActive(null) }) }}><header><div><span className="lav-kicker">{activeIssue.projectName}</span><h2>{active.mode === 'confirm' ? 'Confirm physical receipt' : 'Account for material'}</h2><p>{activeIssue.materialName}</p></div><button type="button" className="ops-modal-close" onClick={() => setActive(null)}>×</button></header>{active.mode === 'confirm' ? <><div className="ops-fields"><label><span>Quantity physically received</span><input type="number" min="0" max={activeIssue.quantityIssued} step="0.001" required value={confirmation.quantity} onChange={event => setConfirmation({ ...confirmation, quantity: event.target.value })}/></label><label><span>Unit</span><select disabled value={activeIssue.materialUnit}><option>{activeIssue.materialUnit}</option></select></label></div><label><span>Note {Number(confirmation.quantity) === activeIssue.quantityIssued ? '(optional)' : '(explain the difference)'}</span><textarea rows={3} minLength={3} required={Number(confirmation.quantity) !== activeIssue.quantityIssued} value={confirmation.notes} onChange={event => setConfirmation({ ...confirmation, notes: event.target.value })}/></label></> : <><label><span>Record type</span><select value={usage.type} onChange={event => setUsage({ ...usage, type: event.target.value as 'Used' | 'Wastage' })}><option value="Used">Used on construction</option><option value="Wastage">Wasted or damaged</option></select></label><div className="ops-fields"><label><span>Quantity</span><input type="number" min="0.001" max={activeIssue.unaccountedQuantity} step="0.001" required value={usage.quantity} onChange={event => setUsage({ ...usage, quantity: event.target.value })}/></label><label><span>Unit</span><select disabled value={activeIssue.materialUnit}><option>{activeIssue.materialUnit}</option></select></label></div><label><span>{usage.type === 'Used' ? 'Work area or purpose' : 'Reason for wastage'}</span><textarea minLength={3} maxLength={500} rows={3} required value={usage.reason} onChange={event => setUsage({ ...usage, reason: event.target.value })}/></label><label><span>Evidence reference (optional)</span><input maxLength={500} value={usage.evidence} onChange={event => setUsage({ ...usage, evidence: event.target.value })}/></label></>}<div className="ops-buttons"><button type="button" className="lav-button secondary" onClick={() => setActive(null)}>Cancel</button><button className="lav-button primary">{active.mode === 'confirm' ? 'Save receipt check' : 'Save material record'}</button></div></form></div>}
  </section>
}

function SupervisorInventoryActions({ currentUser, balances, materials, counts, onChanged }: { currentUser: CurrentUser; balances: StockBalance[]; materials: Material[]; transfers: StockTransfer[]; counts: StockCount[]; onChanged: (text: string) => void }) {
  const [form, setForm] = useState({ from: '', to: '', material: '', quantity: '', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const run = async (action: () => Promise<unknown>, text: string) => { try { await action(); setError(null); onChanged(text) } catch (error) { setError(messageOf(error)) } }
  return <section className="ops-action-grid two">
    <form className="lav-panel ops-form" onSubmit={event => { event.preventDefault(); void run(() => inventoryApi.createTransfer({ fromProjectId: Number(form.from), toProjectId: Number(form.to), materialId: Number(form.material), quantity: Number(form.quantity), reason: form.reason }), 'Transfer request sent to Stores.') }}><h2>Request a site transfer</h2><p>Stores dispatches and the receiving store confirms separately.</p>{error && <Notice tone="error">{error}</Notice>}<div className="ops-fields"><label><span>From</span><select required value={form.from} onChange={e => setForm({ ...form, from: e.target.value })}><option value="">Choose</option>{currentUser.projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label><span>To</span><select required value={form.to} onChange={e => setForm({ ...form, to: e.target.value })}><option value="">Choose</option>{currentUser.projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label></div><label><span>Material in sending store</span><select required value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}><option value="">Choose material</option>{materials.filter(m => balances.some(b => b.projectId === Number(form.from) && b.materialId === m.id)).map(m => <option value={m.id} key={m.id}>{m.name} ({m.unit})</option>)}</select></label><label><span>Quantity</span><input type="number" min="0.001" step="0.001" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}/></label><label><span>Reason</span><input minLength={3} required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}/></label><button className="lav-button primary">Request transfer</button></form>
    <div className="lav-panel ops-form"><h2>Stock counts to review</h2><p>Approve only if stock has not moved since the physical count.</p>{counts.filter(c => c.status === 'AwaitingReview').map(count => <article className="ops-action-item" key={count.id}><b>{count.materialName} · {count.projectName}</b><span>System {count.systemQuantity} · Counted {count.countedQuantity} · Difference {count.variance}</span><div><button className="lav-button primary" onClick={() => void run(() => inventoryApi.reviewCount(count.id, { approve: true, notes: 'Physical count reviewed and accepted' }), 'Count approved and ledger adjusted.')}>Approve</button><button className="lav-button secondary" onClick={() => void run(() => inventoryApi.reviewCount(count.id, { approve: false, notes: 'Fresh count required' }), 'Count returned for a fresh count.')}>Reject</button></div></article>)}{!counts.some(c => c.status === 'AwaitingReview') && <Empty>No physical count awaits review.</Empty>}</div>
  </section>
}

function MovementSummary({ issues, transfers, counts }: { issues: MaterialIssue[]; transfers: StockTransfer[]; counts: StockCount[] }) {
  return <section className="ops-summary-grid"><article><span>Foreman handovers</span><strong>{issues.length}</strong><small>{issues.filter(item => item.status === 'Disputed').length} disputed</small></article><article><span>Transfers moving</span><strong>{transfers.filter(item => item.status === 'InTransit').length}</strong><small>Require destination confirmation</small></article><article><span>Count differences</span><strong>{counts.filter(item => item.variance !== 0).length}</strong><small>Nothing is silently overwritten</small></article></section>
}

export function LiveFinanceView({ currentUser }: { currentUser: CurrentUser }) {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [authorizations, setAuthorizations] = useState<PaymentAuthorization[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [cashBookRequest, setCashBookRequest] = useState<{ role: CurrentUser['role']; refresh: number; data: CashBook | null; error: string | null } | null>(null)
  const [loadedRequest, setLoadedRequest] = useState<{ role: CurrentUser['role']; refresh: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const role = currentUser.role
  const loading = loadedRequest?.role !== role || loadedRequest.refresh !== refresh
  const cashBookRequestIsCurrent = cashBookRequest?.role === role && cashBookRequest.refresh === refresh
  const cashBookLoading = role === 'CEO' && !cashBookRequestIsCurrent
  const cashBook = cashBookRequestIsCurrent ? cashBookRequest.data : null
  const cashBookError = cashBookRequestIsCurrent ? cashBookRequest.error : null
  useEffect(() => {
    const controller = new AbortController()
    const tasks: Promise<unknown>[] = [financeApi.invoices(controller.signal)]
    if (role !== 'Procurement Officer') tasks.push(financeApi.authorizations(role === 'Finance Officer', controller.signal), financeApi.payments(controller.signal))
    if (role === 'Procurement Officer') tasks.push(purchaseOrdersApi.list({ page: 1, pageSize: 100, status: 'Issued' }, controller.signal), inventoryApi.receipts(controller.signal))
    Promise.all(tasks).then(results => { let i = 0; setInvoices((results[i++] as { items: SupplierInvoice[] }).items); if (role !== 'Procurement Officer') { setAuthorizations((results[i++] as { items: PaymentAuthorization[] }).items); setPayments((results[i] as { items: Payment[] }).items) } else { setOrders((results[i++] as { items: PurchaseOrder[] }).items); setReceipts((results[i] as { items: GoodsReceipt[] }).items) } setError(null) }).catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setError(messageOf(error)) }).finally(() => { if (!controller.signal.aborted) setLoadedRequest({ role, refresh }) })
    if (role === 'CEO') financeApi.cashBook(controller.signal)
      .then(data => { if (!controller.signal.aborted) setCashBookRequest({ role, refresh, data, error: null }) })
      .catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setCashBookRequest({ role, refresh, data: null, error: messageOf(error) }) })
    return () => controller.abort()
  }, [refresh, role])
  const run = async (action: () => Promise<unknown>, text: string) => { try { await action(); setNotice(text); setError(null); setRefresh(v => v + 1); return true } catch (error) { setError(messageOf(error)); return false } }
  return <div className="lav-view ops-view"><header className="lav-page-head"><div><h1>{role === 'Procurement Officer' ? 'Supplier invoices' : 'Invoices and payments'}</h1></div></header>{error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}
    {loading ? <Loading>Loading finance records…</Loading> : <>
    {role === 'Procurement Officer' && <InvoiceCapture orders={orders} receipts={receipts} invoices={invoices} onRun={run}/>}
    <section className="lav-panel ops-panel"><header className="lav-panel-head"><div><span className="lav-kicker">THREE-WAY MATCH</span><h2>Supplier invoices</h2></div><strong>{invoices.length} records</strong></header>{invoices.length ? <div className="ops-invoice-grid">{invoices.map(invoice => <InvoiceCard key={invoice.id} invoice={invoice} currentUser={currentUser} run={run}/>)}</div> : <Empty>Invoices appear only after an issued PO has an accepted GRN.</Empty>}</section>
    {role === 'CEO' && cashBookLoading && <section className="lav-panel ops-panel"><Loading>Loading cash book…</Loading></section>}
    {role === 'CEO' && cashBookError && <section className="lav-panel ops-panel"><Notice tone="error">{cashBookError}</Notice></section>}
    {role === 'CEO' && cashBook && <CeoCashBook cashBook={cashBook}/>}
    {role === 'Finance Officer' && <FinancePaymentActions currentUser={currentUser} authorizations={authorizations} run={run}/>}
    {role !== 'Procurement Officer' && <section className="lav-panel ops-panel"><header className="lav-panel-head"><div><span className="lav-kicker">PAYMENT PROOF</span><h2>Executed payments</h2></div></header>{payments.length ? <div className="ops-table"><div className="ops-row payment head"><span>Payment</span><span>Amount</span><span>Method</span><span>External proof</span></div>{payments.map(payment => <div className="ops-row payment" key={payment.id}><span><b>{payment.displayNumber}</b><small>{when(payment.paidAt)}</small></span><span>{money(payment.amount)}</span><span>{payment.method}</span><span><b>{payment.externalReference}</b><small>Recorded by {payment.paidByName}</small></span></div>)}</div> : <Empty>No payment has been executed.</Empty>}</section>}
    </>}
  </div>
}

function CeoCashBook({ cashBook }: { cashBook: CashBook }) {
  const [openProjectId, setOpenProjectId] = useState<number | null>(null)
  const openProject = cashBook.projects.find(project => project.projectId === openProjectId)
  useEffect(() => {
    if (openProjectId === null) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenProjectId(null) }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openProjectId])

  return <section className="lav-panel ops-panel cashbook-panel">
    <header className="lav-panel-head"><div><h2>Cash book</h2></div><strong>{cashBook.projects.length} projects</strong></header>
    <div className="cashbook-table">
      <div className="cashbook-row head"><span>Project</span><span>Allocated budget</span><span>Used</span><span>Committed</span><span>Waiting</span><span>Available</span></div>
      {cashBook.projects.map(project => {
        const isOpen = project.projectId === openProjectId
        return <article className={isOpen ? 'open' : ''} key={project.projectId}>
          <button type="button" className="cashbook-row" aria-expanded={isOpen} onClick={() => setOpenProjectId(isOpen ? null : project.projectId)}>
            <span className="cashbook-project" data-label="Project"><b>{project.projectName}</b><i aria-hidden="true">{isOpen ? '−' : '+'}</i></span>
            <span data-label="Allocated budget"><b>{money(project.allocatedBudget)}</b></span>
            <span data-label="Used"><b>{money(project.totalUsed)}</b><small>{money(project.supplierPayments)} suppliers · {money(project.pettyCashSpent)} petty cash</small></span>
            <span data-label="Committed"><b>{money(project.openCommitments)}</b></span>
            <span data-label="Waiting"><b>{money(project.cashAwaitingAccountability)}</b><small>Accountability</small></span>
            <span className={project.budgetAvailable < 0 ? 'over' : ''} data-label="Available"><b>{money(project.budgetAvailable)}</b></span>
          </button>
        </article>
      })}
    </div>
    {openProject && <div className="ops-modal-wrap cashbook-modal-wrap" role="presentation">
      <button type="button" className="ops-modal-backdrop" aria-label="Close money use" onClick={() => setOpenProjectId(null)}/>
      <div className="cashbook-sheet cashbook-floating-card" role="dialog" aria-modal="true" aria-labelledby="cashbook-money-use-title">
        <header><div><span>{openProject.projectName} · latest {openProject.recentEntries.length} of {openProject.entryCount}</span><h3 id="cashbook-money-use-title">Money use</h3></div><button type="button" onClick={() => setOpenProjectId(null)}>Close</button></header>
        {openProject.recentEntries.length ? <div className="cashbook-entries">{openProject.recentEntries.map((entry, index) => <div className="cashbook-entry" key={`${entry.occurredAt}-${entry.entryType}-${index}`}>
          <time dateTime={entry.occurredAt}>{new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(entry.occurredAt))}</time>
          <span><b>{entry.title}</b><small>{entry.detail}</small></span>
          <span><b>{entry.entryType}</b><small>{entry.state}</small></span>
          <strong>{money(entry.amount)}</strong>
        </div>)}</div> : <Empty>No recorded use for this project.</Empty>}
      </div>
    </div>}
  </section>
}

function InvoiceCapture({ orders, receipts, invoices, onRun }: { orders: PurchaseOrder[]; receipts: GoodsReceipt[]; invoices: SupplierInvoice[]; onRun: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const [form, setForm] = useState({ order: '', number: '', quantity: '', price: '', amount: '', document: '' })
  const available = orders.filter(order => {
    const ordered = order.lines[0]?.quantity ?? 0
    const accepted = invoiceEligibleQuantity(order, receipts)
    return accepted === ordered && !invoices.some(invoice => invoice.purchaseOrderId === order.id && !['Mismatch', 'Returned', 'Rejected'].includes(invoice.status))
  })
  const selected = orders.find(order => order.id === Number(form.order)); const line = selected?.lines[0]
  return <form className="lav-panel ops-form ops-invoice-form" onSubmit={event => { event.preventDefault(); void onRun(() => financeApi.createInvoice({ purchaseOrderId: Number(form.order), invoiceNumber: form.number, quantity: Number(form.quantity), unitPrice: Number(form.price), amount: Number(form.amount), documentReference: form.document || null }), 'Invoice captured for independent Finance review.').then(saved => { if (saved) setForm({ order: '', number: '', quantity: '', price: '', amount: '', document: '' }) }) }}><h2>Capture supplier invoice</h2><p>The source is immutable. A mismatch must be replaced, never edited over.</p><div className="ops-fields four"><label><span>Issued PO ready for invoice</span><select required value={form.order} onChange={e => { const order = orders.find(item => item.id === Number(e.target.value)); const nextLine = order?.lines[0]; const accepted = order ? invoiceEligibleQuantity(order, receipts) : 0; const unitPrice = nextLine?.unitPrice ?? 0; setForm({ ...form, order: e.target.value, quantity: accepted ? String(accepted) : '', price: unitPrice ? String(unitPrice) : '', amount: accepted && unitPrice ? (accepted * unitPrice).toFixed(2) : '' }) }}><option value="">Choose order</option>{available.map(order => { const accepted = invoiceEligibleQuantity(order, receipts); return <option value={order.id} key={order.id}>{order.supplierName} · {accepted} {order.lines[0]?.materialUnit} accepted</option> })}</select></label><label><span>Invoice number</span><input required value={form.number} onChange={e => setForm({ ...form, number: e.target.value })}/></label><label><span>Quantity {line ? `(${line.materialUnit})` : ''}</span><input type="number" min="0.001" step="0.001" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}/></label><label><span>Unit price</span><input type="number" min="0.01" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}/></label><label><span>Invoice amount</span><input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></label><label><span>Document reference</span><input value={form.document} onChange={e => setForm({ ...form, document: e.target.value })}/></label></div><button className="lav-button primary">Send to Finance</button></form>
}

function InvoiceCard({ invoice, currentUser, run }: { invoice: SupplierInvoice; currentUser: CurrentUser; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const role = currentUser.role
  const technicalStatus = invoice.requiresTechnicalAcceptance ? invoice.technicalAcceptanceStatus ?? 'Pending' : 'NotRequired'
  const action = () => {
    if (role === 'Finance Officer' && invoice.status === 'PendingReview' && technicalStatus === 'Pending') return <span className="ops-status technical-wait">Waiting for Engineer</span>
    if (role === 'Finance Officer' && invoice.status === 'PendingReview' && technicalStatus === 'Rejected') return <span className="ops-status rejected">Delivery rejected</span>
    if (role === 'Finance Officer' && invoice.status === 'PendingReview') return <button className="lav-button primary" onClick={() => void run(() => financeApi.reviewInvoice(invoice.id, 'PO, accepted GRN and invoice compared by Finance'), 'Three-way match completed.')}>Run match</button>
    if (role === 'Supervisor' && invoice.status === 'ReadyForAuthorization' && invoice.reviewedByUserId !== currentUser.id) return <button className="lav-button primary" onClick={() => void run(() => financeApi.authorize(invoice.id, 'Approved for payment'), 'Payment authorized.')}>Authorize payment</button>
    if (role === 'CEO' && invoice.status === 'AwaitingCeoApproval') return <div className="ops-buttons"><button className="lav-button primary" onClick={() => void run(() => financeApi.ceoDecision(invoice.id, true, 'High-value exception approved after reviewing the complete evidence chain'), 'Exception approved.')}>Approve exception</button><button className="lav-button secondary" onClick={() => void run(() => financeApi.ceoDecision(invoice.id, false, 'High-value exception rejected by CEO'), 'Exception rejected.')}>Reject</button></div>
    return null
  }
  const technicalState = technicalStatus !== 'NotRequired' && <div className={`invoice-technical-state ${technicalStatus.toLowerCase()}`}>
    <b>Engineer check</b>
    <span>{technicalStatus === 'Accepted'
      ? invoice.technicalAcceptanceRejectedCount > 0
        ? `Accepted · ${invoice.technicalAcceptanceRejectedCount} earlier ${invoice.technicalAcceptanceRejectedCount === 1 ? 'delivery' : 'deliveries'} rejected`
        : invoice.technicalAcceptanceRequiredCount > 1
        ? `${invoice.technicalAcceptanceAcceptedCount} of ${invoice.technicalAcceptanceRequiredCount} deliveries accepted`
        : `Accepted${invoice.latestTechnicalReviewerName ? ` by ${invoice.latestTechnicalReviewerName}` : ''}`
      : technicalStatus === 'Rejected'
        ? `${invoice.technicalAcceptanceRejectedCount} ${invoice.technicalAcceptanceRejectedCount === 1 ? 'delivery' : 'deliveries'} rejected`
        : `${invoice.technicalAcceptanceAcceptedCount} of ${invoice.technicalAcceptanceRequiredCount} deliveries accepted`}</span>
  </div>
  return <article><header><div><span>{invoice.projectName}</span><h3>{invoice.supplierName}</h3><small>Invoice {invoice.invoiceNumber}</small></div><b className={`ops-status ${invoice.status.toLowerCase()}`}>{invoice.status.replaceAll(/([A-Z])/g, ' $1').trim()}</b></header><strong>{money(invoice.amount)}</strong><p>{invoice.quantity} {invoice.materialUnit} of {invoice.materialName}</p>{technicalState}{invoice.reviewedAt && <div className="ops-match"><span className={invoice.quantityMatches ? 'pass' : 'fail'}>Quantity {invoice.quantityMatches ? 'matches' : 'differs'}</span><span className={invoice.priceMatches ? 'pass' : 'fail'}>Price {invoice.priceMatches ? 'matches' : 'differs'}</span><span className={invoice.amountMatches ? 'pass' : 'fail'}>Total {invoice.amountMatches ? 'matches' : 'differs'}</span></div>}<footer><small>Captured by {invoice.capturedByName} · {when(invoice.capturedAt)}</small>{action()}</footer></article>
}

function FinancePaymentActions({ currentUser, authorizations, run }: { currentUser: CurrentUser; authorizations: PaymentAuthorization[]; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState({ method: 'BankTransfer', reference: '', evidence: '' })
  const selected = authorizations.find(item => item.id === selectedId)
  const unpaid = authorizations.filter(item => !item.isPaid)
  return <section className="lav-panel ops-panel">
    <header className="lav-panel-head"><div><span className="lav-kicker">READY TO PAY</span><h2>Authorized payments</h2></div></header>
    <div className="ops-issue-grid">
      {unpaid.map(item => {
        const canExecute = item.authorizedByUserId !== currentUser.id
        return <article key={item.id}>
          <div><span>{item.projectName}</span><b>{item.supplierName}</b><strong>{money(item.amount)}</strong></div>
          <p>Authorized by {item.authorizedByName}</p>
          {canExecute
            ? <button type="button" className="lav-button primary" onClick={() => { setSelectedId(item.id); setForm({ method: 'BankTransfer', reference: '', evidence: '' }) }}>Record payment</button>
            : <span className="ops-status awaitingconfirmation">Authorization must come from another account</span>}
        </article>
      })}
      {unpaid.length === 0 && <Empty>No authorized payment is waiting.</Empty>}
    </div>
    {selected && <div className="ops-modal-wrap" role="presentation">
      <button type="button" className="ops-modal-backdrop" aria-label="Close payment form" onClick={() => setSelectedId(null)}/>
      <form className="lav-panel ops-form ops-modal" onSubmit={event => { event.preventDefault(); void run(() => financeApi.pay(selected.id, { method: form.method, externalReference: form.reference, evidenceReference: form.evidence.trim() || null }), `Payment recorded with external reference ${form.reference}.`).then(saved => { if (saved) setSelectedId(null) }) }}>
        <header><div><span className="lav-kicker">PAYMENT</span><h2>Record approved payment</h2><p>{selected.supplierName} · {selected.projectName}</p></div><button type="button" className="ops-modal-close" onClick={() => setSelectedId(null)}>×</button></header>
        <div className="ops-payment-lock"><span>Authorized amount</span><strong>{money(selected.amount)}</strong></div>
        <label><span>Payment method</span><select value={form.method} onChange={event => setForm({ ...form, method: event.target.value })}><option value="BankTransfer">Bank transfer</option><option value="MPesa">M-Pesa</option><option value="Cheque">Cheque</option><option value="Cash">Cash</option></select></label>
        <label><span>External transaction reference</span><input required minLength={3} maxLength={100} value={form.reference} onChange={event => setForm({ ...form, reference: event.target.value })} placeholder="Bank, M-Pesa or cheque reference"/></label>
        <label><span>Evidence reference (optional)</span><input maxLength={500} value={form.evidence} onChange={event => setForm({ ...form, evidence: event.target.value })} placeholder="Receipt or confirmation file"/></label>
        <div className="ops-buttons"><button type="button" className="lav-button secondary" onClick={() => setSelectedId(null)}>Cancel</button><button className="lav-button primary">Record payment</button></div>
      </form>
    </div>}
  </section>
}

export function LivePettyCashView({ currentUser }: { currentUser: CurrentUser }) {
  const [items, setItems] = useState<PettyCashRequest[]>([])
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const role = currentUser.role

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      pettyCashApi.list(controller.signal),
      role === 'Supervisor'
        ? Promise.all(currentUser.projects.map(project => projectsApi.getSummary(project.id, controller.signal)))
        : Promise.resolve([]),
    ]).then(([result, summaries]) => {
      setItems(result.items)
      setProjectSummaries(summaries)
      setError(null)
    }).catch(requestError => {
      if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) setError(messageOf(requestError))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [currentUser.projects, refresh, role])

  const run = async (action: () => Promise<unknown>, text: string) => {
    try { await action(); setNotice(text); setError(null); setRefresh(value => value + 1); return true }
    catch (requestError) { setError(messageOf(requestError)); return false }
  }

  if (loading) return <Loading>Loading petty cash records…</Loading>
  return <div className="lav-view ops-view petty-cash-view">
    <header className="lav-page-head"><div><span className="lav-kicker">SMALL SITE EXPENSES</span><h1>Petty cash</h1></div></header>
    {error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}
    {role === 'Supervisor' && <PettyCashRequestForm summaries={projectSummaries} run={run}/>}
    <section className="lav-panel ops-panel"><header className="lav-panel-head"><div><span className="lav-kicker">ACCOUNTABILITY QUEUE</span><h2>Petty cash records</h2></div><strong>{items.length} records</strong></header>
      {items.length ? <div className="petty-cash-list">{items.map(item => <PettyCashCard key={item.id} item={item} currentUser={currentUser} run={run}/>)}</div> : <Empty>No petty cash has been requested.</Empty>}
    </section>
  </div>
}

function PettyCashRequestForm({ summaries, run }: { summaries: ProjectSummary[]; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const [form, setForm] = useState({ projectId: '', costCodeId: '', purpose: '', amount: '', neededByDate: '' })
  const selected = summaries.find(item => item.project.id === Number(form.projectId))
  return <form className="lav-panel ops-form" onSubmit={event => { event.preventDefault(); void run(() => pettyCashApi.create({ projectId: Number(form.projectId), costCodeId: Number(form.costCodeId), purpose: form.purpose, amount: Number(form.amount), neededByDate: form.neededByDate }), 'Petty-cash request submitted.').then(saved => { if (saved) setForm({ projectId: '', costCodeId: '', purpose: '', amount: '', neededByDate: '' }) }) }}>
    <h2>Request petty cash</h2><p>For small urgent site costs only. The maximum is KES 100,000.</p>
    <div className="ops-fields"><label><span>Project</span><select required value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value, costCodeId: '' })}><option value="">Choose project</option>{summaries.map(item => <option key={item.project.id} value={item.project.id}>{item.project.name}</option>)}</select></label><label><span>Budget area</span><select required disabled={!selected} value={form.costCodeId} onChange={event => setForm({ ...form, costCodeId: event.target.value })}><option value="">Choose budget area</option>{selected?.costCodes.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label></div>
    <div className="ops-fields"><label><span>Amount</span><input type="number" min="1" max="100000" step="0.01" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })}/></label><label><span>Needed by</span><input type="date" required value={form.neededByDate} onChange={event => setForm({ ...form, neededByDate: event.target.value })}/></label></div>
    <label><span>Purpose of the money</span><input minLength={3} maxLength={500} required value={form.purpose} onChange={event => setForm({ ...form, purpose: event.target.value })} placeholder="What will this cash pay for?"/></label><button className="lav-button primary">Send to Finance</button>
  </form>
}

function PettyCashCard({ item, currentUser, run }: { item: PettyCashRequest; currentUser: CurrentUser; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const [open, setOpen] = useState<'decision' | 'disburse' | 'confirm' | 'reconcile' | 'review' | null>(null)
  const role = currentUser.role
  return <article className="petty-cash-card">
    <header><div><span>{item.projectName}</span><small className="petty-cash-purpose-label">Purpose</small><h3>{item.purpose}</h3><small>{item.costCode} · requested by {item.requestedByName}</small></div><b className={`ops-status ${item.status.toLowerCase()}`}>{item.status.replaceAll(/([A-Z])/g, ' $1').trim()}</b></header>
    <div className="petty-cash-facts"><span>Requested<strong>{money(item.amountRequested)}</strong></span><span>Approved<strong>{item.amountApproved ? money(item.amountApproved) : '—'}</strong></span><span>Needed<strong>{new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${item.neededByDate}T00:00:00`))}</strong></span><span>Evidence<strong>{item.latestReconciliation?.evidenceReference ?? item.disbursement?.evidenceReference ?? 'Waiting'}</strong></span></div>
    {item.disbursement && <p className="petty-cash-proof">Handed to {item.disbursement.recipientName}: {money(item.disbursement.amount)} by {item.disbursement.method} · {item.disbursement.externalReference}</p>}
    {item.receiptConfirmation && <p className="petty-cash-proof">Receipt confirmed by {item.receiptConfirmation.confirmedByName} · {when(item.receiptConfirmation.confirmedAt)}</p>}
    {item.latestReconciliation && <p className="petty-cash-proof">Accounted: {money(item.latestReconciliation.amountSpent)} spent + {money(item.latestReconciliation.amountReturned)} returned · {item.latestReconciliation.status}</p>}
    <div className="ops-buttons petty-cash-actions">
      {role === 'Finance Officer' && item.status === 'PendingFinanceApproval' && <button className="lav-button primary" onClick={() => setOpen('decision')}>Review request</button>}
      {role === 'Finance Officer' && item.status === 'Approved' && <button className="lav-button primary" onClick={() => setOpen('disburse')}>Record handover</button>}
      {role === 'Supervisor' && item.status === 'Disbursed' && item.requestedByUserId === currentUser.id && !item.receiptConfirmation && <button className="lav-button primary" onClick={() => setOpen('confirm')}>Confirm receipt</button>}
      {role === 'Supervisor' && item.status === 'Disbursed' && item.requestedByUserId === currentUser.id && item.receiptConfirmation && <button className="lav-button primary" onClick={() => setOpen('reconcile')}>Submit receipts</button>}
      {role === 'Finance Officer' && item.status === 'ReconciliationSubmitted' && <button className="lav-button primary" onClick={() => setOpen('review')}>Review evidence</button>}
    </div>
    {open === 'decision' && <PettyCashDecision item={item} close={() => setOpen(null)} run={run}/>}
    {open === 'disburse' && <PettyCashDisbursementForm item={item} close={() => setOpen(null)} run={run}/>}
    {open === 'confirm' && <PettyCashReceiptForm item={item} close={() => setOpen(null)} run={run}/>}
    {open === 'reconcile' && <PettyCashReconciliationForm item={item} close={() => setOpen(null)} run={run}/>}
    {open === 'review' && <PettyCashReview item={item} close={() => setOpen(null)} run={run}/>}
  </article>
}

function PettyCashPurpose({ item }: { item: PettyCashRequest }) {
  return <div className="petty-cash-purpose"><span>Purpose</span><strong>{item.purpose}</strong></div>
}

function PettyCashDecision({ item, close, run }: { item: PettyCashRequest; close: () => void; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const [amount, setAmount] = useState(String(item.amountRequested)); const [notes, setNotes] = useState('')
  const decide = (approve: boolean) => void run(() => pettyCashApi.decide(item.id, { approve, amountApproved: approve ? Number(amount) : null, notes }), approve ? 'Petty cash approved.' : 'Petty cash rejected.').then(saved => { if (saved) close() })
  return <div className="petty-cash-inline"><PettyCashPurpose item={item}/><label><span>Approved amount</span><input type="number" min="1" max={item.amountRequested} step="0.01" value={amount} onChange={event => setAmount(event.target.value)}/></label><label><span>Decision notes</span><input required minLength={3} value={notes} onChange={event => setNotes(event.target.value)}/></label><div className="ops-buttons"><button className="lav-button secondary" disabled={notes.trim().length < 3} onClick={() => decide(false)}>Reject</button><button className="lav-button primary" disabled={notes.trim().length < 3} onClick={() => decide(true)}>Approve</button><button className="lav-button secondary" onClick={close}>Cancel</button></div></div>
}

function PettyCashDisbursementForm({ item, close, run }: { item: PettyCashRequest; close: () => void; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const [form, setForm] = useState({ method: 'MPesa', reference: '', recipient: item.requestedByName, acknowledgement: '', evidence: '' })
  return <form className="petty-cash-inline" onSubmit={event => { event.preventDefault(); void run(() => pettyCashApi.disburse(item.id, { method: form.method, externalReference: form.reference, recipientName: form.recipient, recipientAcknowledgementReference: form.acknowledgement, evidenceReference: form.evidence }), 'Petty-cash handover recorded.').then(saved => { if (saved) close() }) }}><PettyCashPurpose item={item}/><div className="ops-fields"><label><span>Method</span><select value={form.method} onChange={event => setForm({ ...form, method: event.target.value })}><option>MPesa</option><option>BankTransfer</option><option>Cheque</option><option>Cash</option></select></label><label><span>Payment reference</span><input required minLength={3} value={form.reference} onChange={event => setForm({ ...form, reference: event.target.value })}/></label></div><label><span>Recipient</span><input required minLength={3} value={form.recipient} onChange={event => setForm({ ...form, recipient: event.target.value })}/></label><label><span>Recipient acknowledgement</span><input required minLength={3} value={form.acknowledgement} onChange={event => setForm({ ...form, acknowledgement: event.target.value })} placeholder="Signed voucher, PIN or message reference"/></label><label><span>Cash-out evidence</span><input required minLength={3} value={form.evidence} onChange={event => setForm({ ...form, evidence: event.target.value })}/></label><div className="ops-buttons"><button className="lav-button secondary" type="button" onClick={close}>Cancel</button><button className="lav-button primary">Record handover</button></div></form>
}

function PettyCashReceiptForm({ item, close, run }: { item: PettyCashRequest; close: () => void; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const [notes, setNotes] = useState('')
  const amount = item.disbursement?.amount ?? 0
  return <form className="petty-cash-inline" onSubmit={event => { event.preventDefault(); void run(() => pettyCashApi.confirmReceipt(item.id, { amountReceived: amount, notes: notes.trim() || null }), 'Receipt confirmed.').then(saved => { if (saved) close() }) }}><PettyCashPurpose item={item}/><p>Amount received: <strong>{money(amount)}</strong></p><label><span>Note (optional)</span><input maxLength={500} value={notes} onChange={event => setNotes(event.target.value)}/></label><div className="ops-buttons"><button className="lav-button secondary" type="button" onClick={close}>Cancel</button><button className="lav-button primary">Confirm receipt</button></div></form>
}

function PettyCashReconciliationForm({ item, close, run }: { item: PettyCashRequest; close: () => void; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const total = item.disbursement?.amount ?? 0; const [form, setForm] = useState({ spent: '', returned: '', evidence: '', returnReference: '', notes: '' })
  return <form className="petty-cash-inline" onSubmit={event => { event.preventDefault(); void run(() => pettyCashApi.reconcile(item.id, { amountSpent: Number(form.spent), amountReturned: Number(form.returned), evidenceReference: form.evidence, returnReference: form.returnReference || null, notes: form.notes }), 'Receipts and returned balance sent to Finance.').then(saved => { if (saved) close() }) }}><PettyCashPurpose item={item}/><p>Account for the complete {money(total)} disbursement.</p><div className="ops-fields"><label><span>Spent</span><input type="number" min="0" max={total} step="0.01" required value={form.spent} onChange={event => setForm({ ...form, spent: event.target.value })}/></label><label><span>Returned</span><input type="number" min="0" max={total} step="0.01" required value={form.returned} onChange={event => setForm({ ...form, returned: event.target.value })}/></label></div><label><span>Receipt bundle reference</span><input required minLength={3} value={form.evidence} onChange={event => setForm({ ...form, evidence: event.target.value })}/></label><label><span>Cash-return reference</span><input value={form.returnReference} onChange={event => setForm({ ...form, returnReference: event.target.value })}/></label><label><span>How the money was used</span><input required minLength={3} maxLength={1000} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })}/></label><div className="ops-buttons"><button className="lav-button secondary" type="button" onClick={close}>Cancel</button><button className="lav-button primary">Submit accountability</button></div></form>
}

function PettyCashReview({ item, close, run }: { item: PettyCashRequest; close: () => void; run: (action: () => Promise<unknown>, text: string) => Promise<boolean> }) {
  const [notes, setNotes] = useState(''); const decide = (approve: boolean) => void run(() => pettyCashApi.reviewReconciliation(item.id, { approve, notes }), approve ? 'Petty cash reconciled and closed.' : 'Accountability returned for correction.').then(saved => { if (saved) close() })
  return <div className="petty-cash-inline"><PettyCashPurpose item={item}/><p>{item.latestReconciliation?.evidenceReference} · {money(item.latestReconciliation?.amountSpent ?? 0)} spent · {money(item.latestReconciliation?.amountReturned ?? 0)} returned</p>{item.latestReconciliation?.notes && <div className="petty-cash-purpose"><span>Recorded use</span><strong>{item.latestReconciliation.notes}</strong></div>}<label><span>Review notes</span><input minLength={3} required value={notes} onChange={event => setNotes(event.target.value)}/></label><div className="ops-buttons"><button className="lav-button secondary" disabled={notes.trim().length < 3} onClick={() => decide(false)}>Return</button><button className="lav-button primary" disabled={notes.trim().length < 3} onClick={() => decide(true)}>Reconcile and close</button><button className="lav-button secondary" onClick={close}>Cancel</button></div></div>
}

function controlEventLabel(item: ControlEvent) {
  const labels: Record<string, string> = {
    'Requisition:Requested': 'Material request created',
    'Requisition:StockReplenishmentRequested': 'Store restock requested',
    'Requisition:Revised': 'Material request revised',
    'Requisition:TechnicalCheckVerified': 'Material request verified',
    'Requisition:TechnicalRevisionRequired': 'Material request returned by Engineer',
    'Requisition:SupervisorApproved': 'Material request approved',
    'Requisition:SupervisorRejected': 'Material request rejected',
    'Requisition:SupervisorReturnedForRevision': 'Material request returned by Supervisor',
    'SourcingRound:Created': 'Supplier sourcing opened',
    'SourcingRound:Awarded': 'Supplier quotation awarded',
    'SourcingRound:AwardCancelled': 'Supplier quotation award cancelled',
    'SourcingRound:Closed': 'Supplier sourcing closed',
    'SourcingRound:Cancelled': 'Supplier sourcing cancelled',
    'SourcingRound:Reopened': 'Supplier sourcing reopened',
    'PurchaseOrder:Created': 'Purchase order created',
    'PurchaseOrder:Submitted': 'Purchase order submitted',
    'PurchaseOrder:Approved': 'Purchase order approved',
    'PurchaseOrder:ReturnedToDraft': 'Purchase order returned for correction',
    'PurchaseOrder:Corrected': 'Purchase order corrected',
    'PurchaseOrder:Rejected': 'Purchase order rejected',
    'PurchaseOrder:Cancelled': 'Purchase order cancelled',
    'PurchaseOrder:Issued': 'Purchase order sent to supplier',
    'GoodsReceipt:GoodsReceived': 'Delivery received into store',
    'GoodsReceiptTechnicalAcceptance:DeliveryTechnicallyAccepted': 'Engineer accepted delivered material',
    'GoodsReceiptTechnicalAcceptance:DeliveryTechnicallyRejected': 'Engineer rejected delivered material',
    'MaterialIssue:MaterialIssued': 'Material issued to Foreman',
    'MaterialIssue:MaterialReceiptConfirmed': 'Foreman confirmed material received',
    'MaterialIssue:MaterialReceiptDisputed': 'Foreman disputed material received',
    'MaterialUsage:MaterialUsed': 'Material use recorded',
    'MaterialUsage:MaterialWastageRecorded': 'Material wastage recorded',
    'SupplierInvoice:InvoiceCaptured': 'Supplier invoice recorded',
    'SupplierInvoice:InvoiceMatched': 'Supplier invoice matched',
    'SupplierInvoice:InvoiceMatchedCeoException': 'Supplier invoice sent for CEO decision',
    'SupplierInvoice:InvoiceMismatch': 'Supplier invoice mismatch recorded',
    'SupplierInvoice:CeoExceptionApproved': 'Supplier invoice approved by CEO',
    'SupplierInvoice:CeoExceptionRejected': 'Supplier invoice rejected by CEO',
    'PaymentAuthorization:PaymentAuthorized': 'Supplier payment authorized',
    'Payment:PaymentExecuted': 'Supplier payment completed',
    'StockTransfer:TransferRequested': 'Store transfer requested',
    'StockTransfer:TransferDispatched': 'Store transfer dispatched',
    'StockTransfer:TransferReceived': 'Store transfer received',
    'StockTransfer:TransferDisputed': 'Store transfer disputed',
    'StockCount:StockCountSubmitted': 'Physical stock count submitted',
    'StockCount:StockCountApproved': 'Physical stock count approved',
    'StockCount:StockCountRejected': 'Physical stock count rejected',
    'PettyCashRequest:PettyCashRequested': 'Petty cash requested',
    'PettyCashRequest:PettyCashApproved': 'Petty cash approved',
    'PettyCashRequest:PettyCashRejected': 'Petty cash rejected',
    'PettyCashDisbursement:PettyCashDisbursed': 'Petty cash handed over',
    'PettyCashReceiptConfirmation:PettyCashReceiptConfirmed': 'Petty cash receipt confirmed',
    'PettyCashReconciliation:PettyCashAccountabilitySubmitted': 'Petty cash receipts submitted',
    'PettyCashReconciliation:PettyCashReconciled': 'Petty cash reconciled',
    'PettyCashReconciliation:PettyCashAccountabilityReturned': 'Petty cash receipts returned for correction',
  }
  return labels[`${item.entityType}:${item.eventType}`]
    ?? `${item.entityType.replaceAll(/([A-Z])/g, ' $1').trim()} ${item.eventType.replaceAll(/([A-Z])/g, ' $1').trim().toLowerCase()}`
}

function controlEventMaterial(item: ControlEvent) {
  const eventQuantity = item.eventQuantity ?? item.requestedQuantity
  if (!item.materialName || !item.materialUnit || eventQuantity === null) return null
  const quantity = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 3 }).format(eventQuantity)
  return `${quantity} ${item.materialUnit} of ${item.materialName}`
}

function controlRecordTitle(item: ControlEvent) {
  if (item.materialName) return item.materialName
  if (item.entityType.startsWith('PettyCash')) return 'Petty cash'
  if (item.entityType === 'StockTransfer') return 'Store transfer'
  if (item.entityType === 'StockCount') return 'Physical stock count'
  return item.entityType.replaceAll(/([A-Z])/g, ' $1').trim()
}

function keyControlMilestones(items: ControlEvent[]) {
  const ordered = [...items].sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
  const findFirst = (matches: (item: ControlEvent) => boolean) => ordered.find(matches)
  const findLast = (matches: (item: ControlEvent) => boolean) => [...ordered].reverse().find(matches)
  const candidates = [
    findFirst(item => item.entityType === 'Requisition' && ['Requested', 'StockReplenishmentRequested'].includes(item.eventType)),
    findLast(item => item.entityType === 'Requisition' && item.eventType === 'SupervisorApproved'),
    findLast(item => (item.entityType === 'PurchaseOrder' && ['Approved', 'Issued'].includes(item.eventType)) || (item.entityType === 'SourcingRound' && item.eventType === 'Awarded')),
    findLast(item => (item.entityType === 'GoodsReceipt' && item.eventType === 'GoodsReceived') || (item.entityType === 'MaterialIssue' && item.eventType === 'MaterialIssued')),
    findLast(item => item.entityType === 'GoodsReceiptTechnicalAcceptance' && ['DeliveryTechnicallyAccepted', 'DeliveryTechnicallyRejected'].includes(item.eventType)),
    findLast(item => item.entityType === 'MaterialUsage' && ['MaterialUsed', 'MaterialWastageRecorded'].includes(item.eventType)),
    findLast(item => (item.entityType === 'Payment' && item.eventType === 'PaymentExecuted') || (item.entityType === 'PaymentAuthorization' && item.eventType === 'PaymentAuthorized')),
  ].filter((item): item is ControlEvent => Boolean(item))

  if (candidates.length > 0) return [...new Map(candidates.map(item => [`${item.entityType}:${item.entityId}:${item.sequenceNumber}`, item])).values()]
  return ordered.slice(0, 6)
}

export function LiveAuditView() {
  const [events, setEvents] = useState<ControlEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    financeApi.controlEvents({}, controller.signal)
      .then(result => { setEvents(result.items); setError(null) })
      .catch(error => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setError(messageOf(error))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  const chains = useMemo(() => {
    const grouped = new Map<string, ControlEvent[]>()
    events.forEach(event => grouped.set(event.chainKey, [...(grouped.get(event.chainKey) ?? []), event]))
    return [...grouped.entries()]
  }, [events])

  return <div className="lav-view ops-view">
    <header className="lav-page-head"><div><h1>Complete control chain</h1></div></header>
    {error && <Notice tone="error">{error}</Notice>}
    {loading ? <Loading>Loading complete control chain…</Loading> : <div className="ops-chain-list">
      {chains.map(([key, items]) => {
        const ordered = [...items].sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
        const first = ordered[0]
        const latest = ordered[ordered.length - 1]
        const material = ordered.map(controlEventMaterial).find(Boolean)
        const milestones = keyControlMilestones(ordered)
        return <section className="lav-panel ops-panel ops-record-card" key={key}>
          <header className="ops-record-summary">
            <div>
              <span>{first.projectName}</span>
              <h2>{controlRecordTitle(first)}</h2>
              {material && <p>{material}</p>}
            </div>
            <div className="ops-record-status">
              <span>Current stage</span>
              <strong>{controlEventLabel(latest)}</strong>
              <small>{when(latest.occurredAt)}</small>
            </div>
          </header>

          <section className="ops-milestone-section">
            <h3>Key milestones</h3>
            <div className="ops-milestones">
              {milestones.map((item, index) => <article key={`${item.entityType}-${item.entityId}-${item.sequenceNumber}`}>
                <i>{index + 1}</i>
                <div>
                  <strong>{controlEventLabel(item)}</strong>
                  <span>{item.actorRole} · {when(item.occurredAt)}</span>
                </div>
              </article>)}
            </div>
          </section>

          <details className="ops-audit-details">
            <summary><span>Full audit history</span><strong>{ordered.length} events</strong></summary>
            <div className="ops-timeline">
              {ordered.map((item, index) => {
                const eventMaterial = controlEventMaterial(item)
                return <article key={`${item.entityType}-${item.entityId}-${item.sequenceNumber}`}>
                  <i>{index + 1}</i>
                  <div>
                    <span>{item.actorRole} · {item.actorName}</span>
                    <b>{controlEventLabel(item)}{eventMaterial ? `: ${eventMaterial}` : ''}</b>
                  </div>
                  <time>{when(item.occurredAt)}</time>
                </article>
              })}
            </div>
          </details>
        </section>
      })}
      {!chains.length && !error && <Empty>The trace will appear as controlled transactions are recorded.</Empty>}
    </div>}
  </div>
}
