export type IsoDate = string
export type IsoDateTime = string

export type ConstructionRole =
  | 'CEO'
  | 'Supervisor'
  | 'Engineer'
  | 'Foreman'
  | 'Cashier'
  | 'Storekeeper'
  | 'Procurement Officer'
  | 'Finance Officer'
  | 'Auditor'

export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: string | null
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PageQuery {
  page?: number
  pageSize?: number
}

export interface AssignedProject {
  id: number
  name: string
}

export interface CurrentUser {
  id: number
  fullName: string
  email: string
  role: ConstructionRole
  projects: AssignedProject[]
}

export interface UserAccount {
  id: number
  fullName: string
  email: string
  phoneNumber: string
  isActive: boolean
  createdAt: IsoDateTime
  roleId: number
  roleName: ConstructionRole
}

export interface SetUserActiveRequest {
  isActive: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface UpdateProjectAssignmentsRequest {
  projectIds: number[]
}

export interface DashboardResponse {
  user: CurrentUser
  visibleProjectCount: number
  pendingRequisitionCount: number
  approvedRequisitionCount: number
}

export interface Material {
  id: number
  name: string
  category: string | null
  unit: string
  standardPrice: number
  reorderLevel: number
  createdAt: IsoDateTime
}

export interface MaterialWriteRequest {
  name: string
  category?: string | null
  unit: string
  standardPrice: number
  reorderLevel: number
}

export type CreateMaterialRequest = MaterialWriteRequest
export type UpdateMaterialRequest = MaterialWriteRequest

export interface SupplierSummary {
  id: number
  name: string
  category: string | null
  isBlacklisted: boolean
  createdAt: IsoDateTime
}

export interface Supplier extends SupplierSummary {
  contactPerson: string | null
  phoneNumber: string | null
  email: string | null
  kraPin: string | null
  mpesaNumber: string | null
}

export interface SupplierWriteRequest {
  name: string
  contactPerson?: string | null
  phoneNumber?: string | null
  email?: string | null
  kraPin?: string | null
  mpesaNumber?: string | null
  category?: string | null
}

export type CreateSupplierRequest = SupplierWriteRequest
export type UpdateSupplierRequest = SupplierWriteRequest

export type ProjectStatus = 'Active' | 'On Hold' | 'Completed' | 'Cancelled'

export interface Project {
  id: number
  name: string
  location: string | null
  budget: number | null
  startDate: IsoDate
  endDate: IsoDate | null
  status: ProjectStatus
  createdAt: IsoDateTime
}

export interface ProjectWriteRequest {
  name: string
  location?: string | null
  budget: number
  startDate: IsoDate
  endDate?: IsoDate | null
  status: ProjectStatus
}

export type CreateProjectRequest = ProjectWriteRequest
export type UpdateProjectRequest = ProjectWriteRequest

export interface CostCode {
  id: number
  projectId: number
  code: string
  name: string
  isActive: boolean
  currentAllocation: number | null
  pendingCommitmentAmount: number | null
  approvedCommitmentAmount: number | null
  remainingAfterCommitments: number | null
}

export interface CreateCostCodeRequest {
  code: string
  name: string
}

export interface BudgetAllocation {
  costCodeId: number
  costCode: string
  costCodeName: string
  amount: number
}

export interface ProjectBudget {
  id: number
  projectId: number
  approvedAmount: number
  allocatedAmount: number
  unallocatedAmount: number
  approvedByUserId: number | null
  approvedByUserName: string | null
  approvalSource: string
  notes: string | null
  createdAt: IsoDateTime
  allocations: BudgetAllocation[]
}

export interface SetProjectBudgetRequest {
  approvedAmount: number
  notes?: string | null
  allocations: Array<{
    costCodeId: number
    amount: number
  }>
}

export interface ProjectProgressVerification {
  id: number
  projectId: number
  percentageComplete: number
  workSummary: string
  evidenceReference: string | null
  verifiedByUserId: number
  verifiedByUserName: string
  verifiedAt: IsoDateTime
}

export interface CreateProjectProgressVerificationRequest {
  percentageComplete: number
  workSummary: string
  evidenceReference?: string | null
}

export interface ProjectSummary {
  canViewFinancials: boolean
  project: Project
  currentBudget: ProjectBudget | null
  costCodes: CostCode[]
  latestProgress: ProjectProgressVerification | null
  progressVerificationCount: number
  pendingCommitmentAmount: number | null
  approvedCommitmentAmount: number | null
  remainingAfterCommitments: number | null
}

export type RequisitionStatus =
  | 'AwaitingTechnicalCheck'
  | 'AwaitingSupervisorDecision'
  | 'ReturnedForRevision'
  | 'Approved'
  | 'Rejected'

export type TechnicalCheckOutcome = 'Verified' | 'RevisionRequired'
export type SupervisorDecision = 'Approve' | 'Reject' | 'ReturnForRevision'

export interface TechnicalCheck {
  id: number
  outcome: TechnicalCheckOutcome
  comments: string | null
  engineerUserId: number | null
  engineerName: string | null
  checkedAt: IsoDateTime
  requisitionRevision: number
}

export interface RequisitionWorkflowEvent {
  sequenceNumber: number
  eventType: string
  actorName: string
  actorRole: ConstructionRole
  fromStatus: RequisitionStatus | null
  toStatus: RequisitionStatus
  comments: string | null
  eventDataJson: string
  occurredAt: IsoDateTime
  eventHash: string
}

export interface Requisition {
  id: number
  projectId: number
  projectName: string
  materialId: number
  materialName: string
  materialUnit: string
  costCodeId: number
  costCode: string
  costCodeName: string
  quantity: number
  neededByDate: IsoDate
  purpose: string
  notes: string | null
  status: RequisitionStatus
  workflowRevision: number
  requestedByUserId: number | null
  requestedByUserName: string | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  approvedAt: IsoDateTime | null
  latestTechnicalCheck: TechnicalCheck | null
  decidedByUserId: number | null
  decidedByUserName: string | null
  currentActionMessage: string | null
  history: RequisitionWorkflowEvent[]
}

export interface RequisitionListQuery extends PageQuery {
  status?: RequisitionStatus
  projectId?: number
}

export interface CreateRequisitionRequest {
  projectId: number
  materialId: number
  costCodeId: number
  quantity: number
  neededByDate: IsoDate
  purpose: string
  notes?: string | null
}

export interface UpdateRequisitionRequest {
  costCodeId: number
  quantity: number
  neededByDate: IsoDate
  purpose: string
  notes?: string | null
  expectedRevision: number
}

export interface TechnicalCheckRequest {
  outcome: TechnicalCheckOutcome
  comments?: string | null
  expectedRevision: number
}

export interface SupervisorDecisionRequest {
  decision: SupervisorDecision
  comments?: string | null
  expectedRevision: number
}

export type SourcingRoundStatus = 'Open' | 'Awarded' | 'Closed' | 'Cancelled'

export interface SupplierQuote {
  id: number
  sourcingRoundId: number
  supplierId: number
  supplierName: string
  quoteReference: string
  quantityOffered: number
  unitPrice: number
  standardPriceSnapshot: number
  priceVariancePercentage: number | null
  priceAboveStandard?: boolean | null
  totalPrice: number
  validUntil: IsoDate | null
  recordedByUserId: number
  recordedByUserName: string
  notes: string | null
  recordedAt: IsoDateTime
}

export interface SourcingRoundEvent {
  id: number
  eventType: string
  fromStatus: SourcingRoundStatus | null
  toStatus: SourcingRoundStatus
  actorUserId: number
  actorUserName: string
  actorRole: ConstructionRole
  notes: string | null
  occurredAt: IsoDateTime
}

export interface SourcingRound {
  id: number
  requisitionId: number
  projectId: number
  projectName: string
  materialId: number
  materialName: string
  materialUnit: string
  requestedQuantity: number
  createdByUserId: number
  createdByUserName: string
  status: SourcingRoundStatus
  quoteDueAt: IsoDateTime | null
  notes: string | null
  createdAt: IsoDateTime
  closedAt: IsoDateTime | null
  quotes: SupplierQuote[]
  events: SourcingRoundEvent[]
}

export interface SourcingRoundListQuery extends PageQuery {
  projectId?: number
  status?: SourcingRoundStatus
}

export interface CreateSourcingRoundRequest {
  requisitionId: number
  quoteDueAt?: IsoDateTime | null
  notes?: string | null
}

export interface RecordSupplierQuoteRequest {
  supplierId: number
  quoteReference: string
  quantityOffered: number
  unitPrice: number
  validUntil?: IsoDate | null
  notes?: string | null
}

export interface WorkflowReasonRequest {
  reason: string
}

export interface ReopenSourcingRoundRequest extends WorkflowReasonRequest {
  quoteDueAt?: IsoDateTime | null
}

export type PurchaseOrderStatus =
  | 'Draft'
  | 'Submitted'
  | 'Approved'
  | 'Issued'
  | 'Rejected'
  | 'Cancelled'

export interface PurchaseOrderLine {
  id: number
  requisitionId: number
  materialId: number
  materialName: string
  materialUnit: string
  quantity: number
  unitPrice?: number | null
  lineTotal?: number | null
}

export interface PurchaseOrderEvent {
  id: number
  eventType: string
  fromStatus: PurchaseOrderStatus | null
  toStatus: PurchaseOrderStatus
  actorUserId: number
  actorUserName: string
  actorRole: ConstructionRole
  notes: string | null
  detailsJson?: string | null
  occurredAt: IsoDateTime
}

export interface PurchaseOrder {
  id: number
  purchaseOrderNumber: string
  projectId: number
  projectName: string
  requisitionId: number
  supplierId: number
  supplierName: string
  supplierQuoteId?: number | null
  status: PurchaseOrderStatus
  totalAmount?: number | null
  expectedDeliveryDate: IsoDate | null
  deliveryLocation: string | null
  notes?: string | null
  createdByUserId?: number | null
  createdByUserName?: string | null
  approvedByUserId?: number | null
  approvedByUserName?: string | null
  issuedByUserId?: number | null
  issuedByUserName?: string | null
  rejectedByUserId?: number | null
  rejectedByUserName?: string | null
  cancelledByUserId?: number | null
  cancelledByUserName?: string | null
  createdAt?: IsoDateTime | null
  submittedAt?: IsoDateTime | null
  approvedAt?: IsoDateTime | null
  issuedAt?: IsoDateTime | null
  rejectedAt?: IsoDateTime | null
  cancelledAt?: IsoDateTime | null
  lines: PurchaseOrderLine[]
  events: PurchaseOrderEvent[]
}

export interface PurchaseOrderListQuery extends PageQuery {
  projectId?: number
  status?: PurchaseOrderStatus
}

export interface CreatePurchaseOrderRequest {
  requisitionId: number
  supplierQuoteId: number
  expectedDeliveryDate: IsoDate
  deliveryLocation?: string | null
  notes?: string | null
}

export interface PurchaseOrderActionRequest {
  notes?: string | null
}

export interface CorrectPurchaseOrderRequest {
  expectedDeliveryDate: IsoDate
  deliveryLocation?: string | null
  notes?: string | null
  reason: string
}
