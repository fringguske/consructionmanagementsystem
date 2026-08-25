import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ApiError,
  purchaseOrdersApi,
  requisitionsApi,
  sourcingRoundsApi,
  suppliersApi,
  type CurrentUser,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type Requisition,
  type SourcingRound,
  type SourcingRoundStatus,
  type SupplierQuote,
  type SupplierSummary,
} from './api'
import './live-api.css'

export interface LiveProcurementViewProps {
  currentUser: CurrentUser
}

export interface LivePurchaseOrdersViewProps {
  currentUser: CurrentUser
}

interface NoticeProps {
  tone?: 'error' | 'success' | 'neutral'
  children: ReactNode
}

type RoundAction = 'close' | 'cancel' | 'reopen' | null
type OrderAction =
  | 'submit'
  | 'approve'
  | 'issue'
  | 'return'
  | 'reject'
  | 'cancel'
  | 'correct'
  | null

const liveOrderStatuses: PurchaseOrderStatus[] = [
  'Draft',
  'Submitted',
  'Approved',
  'Issued',
]

function Notice({ tone = 'neutral', children }: NoticeProps) {
  return (
    <div className={`lav-notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="lav-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="lav-empty">
      <span aria-hidden="true">—</span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  )
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-KE', { maximumFractionDigits: digits }).format(value)
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Not shown for this role'
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not set'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date)
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not set'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}

function localDate(daysFromToday = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toIsoDateTime(localValue: string): string | null {
  if (!localValue) return null
  const date = new Date(localValue)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function roundStatusLabel(status: SourcingRoundStatus): string {
  const labels: Record<SourcingRoundStatus, string> = {
    Open: 'Collecting quotes',
    Awarded: 'Supplier selected',
    Closed: 'Closed without award',
    Cancelled: 'Cancelled',
  }
  return labels[status]
}

function orderStatusLabel(status: PurchaseOrderStatus): string {
  const labels: Record<PurchaseOrderStatus, string> = {
    Draft: 'Draft',
    Submitted: 'Waiting for approval',
    Approved: 'Approved',
    Issued: 'Sent to supplier',
    Rejected: 'Rejected',
    Cancelled: 'Cancelled',
  }
  return labels[status]
}

function statusTone(status: SourcingRoundStatus | PurchaseOrderStatus): string {
  if (status === 'Approved' || status === 'Awarded' || status === 'Issued') return 'success'
  if (status === 'Rejected' || status === 'Cancelled') return 'danger'
  if (status === 'Closed') return 'return'
  return 'pending'
}

function projectOptionsFrom(
  currentUser: CurrentUser,
  records: Array<{ projectId: number; projectName: string }>,
) {
  const projects = new Map<number, string>()
  currentUser.projects.forEach((project) => projects.set(project.id, project.name))
  records.forEach((record) => projects.set(record.projectId, record.projectName))
  return [...projects.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function LiveProcurementView({ currentUser }: LiveProcurementViewProps) {
  const allowed = ['Procurement Officer', 'Supervisor', 'CEO', 'Auditor'].includes(
    currentUser.role,
  )
  const [rounds, setRounds] = useState<SourcingRound[]>([])
  const [approvedRequisitions, setApprovedRequisitions] = useState<Requisition[]>([])
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(allowed)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [projectFilter, setProjectFilter] = useState('')

  useEffect(() => {
    if (!allowed) return

    const controller = new AbortController()

    const procurement = currentUser.role === 'Procurement Officer'
    Promise.all([
      sourcingRoundsApi.list({ page: 1, pageSize: 100 }, controller.signal),
      purchaseOrdersApi.list({ page: 1, pageSize: 100 }, controller.signal),
      procurement
        ? requisitionsApi.list(
            { page: 1, pageSize: 100, status: 'Approved' },
            controller.signal,
          )
        : Promise.resolve(null),
      procurement
        ? suppliersApi.list({ page: 1, pageSize: 100 }, controller.signal)
        : Promise.resolve(null),
    ])
      .then(([roundResult, orderResult, requisitionResult, supplierResult]) => {
        setRounds(roundResult.items)
        setOrders(orderResult.items)
        setApprovedRequisitions(requisitionResult?.items ?? [])
        setSuppliers(supplierResult?.items ?? [])
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(errorMessage(requestError))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [allowed, currentUser.role, refreshKey])

  const availableRequisitions = useMemo(() => {
    const blockedRequisitions = new Set<number>()
    rounds
      .filter((round) => round.status === 'Open' || round.status === 'Awarded')
      .forEach((round) => blockedRequisitions.add(round.requisitionId))
    orders
      .filter((order) => liveOrderStatuses.includes(order.status))
      .forEach((order) => blockedRequisitions.add(order.requisitionId))
    return approvedRequisitions.filter((item) => !blockedRequisitions.has(item.id))
  }, [approvedRequisitions, orders, rounds])

  const filteredRounds = useMemo(
    () =>
      rounds.filter(
        (round) =>
          (!projectFilter || round.projectId === Number(projectFilter)),
      ),
    [projectFilter, rounds],
  )

  const projects = useMemo(
    () => projectOptionsFrom(currentUser, rounds),
    [currentUser, rounds],
  )

  function replaceRound(updated: SourcingRound, message: string) {
    setRounds((current) => current.map((round) => (round.id === updated.id ? updated : round)))
    setNotice(message)
  }

  function addRound(created: SourcingRound) {
    setRounds((current) => [created, ...current])
    setNotice('Sourcing opened.')
  }

  function addQuote(roundId: number, quote: SupplierQuote) {
    setRounds((current) =>
      current.map((round) =>
        round.id === roundId
          ? {
              ...round,
              quotes: [...round.quotes, quote].sort(
                (left, right) => left.unitPrice - right.unitPrice,
              ),
            }
          : round,
      ),
    )
    setNotice('Quote saved.')
  }

  function addOrder(order: PurchaseOrder) {
    setOrders((current) => [order, ...current])
    setNotice('Draft order created.')
  }

  if (!allowed) {
    return (
      <div className="lav-view">
        <header className="lav-page-head">
          <div>
            <h1>Supplier sourcing</h1>
          </div>
        </header>
        <EmptyState
          title="This workspace is not part of your role"
          detail="Supplier sourcing is not available to this role."
        />
      </div>
    )
  }

  return (
    <div className="lav-view lav-procurement-view ceo-readable">
      <header className="lav-page-head">
        <div>
          <h1>Supplier sourcing</h1>
        </div>
        <span className="lav-count-chip">{rounds.length} rounds</span>
      </header>

      {error && (
        <Notice tone="error">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError(null)
              setRefreshKey((value) => value + 1)
            }}
          >
            Try again
          </button>
        </Notice>
      )}
      {notice && (
        <Notice tone="success">
          {notice}{' '}
          <button type="button" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </Notice>
      )}

      {loading ? (
        <LoadingBlock label="Loading supplier sourcing…" />
      ) : (
        <>
          {currentUser.role === 'Procurement Officer' && (
            <CreateSourcingRoundForm
              requisitions={availableRequisitions}
              onCreated={addRound}
            />
          )}

          <section className="lav-panel">
            <header className="lav-panel-head lav-request-toolbar">
              <div>
                <span className="lav-kicker">Quote comparisons</span>
                <h2>Sourcing record</h2>
              </div>
              <div className="lav-filter-row">
                <label>
                  <span className="lav-visually-hidden">Filter by project</span>
                  <select
                    value={projectFilter}
                    onChange={(event) => setProjectFilter(event.currentTarget.value)}
                  >
                    <option value="">All projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </header>

            <div className="lav-purchase-list">
              {filteredRounds.length === 0 ? (
                <EmptyState
                  title="No sourcing rounds here"
                  detail={
                    rounds.length
                      ? 'Choose another project.'
                      : 'An approved material request is needed before Procurement can start sourcing.'
                  }
                />
              ) : (
                filteredRounds.map((round) => (
                  <SourcingRoundCard
                    key={round.id}
                    round={round}
                    currentUser={currentUser}
                    suppliers={suppliers}
                    liveOrder={orders.find(
                      (order) =>
                        order.requisitionId === round.requisitionId &&
                        liveOrderStatuses.includes(order.status),
                    )}
                    onRoundChanged={replaceRound}
                    onQuoteAdded={addQuote}
                    onOrderCreated={addOrder}
                  />
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function CreateSourcingRoundForm({
  requisitions,
  onCreated,
}: {
  requisitions: Requisition[]
  onCreated: (round: SourcingRound) => void
}) {
  const [open, setOpen] = useState(false)
  const [requisitionId, setRequisitionId] = useState('')
  const [quoteDueAt, setQuoteDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const dueAt = toIsoDateTime(quoteDueAt)
    if (quoteDueAt && !dueAt) {
      setError('Choose a valid future quote deadline.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const created = await sourcingRoundsApi.create({
        requisitionId: Number(requisitionId),
        quoteDueAt: dueAt,
        notes: notes.trim() || null,
      })
      onCreated(created)
      setRequisitionId('')
      setQuoteDueAt('')
      setNotes('')
      setOpen(false)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`lav-create-request ${open ? 'open' : ''}`}>
      <button className="lav-create-toggle" type="button" onClick={() => setOpen(!open)}>
        <span aria-hidden="true">+</span>
        <span>
          <strong>Start supplier sourcing</strong>
          <small>Choose one request already approved by a Supervisor.</small>
        </span>
        <b>{open ? 'Close form' : `${requisitions.length} ready`}</b>
      </button>
      {open && (
        <form onSubmit={submit}>
          {error && <Notice tone="error">{error}</Notice>}
          {requisitions.length === 0 ? (
            <Notice>No approved request is ready for a new sourcing round.</Notice>
          ) : (
            <>
              <div className="lav-form-grid lav-purchase-form-grid">
                <label className="lav-field compact span-two">
                  <span>Approved material request</span>
                  <select
                    value={requisitionId}
                    onChange={(event) => setRequisitionId(event.currentTarget.value)}
                    required
                  >
                    <option value="">Choose request</option>
                    {requisitions.map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.projectName} · {formatNumber(request.quantity)} {request.materialUnit} {request.materialName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lav-field compact">
                  <span>Quotes due <small>Optional</small></span>
                  <input
                    type="datetime-local"
                    value={quoteDueAt}
                    onChange={(event) => setQuoteDueAt(event.currentTarget.value)}
                  />
                </label>
                <label className="lav-field compact span-three">
                  <span>Instructions <small>Optional</small></span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.currentTarget.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="Delivery or quotation instructions"
                  />
                </label>
              </div>
              <div className="lav-form-actions">
                <button className="lav-button primary" type="submit" disabled={busy}>
                  {busy ? 'Opening…' : 'Open sourcing round'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </section>
  )
}

function SourcingRoundCard({
  round,
  currentUser,
  suppliers,
  liveOrder,
  onRoundChanged,
  onQuoteAdded,
  onOrderCreated,
}: {
  round: SourcingRound
  currentUser: CurrentUser
  suppliers: SupplierSummary[]
  liveOrder?: PurchaseOrder
  onRoundChanged: (round: SourcingRound, message: string) => void
  onQuoteAdded: (roundId: number, quote: SupplierQuote) => void
  onOrderCreated: (order: PurchaseOrder) => void
}) {
  const [quoteFormOpen, setQuoteFormOpen] = useState(false)
  const [poQuoteId, setPoQuoteId] = useState<number | null>(null)
  const [roundAction, setRoundAction] = useState<RoundAction>(null)
  const procurement = currentUser.role === 'Procurement Officer'
  const independentReviewer = currentUser.role === 'Supervisor' || currentUser.role === 'CEO'
  const canClose = procurement && round.status === 'Open' && !liveOrder
  const canCancel = independentReviewer && round.status === 'Open' && !liveOrder
  const canReopen =
    (procurement && round.status === 'Closed') ||
    (independentReviewer && round.status === 'Cancelled')

  return (
    <article className={`lav-purchase-card status-${round.status.toLowerCase()}`}>
      <header>
        <div className="lav-request-id">
          <span>{round.status === 'Cancelled' ? 'CANCELLED SOURCING' : round.status === 'Awarded' ? 'SUPPLIER SELECTED' : 'SUPPLIER SOURCING'}</span>
          <strong>{round.materialName}</strong>
          <small>{round.projectName}</small>
        </div>
        <span className={`lav-status ${statusTone(round.status)}`}>
          {roundStatusLabel(round.status)}
        </span>
      </header>

      <div className="lav-purchase-facts">
        <div>
          <span>Quantity required</span>
          <strong>
            {formatNumber(round.requestedQuantity)} {round.materialUnit}
          </strong>
        </div>
        <div>
          <span>Quotes received</span>
          <strong>{round.quotes.length}</strong>
        </div>
        <div>
          <span>Quote deadline</span>
          <strong>{formatDateTime(round.quoteDueAt)}</strong>
        </div>
        <div>
          <span>Opened by</span>
          <strong>{round.createdByUserName}</strong>
        </div>
      </div>

      {round.notes && <p className="lav-action-message">{round.notes}</p>}
      <QuoteComparison
        quotes={round.quotes}
        unit={round.materialUnit}
        canPrepareOrder={procurement && round.status === 'Open' && !liveOrder}
        onPrepareOrder={setPoQuoteId}
      />

      {poQuoteId !== null && procurement && round.status === 'Open' && !liveOrder && (
        <CreatePurchaseOrderForm
          round={round}
          quote={round.quotes.find((quote) => quote.id === poQuoteId)!}
          onCancel={() => setPoQuoteId(null)}
          onCreated={(order) => {
            onOrderCreated(order)
            setPoQuoteId(null)
          }}
        />
      )}

      {quoteFormOpen && procurement && round.status === 'Open' && !liveOrder && (
        <RecordQuoteForm
          round={round}
          suppliers={suppliers}
          onCancel={() => setQuoteFormOpen(false)}
          onCreated={(quote) => {
            onQuoteAdded(round.id, quote)
            setQuoteFormOpen(false)
          }}
        />
      )}

      {roundAction && (
        <RoundActionForm
          round={round}
          action={roundAction}
          onCancel={() => setRoundAction(null)}
          onChanged={(updated, message) => {
            onRoundChanged(updated, message)
            setQuoteFormOpen(false)
            setPoQuoteId(null)
            setRoundAction(null)
          }}
        />
      )}

      {(procurement || independentReviewer) && (
        <div className="lav-card-action-row lav-multi-actions">
          {procurement && round.status === 'Open' && !liveOrder && (
            <button
              className="lav-button secondary"
              type="button"
              onClick={() => setQuoteFormOpen((value) => !value)}
            >
              {quoteFormOpen ? 'Close quote form' : 'Add supplier quote'}
            </button>
          )}
          {canClose && (
            <button className="lav-button secondary" type="button" onClick={() => setRoundAction('close')}>
              Close without award
            </button>
          )}
          {canCancel && (
            <button className="lav-button danger-outline" type="button" onClick={() => setRoundAction('cancel')}>
              Cancel round
            </button>
          )}
          {canReopen && (
            <button className="lav-button primary" type="button" onClick={() => setRoundAction('reopen')}>
              Reopen round
            </button>
          )}
        </div>
      )}

      {(currentUser.role === 'CEO' || currentUser.role === 'Auditor') && (
        <WorkflowHistory
          title="Sourcing history"
          events={round.events.map((event) => ({
            id: event.id,
            eventType: event.eventType,
            actor: `${event.actorUserName} · ${event.actorRole}`,
            notes: event.notes,
            occurredAt: event.occurredAt,
          }))}
        />
      )}
    </article>
  )
}

function QuoteComparison({
  quotes,
  unit,
  canPrepareOrder,
  onPrepareOrder,
}: {
  quotes: SupplierQuote[]
  unit: string
  canPrepareOrder: boolean
  onPrepareOrder: (quoteId: number) => void
}) {
  if (!quotes.length) {
    return <p className="lav-muted-copy lav-purchase-empty-line">No supplier quote recorded yet.</p>
  }

  return (
    <div className="lav-quote-table-wrap">
      <table className="lav-quote-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Quantity</th>
            <th>Unit price</th>
            <th>Price check</th>
            <th>Total offer</th>
            {canPrepareOrder && <th><span className="lav-visually-hidden">Action</span></th>}
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote, index) => (
            <tr key={quote.id}>
              <td>
                <strong>{quote.supplierName}</strong>
              </td>
              <td>
                {formatNumber(quote.quantityOffered)} {unit}
              </td>
              <td>{formatMoney(quote.unitPrice)}</td>
              <td>
                {quote.priceVariancePercentage === null ? (
                  <span className="lav-price-check neutral">No reference price</span>
                ) : (
                  <span className={`lav-price-check ${quote.priceAboveStandard ? 'high' : 'ok'}`}>
                    {quote.priceVariancePercentage > 0 ? '+' : ''}
                    {formatNumber(quote.priceVariancePercentage)}% vs reference
                  </span>
                )}
              </td>
              <td>
                <strong>{formatMoney(quote.totalPrice)}</strong>
                {index === 0 && <small>Lowest unit price</small>}
              </td>
              {canPrepareOrder && (
                <td>
                  <button
                    className="lav-text-button"
                    type="button"
                    onClick={() => onPrepareOrder(quote.id)}
                  >
                    Prepare PO
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecordQuoteForm({
  round,
  suppliers,
  onCancel,
  onCreated,
}: {
  round: SourcingRound
  suppliers: SupplierSummary[]
  onCancel: () => void
  onCreated: (quote: SupplierQuote) => void
}) {
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [quantity, setQuantity] = useState(String(round.requestedQuantity))
  const [unitPrice, setUnitPrice] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eligibleSuppliers = suppliers.filter((supplier) => !supplier.isBlacklisted)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const quote = await sourcingRoundsApi.recordQuote(round.id, {
        supplierId: Number(supplierId),
        quoteReference: reference.trim(),
        quantityOffered: Number(quantity),
        unitPrice: Number(unitPrice),
        validUntil: validUntil || null,
        notes: notes.trim() || null,
      })
      onCreated(quote)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="lav-workflow-form" onSubmit={submit}>
      <header>
        <div>
          <span className="lav-kicker">Procurement action</span>
          <h3>Record supplier quote</h3>
        </div>
        <button className="lav-text-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      {eligibleSuppliers.length === 0 ? (
        <Notice>No active supplier is available. Register or reinstate a supplier first.</Notice>
      ) : (
        <>
          <div className="lav-form-grid lav-purchase-form-grid">
            <label className="lav-field compact">
              <span>Supplier</span>
              <select value={supplierId} onChange={(event) => setSupplierId(event.currentTarget.value)} required>
                <option value="">Choose supplier</option>
                {eligibleSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}{supplier.category ? ` · ${supplier.category}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="lav-field compact">
              <span>Quote reference</span>
              <input value={reference} onChange={(event) => setReference(event.currentTarget.value)} maxLength={100} required />
            </label>
            <label className="lav-field compact">
              <span>Quantity offered ({round.materialUnit})</span>
              <input type="number" min={round.requestedQuantity} step="0.001" value={quantity} onChange={(event) => setQuantity(event.currentTarget.value)} required />
            </label>
            <label className="lav-field compact">
              <span>Price per {round.materialUnit} (KES)</span>
              <input type="number" min="0.01" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.currentTarget.value)} required />
            </label>
            <label className="lav-field compact">
              <span>Valid until <small>Optional</small></span>
              <input type="date" min={localDate()} value={validUntil} onChange={(event) => setValidUntil(event.currentTarget.value)} />
            </label>
            <label className="lav-field compact span-two">
              <span>Notes <small>Optional</small></span>
              <input value={notes} onChange={(event) => setNotes(event.currentTarget.value)} maxLength={1000} />
            </label>
          </div>
          <div className="lav-form-actions">
            <span>The server records the material reference price with this quote.</span>
            <button className="lav-button primary" type="submit" disabled={busy}>
              {busy ? 'Recording…' : 'Record quote'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}

function CreatePurchaseOrderForm({
  round,
  quote,
  onCancel,
  onCreated,
}: {
  round: SourcingRound
  quote: SupplierQuote
  onCancel: () => void
  onCreated: (order: PurchaseOrder) => void
}) {
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(localDate(7))
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const order = await purchaseOrdersApi.create({
        requisitionId: round.requisitionId,
        supplierQuoteId: quote.id,
        expectedDeliveryDate,
        deliveryLocation: deliveryLocation.trim() || null,
        notes: notes.trim() || null,
      })
      onCreated(order)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="lav-workflow-form lav-order-create-form" onSubmit={submit}>
      <header>
        <div>
          <span className="lav-kicker">Draft order</span>
          <h3>Prepare PO for {quote.supplierName}</h3>
        </div>
        <button className="lav-text-button" type="button" onClick={onCancel}>Cancel</button>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      <Notice>
        Proposed value: {formatMoney(round.requestedQuantity * quote.unitPrice)}
      </Notice>
      <div className="lav-form-grid lav-purchase-form-grid">
        <label className="lav-field compact">
          <span>Expected delivery</span>
          <input type="date" min={localDate()} value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.currentTarget.value)} required />
        </label>
        <label className="lav-field compact span-two">
          <span>Delivery location <small>Defaults to project location</small></span>
          <input value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.currentTarget.value)} maxLength={300} />
        </label>
        <label className="lav-field compact span-three">
          <span>Order notes <small>Optional</small></span>
          <textarea value={notes} onChange={(event) => setNotes(event.currentTarget.value)} maxLength={1000} rows={2} />
        </label>
      </div>
      <div className="lav-form-actions">
        <span>Material, quantity and unit price are copied from the approved records.</span>
        <button className="lav-button primary" type="submit" disabled={busy}>
          {busy ? 'Preparing…' : 'Create draft PO'}
        </button>
      </div>
    </form>
  )
}

function RoundActionForm({
  round,
  action,
  onCancel,
  onChanged,
}: {
  round: SourcingRound
  action: Exclude<RoundAction, null>
  onCancel: () => void
  onChanged: (round: SourcingRound, message: string) => void
}) {
  const [reason, setReason] = useState('')
  const [quoteDueAt, setQuoteDueAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      let updated: SourcingRound
      if (action === 'close') {
        updated = await sourcingRoundsApi.close(round.id, { reason: reason.trim() })
      } else if (action === 'cancel') {
        updated = await sourcingRoundsApi.cancel(round.id, { reason: reason.trim() })
      } else {
        updated = await sourcingRoundsApi.reopen(round.id, {
          reason: reason.trim(),
          quoteDueAt: toIsoDateTime(quoteDueAt),
        })
      }
      const message =
        action === 'reopen'
          ? 'Sourcing reopened.'
          : action === 'close'
            ? 'Sourcing closed.'
            : 'Sourcing cancelled.'
      onChanged(updated, message)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="lav-workflow-form" onSubmit={submit}>
      <header>
        <div>
          <span className="lav-kicker">Recorded decision</span>
          <h3>{action === 'reopen' ? 'Reopen sourcing' : action === 'close' ? 'Close without award' : 'Cancel sourcing'}</h3>
        </div>
        <button className="lav-text-button" type="button" onClick={onCancel}>Cancel</button>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="lav-form-grid lav-purchase-form-grid">
        <label className="lav-field compact span-two">
          <span>Reason</span>
          <input value={reason} onChange={(event) => setReason(event.currentTarget.value)} minLength={3} maxLength={1000} required />
        </label>
        {action === 'reopen' && (
          <label className="lav-field compact">
            <span>New quote deadline <small>Optional</small></span>
            <input type="datetime-local" value={quoteDueAt} onChange={(event) => setQuoteDueAt(event.currentTarget.value)} />
          </label>
        )}
      </div>
      <div className="lav-form-actions">
        <span>Your reason is kept in the permanent sourcing history.</span>
        <button className={`lav-button ${action === 'cancel' ? 'danger' : 'primary'}`} type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Confirm action'}
        </button>
      </div>
    </form>
  )
}

export function LivePurchaseOrdersView({ currentUser }: LivePurchaseOrdersViewProps) {
  const allowed = [
    'Procurement Officer',
    'Supervisor',
    'Storekeeper',
    'Finance Officer',
    'CEO',
    'Auditor',
  ].includes(currentUser.role)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(allowed)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [projectFilter, setProjectFilter] = useState('')

  useEffect(() => {
    if (!allowed) return
    const controller = new AbortController()
    purchaseOrdersApi
      .list({ page: 1, pageSize: 100 }, controller.signal)
      .then((result) => {
        setOrders(result.items)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(errorMessage(requestError))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [allowed, refreshKey])

  const projects = useMemo(
    () => projectOptionsFrom(currentUser, orders),
    [currentUser, orders],
  )
  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        (!projectFilter || order.projectId === Number(projectFilter)),
    )
  }, [orders, projectFilter])

  function replaceOrder(updated: PurchaseOrder, message: string) {
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)))
    setNotice(message)
  }

  if (!allowed) {
    return (
      <div className="lav-view">
        <header className="lav-page-head">
          <div>
            <h1>Purchase orders</h1>
          </div>
        </header>
        <EmptyState title="This workspace is not part of your role" detail="Purchase orders are not available to this role." />
      </div>
    )
  }

  return (
    <div className="lav-view lav-procurement-view ceo-readable">
      <header className="lav-page-head">
        <div>
          <h1>Purchase orders</h1>
        </div>
        <span className="lav-count-chip">{orders.length} visible</span>
      </header>

      {error && (
        <Notice tone="error">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError(null)
              setRefreshKey((value) => value + 1)
            }}
          >
            Try again
          </button>
        </Notice>
      )}
      {notice && (
        <Notice tone="success">
          {notice}{' '}
          <button type="button" onClick={() => setNotice(null)}>Dismiss</button>
        </Notice>
      )}

      {loading ? (
        <LoadingBlock label="Loading purchase orders…" />
      ) : (
        <section className="lav-panel">
          <header className="lav-panel-head lav-request-toolbar">
            <div>
              <h2>Orders</h2>
            </div>
            <div className="lav-filter-row">
              <label>
                <span className="lav-visually-hidden">Filter by project</span>
                <select value={projectFilter} onChange={(event) => setProjectFilter(event.currentTarget.value)}>
                  <option value="">All projects</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
            </div>
          </header>
          <div className="lav-purchase-list">
            {filteredOrders.length === 0 ? (
              <EmptyState
                title="No purchase orders here"
                detail={orders.length ? 'Choose another project.' : 'A supplier quote must be selected before an order can be prepared.'}
              />
            ) : (
              filteredOrders.map((order) => (
                <PurchaseOrderCard
                  key={order.id}
                  order={order}
                  currentUser={currentUser}
                  onChanged={replaceOrder}
                />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function PurchaseOrderCard({
  order,
  currentUser,
  onChanged,
}: {
  order: PurchaseOrder
  currentUser: CurrentUser
  onChanged: (order: PurchaseOrder, message: string) => void
}) {
  const [action, setAction] = useState<OrderAction>(null)
  const procurement = currentUser.role === 'Procurement Officer'
  const reviewer = currentUser.role === 'Supervisor' || currentUser.role === 'CEO'
  const creator = order.createdByUserId === currentUser.id
  const canSubmit = procurement && creator && order.status === 'Draft'
  const canCorrect = canSubmit
  const canIssue = procurement && order.status === 'Approved'
  const canProcurementCancel = procurement && creator && (order.status === 'Draft' || order.status === 'Rejected')
  const canReview = reviewer && order.status === 'Submitted'
  const canReviewerCancel = reviewer && (order.status === 'Submitted' || order.status === 'Approved')
  const showActions = canSubmit || canCorrect || canIssue || canProcurementCancel || canReview || canReviewerCancel
  const line = order.lines[0]

  return (
    <article className="lav-purchase-card">
      <header>
        <div className="lav-request-id">
          <span>{order.status === 'Cancelled' ? 'CANCELLED ORDER' : 'PURCHASE ORDER'}</span>
          <strong>{order.supplierName}</strong>
          <small>{order.projectName}</small>
        </div>
        <span className={`lav-status ${statusTone(order.status)}`}>{orderStatusLabel(order.status)}</span>
      </header>

      <div className="lav-purchase-facts order">
        <div>
          <span>Material</span>
          <strong>{line ? `${formatNumber(line.quantity)} ${line.materialUnit} ${line.materialName}` : 'No lines returned'}</strong>
        </div>
        <div>
          <span>Order value</span>
          <strong>{formatMoney(order.totalAmount)}</strong>
        </div>
        <div>
          <span>Expected delivery</span>
          <strong>{formatDate(order.expectedDeliveryDate)}</strong>
        </div>
        <div>
          <span>Deliver to</span>
          <strong>{order.deliveryLocation || order.projectName}</strong>
        </div>
      </div>

      {order.notes && <p className="lav-action-message">{order.notes}</p>}
      <OrderMilestones order={order} />

      {action && (
        <OrderActionForm
          key={action}
          order={order}
          action={action}
          onCancel={() => setAction(null)}
          onChanged={(updated, message) => {
            onChanged(updated, message)
            setAction(null)
          }}
        />
      )}

      {showActions && (
        <div className="lav-card-action-row lav-multi-actions">
          {canCorrect && <button className="lav-button secondary" type="button" onClick={() => setAction('correct')}>Correct details</button>}
          {canSubmit && <button className="lav-button primary" type="button" onClick={() => setAction('submit')}>Submit for approval</button>}
          {canIssue && <button className="lav-button primary" type="button" onClick={() => setAction('issue')}>Issue to supplier</button>}
          {canReview && <button className="lav-button primary" type="button" onClick={() => setAction('approve')}>Approve</button>}
          {canReview && <button className="lav-button secondary" type="button" onClick={() => setAction('return')}>Return for correction</button>}
          {canReview && <button className="lav-button danger-outline" type="button" onClick={() => setAction('reject')}>Reject</button>}
          {(canProcurementCancel || canReviewerCancel) && <button className="lav-button danger-outline" type="button" onClick={() => setAction('cancel')}>Cancel order</button>}
        </div>
      )}

      {(currentUser.role === 'CEO' || currentUser.role === 'Auditor') && (
        <WorkflowHistory
          title="Complete order history"
          events={order.events.map((event) => ({
            id: event.id,
            eventType: event.eventType,
            actor: `${event.actorUserName} · ${event.actorRole}`,
            notes: event.notes,
            occurredAt: event.occurredAt,
          }))}
        />
      )}
    </article>
  )
}

function OrderMilestones({ order }: { order: PurchaseOrder }) {
  const milestones = [
    { label: 'Prepared', at: order.createdAt, by: order.createdByUserName },
    { label: 'Submitted', at: order.submittedAt },
    { label: 'Approved', at: order.approvedAt, by: order.approvedByUserName },
    { label: 'Sent to supplier', at: order.issuedAt, by: order.issuedByUserName },
  ]
  return (
    <ol className="lav-order-milestones" aria-label="Purchase order progress">
      {milestones.map((milestone) => (
        <li key={milestone.label} className={milestone.at ? 'done' : ''}>
          <i aria-hidden="true" />
          <span>{milestone.label}</span>
          <small>{milestone.at ? `${formatDateTime(milestone.at)}${milestone.by ? ` · ${milestone.by}` : ''}` : 'Not reached'}</small>
        </li>
      ))}
    </ol>
  )
}

function OrderActionForm({
  order,
  action,
  onCancel,
  onChanged,
}: {
  order: PurchaseOrder
  action: Exclude<OrderAction, null>
  onCancel: () => void
  onChanged: (order: PurchaseOrder, message: string) => void
}) {
  const [notes, setNotes] = useState(action === 'correct' ? (order.notes ?? '') : '')
  const [reason, setReason] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(order.expectedDeliveryDate ?? localDate())
  const [deliveryLocation, setDeliveryLocation] = useState(order.deliveryLocation ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reasonRequired = action === 'return' || action === 'reject' || action === 'cancel' || action === 'correct'

  const titles: Record<Exclude<OrderAction, null>, string> = {
    submit: 'Submit order for approval',
    approve: 'Approve supplier order',
    issue: 'Issue approved order',
    return: 'Return order for correction',
    reject: 'Reject order',
    cancel: 'Cancel order',
    correct: 'Correct delivery details',
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      let updated: PurchaseOrder
      if (action === 'submit') {
        updated = await purchaseOrdersApi.submit(order.id, { notes: notes.trim() || null })
      } else if (action === 'approve') {
        updated = await purchaseOrdersApi.approve(order.id, { notes: notes.trim() || null })
      } else if (action === 'issue') {
        updated = await purchaseOrdersApi.issue(order.id, { notes: notes.trim() || null })
      } else if (action === 'return') {
        updated = await purchaseOrdersApi.returnToDraft(order.id, { reason: reason.trim() })
      } else if (action === 'reject') {
        updated = await purchaseOrdersApi.reject(order.id, { reason: reason.trim() })
      } else if (action === 'cancel') {
        updated = await purchaseOrdersApi.cancel(order.id, { reason: reason.trim() })
      } else {
        updated = await purchaseOrdersApi.correct(order.id, {
          expectedDeliveryDate: deliveryDate,
          deliveryLocation: deliveryLocation.trim() || null,
          notes: notes.trim() || null,
          reason: reason.trim(),
        })
      }
      onChanged(updated, `Order ${orderStatusLabel(updated.status).toLowerCase()}.`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="lav-workflow-form" onSubmit={submit}>
      <header>
        <div>
          <span className="lav-kicker">Recorded action</span>
          <h3>{titles[action]}</h3>
        </div>
        <button className="lav-text-button" type="button" onClick={onCancel}>Cancel</button>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      {action === 'correct' && (
        <div className="lav-form-grid lav-purchase-form-grid">
          <label className="lav-field compact">
            <span>Expected delivery</span>
            <input type="date" min={localDate()} value={deliveryDate} onChange={(event) => setDeliveryDate(event.currentTarget.value)} required />
          </label>
          <label className="lav-field compact span-two">
            <span>Delivery location</span>
            <input value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.currentTarget.value)} maxLength={300} />
          </label>
        </div>
      )}
      {(action === 'submit' || action === 'approve' || action === 'issue' || action === 'correct') && (
        <label className="lav-field compact lav-action-field">
          <span>{action === 'correct' ? 'Order notes' : 'Action note'} <small>Optional</small></span>
          <textarea value={notes} onChange={(event) => setNotes(event.currentTarget.value)} maxLength={1000} rows={2} />
        </label>
      )}
      {reasonRequired && (
        <label className="lav-field compact lav-action-field">
          <span>Reason</span>
          <textarea value={reason} onChange={(event) => setReason(event.currentTarget.value)} minLength={3} maxLength={1000} rows={2} required />
        </label>
      )}
      <div className="lav-form-actions">
        <span />
        <button className={`lav-button ${action === 'reject' || action === 'cancel' ? 'danger' : 'primary'}`} type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Confirm action'}
        </button>
      </div>
    </form>
  )
}

function WorkflowHistory({
  title,
  events,
}: {
  title: string
  events: Array<{
    id: number
    eventType: string
    actor: string
    notes: string | null
    occurredAt: string
  }>
}) {
  return (
    <details className="lav-history">
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{events.length} recorded events</small>
        </span>
        <b>Open</b>
      </summary>
      <ol>
        {events.length ? (
          events.map((event, index) => (
            <li key={event.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{event.eventType}</strong>
                <p>{event.actor} · {formatDateTime(event.occurredAt)}</p>
                {event.notes && <blockquote>{event.notes}</blockquote>}
              </div>
            </li>
          ))
        ) : (
          <li className="lav-history-empty">No detailed events were returned.</li>
        )}
      </ol>
    </details>
  )
}
