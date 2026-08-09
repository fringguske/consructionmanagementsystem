# First-four live path map

All paths use the `/api/v1` prefix. Except for login, liveness and readiness, the API requires the HTTP-only authentication cookie. Actor IDs and roles come from the validated cookie; they are never accepted from workflow request bodies.

## End-to-end map

| User-facing path | React client | HTTP/controller | Application/service | PostgreSQL records |
|---|---|---|---|---|
| Sign in and load the correct workspace | `authApi`, `dashboardApi` | `AuthController`, `DashboardController` | `AuthenticationService`, `DashboardService` | `Users`, `Roles`, `UserProjectAssignments` |
| View assigned projects and verified progress | `projectsApi` | `ProjectsController` | `ProjectService` | `Projects`, `ProjectProgressVerifications` |
| View/control budgets by construction activity | `projectsApi` | `ProjectsController` | `ProjectService` | `CostCodes`, `ProjectBudgets`, `ProjectBudgetAllocations`, approved `PurchaseOrderLines` |
| Request materials and independently approve need | `requisitionsApi` | `V1/RequisitionsController` | `RequisitionWorkflowService` | `Requisitions`, `EngineerTechnicalChecks`, `RequisitionApprovalEvents` |
| Collect comparable supplier offers | `sourcingRoundsApi`, `suppliersApi` | `SourcingRoundsController`, `SuppliersController` | `SourcingService`, `SupplierService` | `SourcingRounds`, `SourcingRoundEvents`, `SupplierQuotes`, `Suppliers` |
| Prepare, approve and issue an order | `purchaseOrdersApi` | `PurchaseOrdersController` | `PurchaseOrderService` | `PurchaseOrders`, `PurchaseOrderLines`, `PurchaseOrderEvents` |

## Live React routes

| Browser route | Live view | Roles shown the route |
|---|---|---|
| `/` | Authenticated, role-scoped dashboard | Every signed-in role |
| `/projects` | Projects, budgets/commitments when permitted, Engineer progress | CEO, Supervisor, Engineer, Finance Officer, Auditor |
| `/requisitions` | Material request and technical/approval chain | CEO, Supervisor, Engineer, Foreman, Auditor |
| `/sourcing` | Sourcing rounds, quotes, supplier comparison and draft-PO creation | CEO, Supervisor, Procurement Officer, Auditor |
| `/purchase-orders` | Submit, approve/return/reject, correct, cancel and issue | CEO, Supervisor, Procurement Officer, Storekeeper, Finance Officer, Auditor |
| `/access` | Activate accounts and assign project scope | CEO |

Live navigation comes from the server-authorized effective role. Normally this is
identical to the authenticated database role. A single explicitly configured IT
verification account may temporarily select another role in `live` mode; the
database role is unchanged and every service revalidates the temporary context.

## 1. Authentication, user scope and dashboard

| Method and path | Role | Purpose |
|---|---|---|
| `POST /auth/login` | Anonymous | Validate email/password and issue the session cookie. Rate limited per forwarded client IP. |
| `GET /auth/me` | Any signed-in user | Return actual/effective role metadata and projects in the current workspace scope. |
| `POST /auth/role-context` | Configured IT verifier only | Select a temporary effective workspace role without changing the account's database role. |
| `POST /auth/logout` | Any signed-in user | Remove the session cookie. |
| `GET /dashboard` | Any signed-in user | Return only counts inside the current user's project scope. |
| `GET /users/{userId}/projects` | CEO | List a user's current assignments. |
| `PUT /users/{userId}/projects` | CEO | End removed assignment periods and append newly activated periods. |

The cookie principal is checked against `Users.IsActive`, the actual database
role, and the server-side IT verification configuration on every request.
Deactivation, an actual role change, or disabling verification invalidates an
incompatible cookie immediately. Existing segregation-of-duties checks still use
the real user ID, so the verifier cannot approve their own earlier action.

CEO and Auditor can read every project. Operational users can read and act only where an active `UserProjectAssignments` period exists.

## 2. Projects, cost codes, budgets and progress

| Method and path | Role | Purpose |
|---|---|---|
| `GET /projects` | Signed-in | List project master records inside scope. Financial fields are omitted for roles that do not need them. |
| `GET /projects/{id}` | Signed-in, scoped | Read one project. Out-of-scope IDs return not found. |
| `GET /projects/{id}/summary` | Signed-in, scoped | Current append-only budget revision, cost-code commitments and latest verified physical progress. Financial values are role-shaped. |
| `POST /projects` | CEO | Add a future site without changing the schema. |
| `PUT /projects/{id}` | CEO | Update master data; a budget change appends a new budget revision. |
| `POST /projects/{id}/cost-codes` | CEO | Add a construction activity/cost code. |
| `POST /projects/{id}/budgets` | CEO | Append a complete budget revision and cost-code allocations. |
| `POST /projects/{id}/progress-verifications` | Assigned Engineer | Append independently verified physical progress and evidence reference. |

`ProjectBudgets`, `ProjectBudgetAllocations` and `ProjectProgressVerifications` cannot be updated or deleted. An approved or issued PO becomes an approved commitment against the requisition's `CostCodeId`; a submitted PO is shown separately as pending commitment.

## 3. Material requisition chain

```text
Foreman creates/revises
        ↓
Assigned Engineer verifies need or returns it
        ↓
Different assigned Supervisor approves, rejects or returns it
        ↓
Approved demand becomes visible to Procurement
```

| Method and path | Role | Purpose |
|---|---|---|
| `GET /requisitions` | CEO, Auditor, Foreman, Engineer, Supervisor, Procurement, Storekeeper | Role- and project-shaped queue. Foremen see only their own requests. |
| `GET /requisitions/{id}` | Same readers, scoped | Read the current workflow state. Only CEO/Auditor receive the complete event history. |
| `POST /requisitions` | Assigned Foreman | Request a catalog material against an active project and active cost code. |
| `PATCH /requisitions/{id}` | Original Foreman | Revise before verification or after return. `ExpectedRevision` prevents overwriting a newer action. |
| `POST /requisitions/{id}/technical-check` | Different assigned Engineer | `Verified` or `RevisionRequired`. |
| `POST /requisitions/{id}/decision` | Different assigned Supervisor | `Approve`, `Reject` or `ReturnForRevision`. |

Every accepted command increments `WorkflowRevision` and appends a SHA-256-linked `RequisitionApprovalEvents` row. Database triggers reject update/delete attempts on both technical checks and workflow events.

## 4. Sourcing and purchase orders

### Sourcing

| Method and path | Role | Purpose |
|---|---|---|
| `GET /sourcing-rounds` / `GET /sourcing-rounds/{id}` | Procurement, Supervisor, CEO, Auditor | Read scoped competitive-sourcing evidence. |
| `POST /sourcing-rounds` | Procurement | Open a round for an approved requisition on an active project. |
| `POST /sourcing-rounds/{id}/quotes` | Procurement | Append a supplier quote, its material reference-price snapshot and variance. |
| `POST /sourcing-rounds/{id}/close` | Procurement | Close an unused round with a reason. |
| `POST /sourcing-rounds/{id}/cancel` | Supervisor or CEO | Independently cancel an open round with a reason. |
| `POST /sourcing-rounds/{id}/reopen` | Procurement, Supervisor or CEO according to prior state | Reopen a controlled round when no competing live round/PO exists. |

Quote recording locks the sourcing round, so a quote cannot slip in concurrently after closure or award. Quotes and sourcing events are append-only.

### Purchase orders

| Method and path | Role | Purpose |
|---|---|---|
| `GET /purchase-orders` / `GET /purchase-orders/{id}` | Procurement, Supervisor, Storekeeper, Finance, CEO, Auditor | Read a role-shaped PO queue. Storekeeper does not receive prices or the actor chain. |
| `POST /purchase-orders` | Procurement | Build a draft from the approved requisition and chosen quote; demand and price are server-derived. |
| `POST /purchase-orders/{id}/submit` | Creating Procurement officer | Submit for independent approval. |
| `POST /purchase-orders/{id}/approve` | Different Supervisor or CEO | Approve the commercial commitment; only now is the sourcing round awarded. |
| `POST /purchase-orders/{id}/return-to-draft` | Supervisor or CEO | Return a submitted PO with a required reason. |
| `POST /purchase-orders/{id}/reject` | Supervisor or CEO | Reject a submitted PO with a required reason. |
| `PATCH /purchase-orders/{id}/correction` | Creating Procurement officer | Correct delivery/location/notes while in Draft and record why; a rejected PO is replaced rather than rewritten. |
| `POST /purchase-orders/{id}/issue` | Assigned Procurement officer | Issue only an approved PO while the project remains active. |
| `POST /purchase-orders/{id}/cancel` | Procurement, Supervisor or CEO according to current state | Stop a non-issued PO with a required reason. |

The requester, technical checker, supervisor decision-maker, procurement creator and PO approver are checked as separate responsibilities. Database triggers also reject a PO or line whose project, requisition, material, supplier, selected quote, quantity or price do not describe the same commercial source. Commercial snapshots are stored in append-only lines/events; operational roles receive only the information required for their next step.

## Supporting catalogs and operations

| Method and path | Role | Purpose |
|---|---|---|
| `GET /materials` / `GET /materials/{id}` | Signed-in | Select the shared material catalog. |
| `POST /materials`, `PUT /materials/{id}` | CEO or Procurement | Maintain catalog metadata/reference price. |
| `GET /suppliers` | Procurement, CEO, Auditor | Redacted supplier list without tax/payment/contact details. |
| `GET /suppliers/{id}` | Procurement, CEO, Auditor | Protected supplier detail. |
| `POST /suppliers` | Procurement or CEO | Register a supplier. |
| `PUT /suppliers/{id}` | CEO | Change full supplier metadata; Procurement cannot redirect payment details. |
| `PATCH /suppliers/{id}/blacklist` | CEO | Block/reinstate a supplier independently of sourcing. |
| `GET /health/live` | Anonymous | Process liveness. |
| `GET /health` | Anonymous | Database/migration readiness. |

## Database migration and rollout boundary

The EF migrations create the tables, foreign keys, filtered uniqueness constraints and append-only triggers. Application startup never applies migrations automatically.

After applying migrations:

1. bootstrap a CEO only if the database has no users;
2. assign every operational user to the correct two-site scope;
3. verify/add active cost codes and budget allocations;
4. switch the frontend from `demo` to `live` mode;
5. keep inventory receipt/issue and payment execution disabled until their own controlled paths are implemented.
