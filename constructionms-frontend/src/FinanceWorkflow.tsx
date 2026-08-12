import { useEffect, useMemo, useState, type ReactNode } from 'react'
import './finance-workflow.css'

type WorkflowRole =
  | 'CEO'
  | 'Foreman'
  | 'Supervisor'
  | 'Procurement Officer'
  | 'Storekeeper'
  | 'Engineer'
  | 'Finance Officer'
  | 'Cashier'
  | 'Auditor'

type StepState = 'complete' | 'current' | 'pending' | 'blocked'

export type TransactionChainStep = {
  role: WorkflowRole
  actor: string
  action: string
  reference: string
  evidence: string
  timestamp: string
  state: StepState
}

export type TransactionChain = {
  id: string
  item: string
  project: string
  supplier: string
  amount: number
  status: 'Paid & audited' | 'Finance review' | 'CEO exception'
  currentStage: string
  risk: string
  ceoActionRequired: boolean
  ceoReason?: string
  steps: TransactionChainStep[]
}

const actors = {
  foremanGilgal: 'Gilgal Sites Foreman',
  foremanChurchHq: 'Church & SNEP Foreman',
  supervisorGilgal: 'Gilgal Sites Supervisor',
  supervisorChurchHq: 'Church & SNEP Supervisor',
  procurement: 'Paul Kimani',
  storekeeper: 'Lucy Njeri',
  engineerGilgal: 'Gilgal Sites Engineer',
  engineerChurchHq: 'Church & SNEP Engineer',
  finance: 'James Kamau',
  cashier: 'Eunice Ngumbi',
  auditor: 'Mary Atienza',
}

// Exported for the CEO oversight surface as well as the Finance workspace.
// eslint-disable-next-line react-refresh/only-export-components
export const transactionChains: TransactionChain[] = [
  {
    id: 'P2P-0244',
    item: 'Bamburi Powermax cement · 180 bags',
    project: 'SNEP HQ',
    supplier: 'Bamburi Cement PLC',
    amount: 171000,
    status: 'Paid & audited',
    currentStage: 'Control chain closed',
    risk: 'No open exception',
    ceoActionRequired: false,
    steps: [
      { role: 'Foreman', actor: actors.foremanChurchHq, action: 'Raised the material need against the masonry cost code', reference: 'MR-0244', evidence: 'Site material plan · 1 file', timestamp: '22 Jul · 08:10', state: 'complete' },
      { role: 'Supervisor', actor: actors.supervisorChurchHq, action: 'Confirmed need, timing and available project budget', reference: 'APR-0438', evidence: 'Supervisor approval record', timestamp: '22 Jul · 08:42', state: 'complete' },
      { role: 'Procurement Officer', actor: actors.procurement, action: 'Compared three quotations and prepared the purchase order', reference: 'PO-0188', evidence: 'Quote comparison · Draft PO', timestamp: '22 Jul · 11:26', state: 'complete' },
      { role: 'Supervisor', actor: actors.supervisorChurchHq, action: 'Independently approved the PO within the delegated project limit', reference: 'POA-0188', evidence: 'PO approval record · order released', timestamp: '22 Jul · 12:04', state: 'complete' },
      { role: 'Storekeeper', actor: actors.storekeeper, action: 'Counted and accepted 180 undamaged bags independently', reference: 'GRN-0291', evidence: 'Delivery note · 2 photos', timestamp: '23 Jul · 09:14', state: 'complete' },
      { role: 'Engineer', actor: actors.engineerChurchHq, action: 'Validated specification and intended work location', reference: 'TEC-0137', evidence: 'Material inspection note', timestamp: '23 Jul · 10:03', state: 'complete' },
      { role: 'Finance Officer', actor: actors.finance, action: 'Completed PO–GRN–invoice match and authorised payment', reference: 'FIN-0104', evidence: 'INV-7641 · KRA status · budget check', timestamp: '23 Jul · 14:36', state: 'complete' },
      { role: 'Cashier', actor: actors.cashier, action: 'Executed the locked payment and attached bank confirmation', reference: 'PAY-0418', evidence: 'Bank ref FT26206K1 · receipt', timestamp: '24 Jul · 09:18', state: 'complete' },
      { role: 'Auditor', actor: actors.auditor, action: 'Verified actor separation, references and evidence hashes', reference: 'AUD-0087', evidence: 'Audit sample · hash manifest', timestamp: '25 Jul · 15:22', state: 'complete' },
    ],
  },
  {
    id: 'P2P-0248',
    item: 'Y12 reinforcement steel · 240 lengths',
    project: 'Gilgal 3',
    supplier: 'Apex Steel Ltd',
    amount: 412800,
    status: 'Finance review',
    currentStage: 'Finance evidence review',
    risk: 'Unit price 8.4% above reference',
    ceoActionRequired: false,
    steps: [
      { role: 'Foreman', actor: actors.foremanGilgal, action: 'Raised the structural steel requirement', reference: 'MR-0248', evidence: 'Bar bending schedule · site plan', timestamp: '25 Jul · 09:42', state: 'complete' },
      { role: 'Supervisor', actor: actors.supervisorGilgal, action: 'Confirmed site need and approved within delegated limit', reference: 'APR-0441', evidence: 'Budget availability check', timestamp: '25 Jul · 10:06', state: 'complete' },
      { role: 'Procurement Officer', actor: actors.procurement, action: 'Compared quotes and prepared the purchase order', reference: 'PO-0192', evidence: 'QC-0068 · 3 quotations', timestamp: '25 Jul · 11:34', state: 'complete' },
      { role: 'Supervisor', actor: actors.supervisorGilgal, action: 'Independently approved the PO within the delegated project limit', reference: 'POA-0192', evidence: 'PO approval record · order released', timestamp: '25 Jul · 12:02', state: 'complete' },
      { role: 'Storekeeper', actor: actors.storekeeper, action: 'Received 240 lengths and recorded condition', reference: 'GRN-0296', evidence: 'Supplier note · 3 photos', timestamp: '26 Jul · 08:52', state: 'complete' },
      { role: 'Engineer', actor: actors.engineerGilgal, action: 'Verified grade, diameter and delivery quantity', reference: 'TEC-0141', evidence: 'Steel inspection checklist', timestamp: '26 Jul · 09:28', state: 'complete' },
      { role: 'Finance Officer', actor: actors.finance, action: 'Reviewing price variance, tax status and three-way match', reference: 'FIN-0108', evidence: 'INV-8831 · PO · GRN', timestamp: 'Today · 10:12', state: 'current' },
      { role: 'Cashier', actor: actors.cashier, action: 'Will execute only after Finance authorisation', reference: 'Not created', evidence: 'External payment proof required', timestamp: 'Waiting', state: 'pending' },
      { role: 'Auditor', actor: actors.auditor, action: 'Will receive the closed evidence chain read-only', reference: 'Not sampled', evidence: 'Automated control log', timestamp: 'After payment', state: 'pending' },
    ],
  },
  {
    id: 'P2P-0251',
    item: 'Fabricated roof trusses · Lot 2',
    project: 'Church',
    supplier: 'Mavoko Steel Works',
    amount: 784500,
    status: 'CEO exception',
    currentStage: 'Pre-commitment owner decision',
    risk: 'Above KES 500,000 · price 12.6% over reference',
    ceoActionRequired: true,
    ceoReason: 'The transaction exceeds the KES 500,000 owner threshold and carries an exceptional price variance. No PO may be issued and no delivery may be accepted until the owner decides.',
    steps: [
      { role: 'Foreman', actor: actors.foremanChurchHq, action: 'Raised the roof-stage material request', reference: 'MR-0251', evidence: 'Weekly work plan · quantity schedule', timestamp: '24 Jul · 08:18', state: 'complete' },
      { role: 'Supervisor', actor: actors.supervisorChurchHq, action: 'Approved the site need only and confirmed cost-code availability', reference: 'APR-0446', evidence: 'Church roofing budget check', timestamp: '24 Jul · 09:07', state: 'complete' },
      { role: 'Procurement Officer', actor: actors.procurement, action: 'Captured three bids and prepared a draft PO without issuing it', reference: 'DPO-0197', evidence: 'QC-0072 · supplier due diligence', timestamp: '24 Jul · 14:40', state: 'complete' },
      { role: 'Finance Officer', actor: actors.finance, action: 'Performed pre-commitment budget, compliance and price checks; escalated the threshold exception', reference: 'FIN-0111', evidence: 'Draft PO · quote pack · budget check', timestamp: '25 Jul · 09:08', state: 'complete' },
      { role: 'CEO', actor: 'Josephine Charles', action: 'Decides only this high-value exception before any PO is issued or delivery occurs', reference: 'OWN-0007', evidence: 'Exception brief · Finance recommendation', timestamp: 'Awaiting decision', state: 'current' },
      { role: 'Procurement Officer', actor: actors.procurement, action: 'Will issue the approved PO only after the owner decision', reference: 'Not issued', evidence: 'Draft remains locked', timestamp: 'Pending', state: 'pending' },
      { role: 'Storekeeper', actor: actors.storekeeper, action: 'Will independently count and record any later delivery', reference: 'Not created', evidence: 'GRN and delivery photos required', timestamp: 'After delivery', state: 'pending' },
      { role: 'Engineer', actor: actors.engineerChurchHq, action: 'Will inspect fabrication quality and specification after receipt', reference: 'Not created', evidence: 'Technical inspection required', timestamp: 'After receipt', state: 'pending' },
      { role: 'Finance Officer', actor: actors.finance, action: 'Will complete the final PO–GRN–invoice match and authorise within the owner decision', reference: 'Not created', evidence: 'Final invoice and compliance pack required', timestamp: 'After inspection', state: 'pending' },
      { role: 'Cashier', actor: actors.cashier, action: 'Will execute only a locked, fully authorised payment instruction', reference: 'Not created', evidence: 'External payment proof required', timestamp: 'After authorisation', state: 'pending' },
      { role: 'Auditor', actor: actors.auditor, action: 'Will independently review the complete closed chain', reference: 'Not sampled', evidence: 'Owner exception decision included', timestamp: 'After payment', state: 'pending' },
    ],
  },
]

type WorkflowIconName = 'shield' | 'check' | 'alert' | 'lock' | 'eye' | 'arrow' | 'close' | 'file' | 'wallet' | 'scale' | 'clock' | 'building' | 'receipt' | 'bank'

function WorkflowIcon({ name, size = 18 }: { name: WorkflowIconName; size?: number }) {
  const icons: Record<WorkflowIconName, ReactNode> = {
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/></>,
    wallet: <><path d="M4 5h15a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V5a3 3 0 0 1 3-3h13"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z"/></>,
    scale: <><path d="M12 3v18M5 6h14M5 6l-3 6h6L5 6Zm14 0-3 6h6l-3-6ZM8 21h8"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    building: <><path d="M4 21V5l8-3v19M12 8h8v13M2 21h20"/><path d="M8 7v2m0 3v2m8-2h1m-1 4h1"/></>,
    receipt: <><path d="M5 3v19l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2Z"/><path d="M9 9h6M9 13h6"/></>,
    bank: <><path d="m3 9 9-6 9 6M5 10v8m5-8v8m4-8v8m5-8v8M3 21h18M2 18h20"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

function kes(value: number) {
  return `KES ${new Intl.NumberFormat('en-KE').format(value)}`
}

function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'good' | 'warning' | 'danger' | 'neutral' | 'locked' }) {
  return <span className={`fw-status fw-status-${tone}`}><i />{children}</span>
}

function PageLead({ eyebrow, title, copy, side }: { eyebrow: string; title: string; copy: string; side?: ReactNode }) {
  return <header className="fw-page-lead">
    <div><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></div>
    {side}
  </header>
}

function Guardrail({ compact = false }: { compact?: boolean }) {
  return <section className={`fw-guardrail ${compact ? 'fw-guardrail-compact' : ''}`}>
    <div><WorkflowIcon name="shield" size={19}/></div>
    <p><b>Finance controls evidence and authorisation—not source activity or cash.</b> Purchase sourcing, delivery receipt and source documents stay locked; only the Cashier can execute an authorised payment.</p>
    <span><WorkflowIcon name="lock" size={13}/> Segregation active</span>
  </section>
}

function PanelHead({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="fw-panel-head"><div><h3>{title}</h3><p>{copy}</p></div>{action}</div>
}

function SummaryCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: WorkflowIconName; tone: 'navy' | 'green' | 'orange' | 'red' }) {
  return <article className="fw-summary-card">
    <span className={`fw-summary-icon fw-${tone}`}><WorkflowIcon name={icon}/></span>
    <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
  </article>
}

function TraceButton({ onClick, label = 'Trace chain' }: { onClick: () => void; label?: string }) {
  return <button className="fw-text-button" type="button" onClick={onClick}>{label}<WorkflowIcon name="arrow" size={14}/></button>
}

function ChainRegister({ chains, onTrace, compact = false }: { chains: TransactionChain[]; onTrace: (chain: TransactionChain) => void; compact?: boolean }) {
  return <div className={`fw-chain-register ${compact ? 'fw-chain-register-compact' : ''}`}>
    <div className="fw-chain-row fw-chain-head"><span>CHAIN</span><span>PROJECT / SUPPLIER</span><span>VALUE</span><span>CONTROL POSITION</span><span>OWNER</span><span /></div>
    {chains.map(chain => <div className="fw-chain-row" key={chain.id}>
      <div><b className="fw-mono">{chain.id}</b><small>{chain.item}</small></div>
      <div><b>{chain.project}</b><small>{chain.supplier}</small></div>
      <strong>{kes(chain.amount)}</strong>
      <div><StatusPill tone={chain.status === 'Paid & audited' ? 'good' : chain.status === 'CEO exception' ? 'danger' : 'warning'}>{chain.status}</StatusPill><small>{chain.currentStage}</small></div>
      <span className={`fw-owner-state ${chain.ceoActionRequired ? 'required' : ''}`}>{chain.ceoActionRequired ? 'Decision required' : 'Observer only'}</span>
      <TraceButton onClick={() => onTrace(chain)}/>
    </div>)}
  </div>
}

type DrawerProps = {
  chain: TransactionChain | null
  onClose: () => void
  viewer?: 'CEO' | 'Finance Officer' | 'Auditor'
  onDecision?: (chain: TransactionChain, decision: 'approved' | 'returned') => void
}

export function TransactionChainDrawer({ chain, onClose, viewer = 'Finance Officer', onDecision }: DrawerProps) {
  const [decisionRecord, setDecisionRecord] = useState<{ chainId: string; outcome: 'approved' | 'returned' } | null>(null)

  useEffect(() => {
    if (!chain) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [chain, onClose])

  if (!chain) return null
  const decision = decisionRecord?.chainId === chain.id ? decisionRecord.outcome : null
  const completed = chain.steps.filter(step => step.state === 'complete').length
  const decide = (next: 'approved' | 'returned') => {
    setDecisionRecord({ chainId: chain.id, outcome: next })
    onDecision?.(chain, next)
  }

  if (viewer === 'CEO') {
    const ceoStages: { label: string; role: WorkflowRole }[] = [
      { label: 'Material requested', role: 'Foreman' },
      { label: 'Site approved', role: 'Supervisor' },
      { label: 'Supplier chosen', role: 'Procurement Officer' },
      { label: 'Materials received', role: 'Storekeeper' },
      { label: 'Payment sent', role: 'Cashier' },
    ]
    return <div className="fw-drawer-wrap" role="dialog" aria-modal="true" aria-labelledby="fw-ceo-chain-title">
      <button className="fw-drawer-backdrop" onClick={onClose} aria-label="Close purchase steps" />
      <aside className="fw-drawer fw-ceo-drawer">
        <header className="fw-drawer-head fw-ceo-drawer-head">
          <div><span>PURCHASE STEPS</span><h2 id="fw-ceo-chain-title">{chain.item}</h2><p>{chain.project}</p></div>
          <button type="button" onClick={onClose} aria-label="Close"><WorkflowIcon name="close"/></button>
        </header>
        <div className="fw-drawer-body">
          <section className="fw-ceo-chain-summary">
            <div><span>Amount</span><strong>{kes(chain.amount)}</strong></div>
            <div><span>Supplier</span><strong>{chain.supplier}</strong></div>
            <div><span>Status</span><strong>{chain.status === 'Paid & audited' ? 'Complete' : chain.status === 'Finance review' ? 'Being checked' : 'Needs your decision'}</strong></div>
          </section>

          {chain.ceoActionRequired && !decision && <section className="fw-ceo-decision-note"><WorkflowIcon name="alert" size={20}/><div><strong>Your decision is needed</strong><span>This purchase is above KES 500,000. Finance has completed its checks.</span></div></section>}
          {decision && <section className={`fw-ceo-decision-note ${decision}`}><WorkflowIcon name={decision === 'approved' ? 'check' : 'arrow'} size={20}/><div><strong>{decision === 'approved' ? 'Purchase approved' : 'Purchase returned'}</strong><span>Your decision has been recorded in this demonstration.</span></div></section>}

          <section className="fw-ceo-steps">
            {ceoStages.map((stage, index) => {
              const step = chain.steps.find(item => item.role === stage.role)
              if (!step) return null
              const stateLabel = step.state === 'complete' ? 'Done' : step.state === 'current' ? 'In progress' : step.state === 'blocked' ? 'Stopped' : 'Waiting'
              const tone = step.state === 'complete' ? 'good' : step.state === 'current' ? 'warning' : step.state === 'blocked' ? 'danger' : 'neutral'
              return <article className={`fw-ceo-step fw-ceo-step-${step.state}`} key={`${chain.id}-${stage.role}`}>
                <i>{step.state === 'complete' ? <WorkflowIcon name="check" size={16}/> : index + 1}</i>
                <div><strong>{stage.label}</strong><span>{stage.role} · {step.timestamp}</span></div>
                <StatusPill tone={tone}>{stateLabel}</StatusPill>
              </article>
            })}
          </section>
        </div>
        <footer className="fw-drawer-actions fw-ceo-drawer-actions">
          <button className="fw-button fw-button-secondary" type="button" onClick={onClose}>Close</button>
          {chain.ceoActionRequired && !decision && <>
            <button className="fw-button fw-button-secondary fw-return" type="button" onClick={() => decide('returned')}>Return</button>
            <button className="fw-button fw-button-primary" type="button" onClick={() => decide('approved')}>Approve</button>
          </>}
        </footer>
      </aside>
    </div>
  }

  return <div className="fw-drawer-wrap" role="dialog" aria-modal="true" aria-labelledby="fw-chain-title">
    <button className="fw-drawer-backdrop" onClick={onClose} aria-label="Close transaction chain" />
    <aside className="fw-drawer">
      <header className="fw-drawer-head">
        <div><span>DEMONSTRATION CASE FILE · ACCOUNTABLE TRANSACTION CHAIN</span><h2 id="fw-chain-title">{chain.id}</h2><p>{chain.item} · sample records are not backend-persisted</p></div>
        <button type="button" onClick={onClose} aria-label="Close"><WorkflowIcon name="close"/></button>
      </header>

      <div className="fw-drawer-body">
        <section className="fw-chain-summary">
          <div><span>Project</span><b>{chain.project}</b></div>
          <div><span>Supplier</span><b>{chain.supplier}</b></div>
          <div><span>Transaction value</span><b>{kes(chain.amount)}</b></div>
          <div><span>Evidence progress</span><b>{completed} of {chain.steps.length} stages complete</b></div>
        </section>

        <section className={`fw-owner-oversight ${chain.ceoActionRequired ? 'fw-owner-required' : ''}`}>
          <div><WorkflowIcon name={chain.ceoActionRequired ? 'alert' : 'eye'} size={18}/></div>
          <div>
            <span>CEO OVERSIGHT</span>
            <b>{chain.ceoActionRequired ? 'Exception decision required' : 'Visible without entering the routine chain'}</b>
            <p>{chain.ceoActionRequired ? chain.ceoReason : 'The CEO can inspect every actor, reference and evidence item. Operational responsibility remains with the assigned roles.'}</p>
          </div>
          {chain.ceoActionRequired && <StatusPill tone="locked">Awaiting CEO</StatusPill>}
        </section>

        {decision && <div className={`fw-decision-result ${decision}`}><WorkflowIcon name={decision === 'approved' ? 'check' : 'arrow'} size={17}/><div><b>Exception {decision === 'approved' ? 'approved' : 'returned'}</b><span>This demonstration records the owner outcome locally; Finance remains responsible for the next control step.</span></div></div>}

        <div className="fw-timeline-title"><div><h3>Who did what</h3><p>Source records are shown as evidence, not editable fields.</p></div><StatusPill tone={chain.status === 'Paid & audited' ? 'good' : chain.status === 'CEO exception' ? 'danger' : 'warning'}>{chain.status}</StatusPill></div>

        <section className="fw-chain-timeline">
          {chain.steps.map((step, index) => <article className={`fw-chain-step fw-step-${step.state}`} key={`${chain.id}-${index}-${step.role}-${step.reference}`}>
            <div className="fw-step-marker">{step.state === 'complete' ? <WorkflowIcon name="check" size={14}/> : index + 1}</div>
            <div className="fw-step-copy">
              <div><span>{step.role}</span><time>{step.timestamp}</time></div>
              <h4>{step.actor}</h4>
              <p>{step.action}</p>
              <footer><b className="fw-mono">{step.reference}</b><span><WorkflowIcon name="file" size={13}/>{step.evidence}</span></footer>
            </div>
          </article>)}
        </section>
      </div>

      <footer className="fw-drawer-actions">
        <span><WorkflowIcon name="lock" size={14}/> Evidence remains read-only in this view</span>
        <button className="fw-button fw-button-secondary" type="button" onClick={onClose}>Close</button>
      </footer>
    </aside>
  </div>
}

export function FinanceOfficerDashboard() {
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)
  const financeQueue = transactionChains.filter(chain => chain.status !== 'Paid & audited')

  return <>
    <PageLead eyebrow="FINANCE CONTROL DESK" title="Good morning, James." copy="Match evidence, protect approved budgets and release only controlled payments." side={<span className="fw-demo-stamp">Demonstration records · 26 Jul 2026</span>}/>
    <Guardrail/>
    <section className="fw-summary-grid">
      <SummaryCard label="Invoices to match" value="6" note="2 carry document differences" icon="receipt" tone="navy"/>
      <SummaryCard label="Ready to authorise" value="KES 655,800" note="3 payments inside delegated limits" icon="check" tone="green"/>
      <SummaryCard label="Control exceptions" value="2" note="One needs an owner decision" icon="alert" tone="red"/>
      <SummaryCard label="Reconciliation gap" value="KES 18,450" note="Bank and site cash under review" icon="scale" tone="orange"/>
    </section>

    <section className="fw-dashboard-grid">
      <div className="panel fw-work-queue">
        <PanelHead title="Work requiring Finance" copy="Oldest evidence-complete items first" action={<span className="fw-count">4 open</span>}/>
        {financeQueue.map((chain, index) => <article key={chain.id}>
          <span className={`fw-queue-index ${chain.ceoActionRequired ? 'danger' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
          <div><span>{chain.ceoActionRequired ? 'THRESHOLD EXCEPTION' : 'THREE-WAY MATCH'}</span><h3>{chain.item}</h3><p>{chain.id} · {chain.project} · {chain.supplier}</p><small>{chain.risk}</small></div>
          <strong>{kes(chain.amount)}</strong>
          <TraceButton onClick={() => setSelectedChain(chain)} label={chain.ceoActionRequired ? 'Review escalation' : 'Review evidence'}/>
        </article>)}
        <article>
          <span className="fw-queue-index">03</span>
          <div><span>RECONCILIATION</span><h3>Gilgal 3 petty cash difference</h3><p>REC-0132 · Cashier evidence received</p><small>KES 1,150 cash count difference</small></div>
          <strong>KES 1,150</strong>
          <button className="fw-text-button" type="button">Open difference<WorkflowIcon name="arrow" size={14}/></button>
        </article>
      </div>

      <aside className="panel fw-control-position">
        <PanelHead title="Your control boundary" copy="What this role owns today"/>
        <div className="fw-boundary-list">
          <div className="yes"><WorkflowIcon name="check" size={16}/><span><b>Match independently</b><small>PO, GRN and supplier invoice</small></span></div>
          <div className="yes"><WorkflowIcon name="check" size={16}/><span><b>Validate before authorising</b><small>Budget, tax status and bank details</small></span></div>
          <div className="no"><WorkflowIcon name="lock" size={16}/><span><b>Cannot change source records</b><small>Return discrepancies to their owner</small></span></div>
          <div className="no"><WorkflowIcon name="lock" size={16}/><span><b>Cannot execute payment</b><small>Cashier receives a locked instruction</small></span></div>
        </div>
        <footer><WorkflowIcon name="eye" size={15}/><p><b>CEO is an informed observer.</b> Only FIN-0111 is above the owner threshold.</p></footer>
      </aside>

      <div className="panel fw-recent-chains">
        <PanelHead title="Recent purchase-to-pay chains" copy="One record from need to independent audit" action={<span className="fw-live-dot"><i/> Controls live</span>}/>
        <ChainRegister chains={transactionChains} onTrace={setSelectedChain} compact/>
      </div>
    </section>
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="Finance Officer"/>
  </>
}

const projectControls = [
  { project: 'Gilgal 2', budget: 48.2, paid: 31.4, committed: 5.7, payable: 2.16, exposure: 'Healthy' },
  { project: 'Gilgal 3', budget: 36.5, paid: 28.9, committed: 3.2, payable: 1.42, exposure: 'Watch structural works' },
  { project: 'SNEP HQ', budget: 72.0, paid: 20.6, committed: 9.8, payable: 3.84, exposure: 'Healthy' },
  { project: 'Church', budget: 25.8, paid: 8.3, committed: 2.1, payable: 1.09, exposure: 'Roofing exception' },
]

export function FinanceControl() {
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)
  return <>
    <PageLead eyebrow="FINANCIAL CONTROL" title="Budget, commitments and liabilities" copy="See the full financial position before authorising any movement of cash." side={<button className="fw-button fw-button-secondary" type="button">Export control report</button>}/>
    <Guardrail compact/>
    <section className="fw-control-strip">
      <div><span>Total approved budget</span><strong>KES 182.5M</strong><small>Four active projects</small></div>
      <div><span>Paid to date</span><strong>KES 89.2M</strong><small>48.9% of budget</small></div>
      <div><span>Open commitments</span><strong>KES 20.8M</strong><small>Approved purchase orders</small></div>
      <div><span>Verified payables</span><strong>KES 8.51M</strong><small>Evidence-complete invoices</small></div>
      <div className="available"><span>Uncommitted balance</span><strong>KES 64.0M</strong><small>Before pending requests</small></div>
    </section>

    <section className="fw-finance-layout">
      <div className="panel fw-project-control">
        <PanelHead title="Project control position" copy="Paid plus committed spend against each approved budget"/>
        {projectControls.map(project => {
          const paidPercent = (project.paid / project.budget) * 100
          const committedPercent = (project.committed / project.budget) * 100
          return <article key={project.project}>
            <div><b>{project.project}</b><StatusPill tone={project.exposure === 'Healthy' ? 'good' : 'warning'}>{project.exposure}</StatusPill></div>
            <div className="fw-budget-values"><span><small>Paid</small><b>KES {project.paid.toFixed(1)}M</b></span><span><small>Committed</small><b>KES {project.committed.toFixed(1)}M</b></span><span><small>Verified payable</small><b>KES {project.payable.toFixed(2)}M</b></span><span><small>Budget</small><b>KES {project.budget.toFixed(1)}M</b></span></div>
            <div className="fw-stacked-bar"><i style={{ width: `${paidPercent}%` }}/><b style={{ width: `${committedPercent}%` }}/></div>
          </article>
        })}
        <footer className="fw-legend"><span><i/>Paid</span><span><i/>Committed</span><span><i/>Available</span></footer>
      </div>

      <aside className="panel fw-liability-watch">
        <PanelHead title="Liability watch" copy="What can affect the next payment run"/>
        <div><span className="fw-risk-label high">HIGH</span><section><b>Church roofing package</b><p>KES 784,500 exceeds owner threshold and reference price.</p><TraceButton onClick={() => setSelectedChain(transactionChains[2])}/></section></div>
        <div><span className="fw-risk-label medium">MATCH</span><section><b>Gilgal 3 structural steel</b><p>Documents align; Finance is reviewing the 8.4% unit-price variance.</p><TraceButton onClick={() => setSelectedChain(transactionChains[1])}/></section></div>
        <div><span className="fw-risk-label low">CLOSED</span><section><b>SNEP HQ cement</b><p>Paid and independently sampled with a verified evidence chain.</p><TraceButton onClick={() => setSelectedChain(transactionChains[0])}/></section></div>
      </aside>
    </section>
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="Finance Officer"/>
  </>
}

type MatchCase = {
  id: string
  chainId: string
  supplier: string
  project: string
  item: string
  po: { ref: string; quantity: number; unitPrice: number; total: number }
  grn: { ref: string; quantity: number; condition: string }
  invoice: { ref: string; quantity: number; unitPrice: number; total: number }
  compliance: string
  result: 'matched' | 'exception' | 'mismatch'
  issue: string
}

const matchCases: MatchCase[] = [
  { id: 'MAT-0108', chainId: 'P2P-0248', supplier: 'Apex Steel Ltd', project: 'Gilgal 3', item: 'Y12 steel lengths', po: { ref: 'PO-0192', quantity: 240, unitPrice: 1720, total: 412800 }, grn: { ref: 'GRN-0296', quantity: 240, condition: 'Accepted' }, invoice: { ref: 'INV-8831', quantity: 240, unitPrice: 1720, total: 412800 }, compliance: 'KRA valid · bank account verified', result: 'matched', issue: 'Price is 8.4% above reference; within Finance delegated review.' },
  { id: 'MAT-0112', chainId: 'P2P-0252', supplier: 'Eastern Quarry Ltd', project: 'Gilgal 2', item: 'Machine-cut stones', po: { ref: 'PO-0198', quantity: 1200, unitPrice: 70, total: 84000 }, grn: { ref: 'GRN-0303', quantity: 1160, condition: '40 pieces short' }, invoice: { ref: 'INV-4482', quantity: 1200, unitPrice: 70, total: 84000 }, compliance: 'KRA valid · bank account verified', result: 'mismatch', issue: 'Invoice bills 40 pieces that the Storekeeper did not receive.' },
]

function MatchDocument({ kind, title, reference, rows, tone }: { kind: string; title: string; reference: string; rows: [string, string][]; tone: 'good' | 'warning' | 'danger' }) {
  return <article className={`fw-match-document fw-document-${tone}`}>
    <header><span><WorkflowIcon name="file" size={15}/>{kind}</span><b className="fw-mono">{reference}</b></header>
    <h4>{title}</h4>
    {rows.map(row => <div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}
    <footer><WorkflowIcon name="lock" size={13}/>Source record · read only</footer>
  </article>
}

export function FinanceMatching() {
  const [selectedId, setSelectedId] = useState(matchCases[0].id)
  const [completed, setCompleted] = useState<Record<string, string>>({})
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)
  const selected = matchCases.find(item => item.id === selectedId) ?? matchCases[0]
  const linkedChain = transactionChains.find(chain => chain.id === selected.chainId) ?? null
  const quantitiesMatch = selected.po.quantity === selected.grn.quantity && selected.grn.quantity === selected.invoice.quantity
  const valuesMatch = selected.po.unitPrice === selected.invoice.unitPrice && selected.po.total === selected.invoice.total
  const tone = selected.result === 'matched' ? 'good' : selected.result === 'exception' ? 'warning' : 'danger'
  const outcomeLabel = completed[selected.id]

  const completeReview = () => {
    const message = selected.result === 'matched' ? 'Match completed · ready for authorisation' : selected.result === 'exception' ? 'Exception escalated to CEO' : 'Returned for invoice correction'
    setCompleted(current => ({ ...current, [selected.id]: message }))
  }

  return <>
    <PageLead eyebrow="EVIDENCE CONTROL" title="Three-way matching" copy="Compare what was ordered, independently received and invoiced before payment can be authorised." side={<span className="fw-demo-stamp">2 records in review</span>}/>
    <Guardrail compact/>
    <section className="fw-matching-layout">
      <aside className="panel fw-match-list">
        <PanelHead title="Invoice queue" copy="Exceptions are never silently adjusted"/>
        {matchCases.map(item => <button className={item.id === selected.id ? 'active' : ''} type="button" key={item.id} onClick={() => setSelectedId(item.id)}>
          <span className={`fw-match-result ${item.result}`}><WorkflowIcon name={item.result === 'matched' ? 'check' : 'alert'} size={14}/></span>
          <span><b>{item.supplier}</b><small>{item.invoice.ref} · {item.project}</small></span>
          <strong>{kes(item.invoice.total)}</strong>
          <i>{completed[item.id] ? 'Reviewed' : item.result === 'matched' ? 'Match' : item.result === 'exception' ? 'Escalate' : 'Blocked'}</i>
        </button>)}
      </aside>

      <div className="panel fw-match-review">
        <header className="fw-review-head">
          <div><span>{selected.id} · {selected.project}</span><h3>{selected.item}</h3><p>{selected.supplier} · {selected.compliance}</p></div>
          <StatusPill tone={tone}>{selected.result === 'matched' ? 'Documents match' : selected.result === 'exception' ? 'Threshold exception' : 'Payment blocked'}</StatusPill>
        </header>

        <div className="fw-document-grid">
          <MatchDocument kind="01 · PURCHASE ORDER" title="What Procurement ordered" reference={selected.po.ref} tone="good" rows={[["Quantity", selected.po.quantity.toLocaleString('en-KE')], ["Unit price", kes(selected.po.unitPrice)], ["Order total", kes(selected.po.total)]]}/>
          <MatchDocument kind="02 · GOODS RECEIVED" title="What Storekeeper counted" reference={selected.grn.ref} tone={quantitiesMatch ? 'good' : 'danger'} rows={[["Quantity", selected.grn.quantity.toLocaleString('en-KE')], ["Condition", selected.grn.condition], ["Received by", actors.storekeeper]]}/>
          <MatchDocument kind="03 · SUPPLIER INVOICE" title="What the supplier billed" reference={selected.invoice.ref} tone={selected.result === 'mismatch' ? 'danger' : 'good'} rows={[["Quantity", selected.invoice.quantity.toLocaleString('en-KE')], ["Unit price", kes(selected.invoice.unitPrice)], ["Invoice total", kes(selected.invoice.total)]]}/>
        </div>

        <section className="fw-check-register">
          <div className={quantitiesMatch ? 'pass' : 'fail'}><WorkflowIcon name={quantitiesMatch ? 'check' : 'alert'} size={15}/><span><b>Quantity check</b><small>{quantitiesMatch ? 'PO, GRN and invoice quantities agree' : `${selected.po.quantity - selected.grn.quantity} units ordered but not received`}</small></span><strong>{quantitiesMatch ? 'PASS' : 'FAIL'}</strong></div>
          <div className={valuesMatch ? 'pass' : 'fail'}><WorkflowIcon name={valuesMatch ? 'check' : 'alert'} size={15}/><span><b>Price and amount check</b><small>{valuesMatch ? 'Invoice price and total agree with the approved PO' : 'Invoice value differs from the approved order'}</small></span><strong>{valuesMatch ? 'PASS' : 'FAIL'}</strong></div>
          <div className="pass"><WorkflowIcon name="check" size={15}/><span><b>Supplier compliance</b><small>{selected.compliance}</small></span><strong>PASS</strong></div>
          <div className={selected.result === 'exception' ? 'warn' : 'pass'}><WorkflowIcon name={selected.result === 'exception' ? 'alert' : 'check'} size={15}/><span><b>Delegated authority</b><small>{selected.result === 'exception' ? 'Owner threshold exceeded; Finance cannot clear the exception' : 'Within Finance Officer authorisation threshold'}</small></span><strong>{selected.result === 'exception' ? 'ESCALATE' : 'PASS'}</strong></div>
        </section>

        <div className={`fw-review-exception fw-exception-${tone}`}><WorkflowIcon name={selected.result === 'matched' ? 'eye' : 'alert'} size={17}/><div><b>{selected.result === 'matched' ? 'Review note' : 'Control exception'}</b><p>{selected.issue}</p></div></div>

        {outcomeLabel && <div className="fw-local-outcome"><WorkflowIcon name="check" size={16}/><span><b>{outcomeLabel}</b><small>Recorded in this demonstration session</small></span></div>}

        <footer className="fw-review-actions">
          {linkedChain && <TraceButton onClick={() => setSelectedChain(linkedChain)}/>}
          <span />
          <button className="fw-button fw-button-secondary" type="button">Add review note</button>
          <button className={`fw-button ${selected.result === 'mismatch' ? 'fw-button-secondary fw-return' : 'fw-button-primary'}`} type="button" onClick={completeReview} disabled={Boolean(outcomeLabel)}>{selected.result === 'matched' ? 'Complete match' : selected.result === 'exception' ? 'Escalate to CEO' : 'Return for correction'}</button>
        </footer>
      </div>
    </section>
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="Finance Officer"/>
  </>
}

type ApprovalItem = { chain: TransactionChain; source: string; due: string; state: 'ready' | 'owner' | 'authorised' }

export function FinanceApprovals() {
  const initialItems: ApprovalItem[] = [
    { chain: transactionChains[1], source: 'INV-8831', due: '29 Jul 2026', state: 'ready' },
    { chain: transactionChains[2], source: 'DPO-0197 · pre-commitment', due: 'Not scheduled', state: 'owner' },
    { chain: transactionChains[0], source: 'INV-7641', due: '24 Jul 2026', state: 'authorised' },
  ]
  const [states, setStates] = useState<Record<string, ApprovalItem['state']>>(() => Object.fromEntries(initialItems.map(item => [item.chain.id, item.state])))
  const [confirmation, setConfirmation] = useState<ApprovalItem | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)

  const authorise = () => {
    if (!confirmation || !confirmed) return
    setStates(current => ({ ...current, [confirmation.chain.id]: 'authorised' }))
    setConfirmation(null)
    setConfirmed(false)
  }

  return <>
    <PageLead eyebrow="PAYMENT CONTROL" title="Payment authorisation" copy="Release a locked payment instruction only after matching, budget and compliance checks pass." side={<span className="fw-demo-stamp">Delegated limit · KES 500,000</span>}/>
    <Guardrail compact/>
    <section className="fw-authorisation-strip">
      <div><WorkflowIcon name="receipt"/><span><b>Evidence complete</b><small>PO + GRN + invoice</small></span><strong>3</strong></div>
      <i><WorkflowIcon name="arrow" size={15}/></i>
      <div><WorkflowIcon name="shield"/><span><b>Finance authorises</b><small>Budget + tax + beneficiary</small></span><strong>1 ready</strong></div>
      <i><WorkflowIcon name="arrow" size={15}/></i>
      <div><WorkflowIcon name="bank"/><span><b>Cashier executes</b><small>External reference required</small></span><strong>Separate role</strong></div>
    </section>

    <section className="panel fw-approval-register">
      <PanelHead title="Authorisation register" copy="A Finance approval cannot move money by itself" action={<span className="fw-live-dot"><i/> Control rules applied</span>}/>
      <div className="fw-approval-row fw-approval-head"><span>PAYMENT CASE</span><span>SUPPLIER / PROJECT</span><span>DUE</span><span>AMOUNT</span><span>CONTROL STATE</span><span /></div>
      {initialItems.map(item => {
        const state = states[item.chain.id]
        return <div className="fw-approval-row" key={item.chain.id}>
          <div><b className="fw-mono">{item.chain.id}</b><small>{item.source} · {item.chain.item}</small></div>
          <div><b>{item.chain.supplier}</b><small>{item.chain.project}</small></div>
          <time>{item.due}</time>
          <strong>{kes(item.chain.amount)}</strong>
          <div>{state === 'ready' ? <StatusPill tone="warning">Ready for Finance</StatusPill> : state === 'owner' ? <StatusPill tone="locked">Awaiting CEO</StatusPill> : <StatusPill tone="good">Finance authorised</StatusPill>}<small>{state === 'authorised' ? 'Cashier instruction locked' : state === 'owner' ? 'Finance action unavailable' : 'All routine checks passed'}</small></div>
          <div className="fw-row-actions"><button type="button" onClick={() => setSelectedChain(item.chain)} aria-label={`Trace ${item.chain.id}`}><WorkflowIcon name="eye" size={15}/></button>{state === 'ready' && <button className="fw-authorise-button" type="button" onClick={() => setConfirmation(item)}>Authorise</button>}{state === 'owner' && <button className="fw-escalated-button" type="button" onClick={() => setSelectedChain(item.chain)}>View exception</button>}</div>
        </div>
      })}
    </section>

    <section className="fw-after-authorisation">
      <WorkflowIcon name="lock" size={18}/><div><b>What happens after Finance authorises?</b><p>The amount, beneficiary and source references become a locked instruction in the Cashier queue. Cash moves only when the Cashier records an external bank, M-Pesa or cheque reference. The Auditor then sees both events.</p></div>
    </section>

    {confirmation && <div className="fw-modal-wrap" role="dialog" aria-modal="true" aria-labelledby="fw-authorise-title">
      <button className="fw-modal-backdrop" type="button" onClick={() => setConfirmation(null)} aria-label="Close confirmation"/>
      <section className="fw-confirm-modal">
        <header><div><span>FINANCE AUTHORISATION</span><h3 id="fw-authorise-title">Release a locked instruction</h3><p>{confirmation.chain.id} · {confirmation.chain.supplier}</p></div><button type="button" onClick={() => setConfirmation(null)} aria-label="Close"><WorkflowIcon name="close"/></button></header>
        <div className="fw-confirm-facts"><div><span>Amount</span><strong>{kes(confirmation.chain.amount)}</strong></div><div><span>Source record</span><strong>{confirmation.source}</strong></div><div><span>Project</span><strong>{confirmation.chain.project}</strong></div></div>
        <div className="fw-confirm-checks"><span><WorkflowIcon name="check" size={14}/>Three-way match complete</span><span><WorkflowIcon name="check" size={14}/>Budget and cost code available</span><span><WorkflowIcon name="check" size={14}/>KRA and beneficiary account verified</span></div>
        <label className="fw-confirm-box"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/><span><b>I authorise this payment instruction.</b><small>I understand the Cashier—not Finance—must execute and evidence the payment.</small></span></label>
        <footer><button className="fw-button fw-button-secondary" type="button" onClick={() => setConfirmation(null)}>Cancel</button><button className="fw-button fw-button-primary" type="button" disabled={!confirmed} onClick={authorise}>Authorise instruction</button></footer>
      </section>
    </div>}
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="Finance Officer"/>
  </>
}

type ReconciliationItem = {
  id: string
  account: string
  project: string
  statement: number
  ledger: number
  difference: number
  owner: string
  evidence: string
  linkedChain?: string
}

const reconciliationItems: ReconciliationItem[] = [
  { id: 'REC-0134', account: 'Operating bank · 4481', project: 'All projects', statement: 8264500, ledger: 8264500, difference: 0, owner: 'Eunice Ngumbi', evidence: 'Statement imported · 18 entries', linkedChain: 'P2P-0244' },
  { id: 'REC-0133', account: 'Supplier payments clearing', project: 'SNEP HQ', statement: 684000, ledger: 684000, difference: 0, owner: 'Eunice Ngumbi', evidence: 'Bank ref and receipt linked', linkedChain: 'P2P-0244' },
  { id: 'REC-0132', account: 'Petty cash float', project: 'Gilgal 3', statement: 94850, ledger: 96000, difference: -1150, owner: 'Eunice Ngumbi', evidence: 'Count sheet attached · receipt missing' },
  { id: 'REC-0131', account: 'M-Pesa disbursements', project: 'Church', statement: 120000, ledger: 137300, difference: -17300, owner: 'Eunice Ngumbi', evidence: 'Two references awaiting import' },
]

export function FinanceReconciliation() {
  const [reviewed, setReviewed] = useState<string[]>([])
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null)
  const totalDifference = useMemo(() => reconciliationItems.reduce((sum, item) => sum + Math.abs(item.difference), 0), [])

  return <>
    <PageLead eyebrow="RECONCILIATION" title="Cash and bank control" copy="Compare external evidence to the ledger and assign every difference without rewriting either source." side={<button className="fw-button fw-button-secondary" type="button">Import statement</button>}/>
    <section className="fw-reconciliation-boundary"><WorkflowIcon name="scale" size={18}/><p><b>Cashier prepares payment proof; Finance reconciles; Auditor verifies.</b> A difference can be explained and resolved through a linked correction—it cannot be erased from this screen.</p></section>
    <section className="fw-summary-grid fw-recon-summary">
      <SummaryCard label="Statement balance" value="KES 9.16M" note="Bank, M-Pesa and site floats" icon="bank" tone="navy"/>
      <SummaryCard label="Ledger balance" value="KES 9.14M" note="At 26 Jul, 11:30" icon="file" tone="green"/>
      <SummaryCard label="Open difference" value={kes(totalDifference)} note="Two items require evidence" icon="alert" tone="red"/>
      <SummaryCard label="Matched today" value="18 entries" note="KES 2.84M independently checked" icon="check" tone="green"/>
    </section>

    <section className="panel fw-reconciliation-register">
      <PanelHead title="Reconciliation worksheet" copy="External balance, system ledger and accountable owner shown side by side" action={<span className="fw-demo-stamp">As at 26 Jul · 11:30</span>}/>
      <div className="fw-recon-row fw-recon-head"><span>WORKSHEET</span><span>ACCOUNT / PROJECT</span><span>EXTERNAL</span><span>LEDGER</span><span>DIFFERENCE</span><span>EVIDENCE OWNER</span><span /></div>
      {reconciliationItems.map(item => {
        const isReviewed = reviewed.includes(item.id)
        return <div className="fw-recon-row" key={item.id}>
          <div><b className="fw-mono">{item.id}</b><small>{item.evidence}</small></div>
          <div><b>{item.account}</b><small>{item.project}</small></div>
          <strong>{kes(item.statement)}</strong>
          <strong>{kes(item.ledger)}</strong>
          <span className={item.difference === 0 ? 'fw-zero' : 'fw-difference'}>{item.difference === 0 ? 'KES 0' : `${item.difference < 0 ? '−' : '+'}${kes(Math.abs(item.difference))}`}</span>
          <div><b>{item.owner}</b><small>Cashier · evidence provider</small></div>
          <div className="fw-row-actions">{item.linkedChain && <button type="button" aria-label="Trace linked transaction" onClick={() => setSelectedChain(transactionChains.find(chain => chain.id === item.linkedChain) ?? null)}><WorkflowIcon name="eye" size={15}/></button>}<button className={item.difference === 0 ? 'fw-reviewed-button' : 'fw-investigate-button'} type="button" disabled={isReviewed} onClick={() => setReviewed(current => [...current, item.id])}>{isReviewed ? 'Reviewed' : item.difference === 0 ? 'Confirm match' : 'Assign review'}</button></div>
        </div>
      })}
    </section>

    <section className="fw-recon-notes"><div><WorkflowIcon name="clock" size={17}/><span><b>Month-end readiness</b><small>3 of 4 project cash accounts reconciled</small></span><strong>75%</strong></div><div><WorkflowIcon name="shield" size={17}/><span><b>Unresolved differences</b><small>CEO sees the exposure, not a routine task</small></span><strong>2</strong></div><div><WorkflowIcon name="eye" size={17}/><span><b>Auditor access</b><small>Read-only statements, ledger and notes</small></span><strong>Active</strong></div></section>
    <TransactionChainDrawer chain={selectedChain} onClose={() => setSelectedChain(null)} viewer="Finance Officer"/>
  </>
}
