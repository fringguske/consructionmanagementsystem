# Live application path map

All paths use the `/api/v1` prefix. Except for login, liveness and readiness, the API requires the HTTP-only authentication cookie. Actor IDs and roles come from the validated cookie; they are never accepted from workflow request bodies.

## End-to-end map

| User-facing path | React client | HTTP/controller | Application/service | PostgreSQL records |
|---|---|---|---|---|
| Sign in and load the correct workspace | `authApi`, `dashboardApi` | `AuthController`, `DashboardController` | `AuthenticationService`, `DashboardService` | `Users`, `Roles`, `UserProjectAssignments` |
| View assigned projects and verified progress | `projectsApi` | `ProjectsController` | `ProjectService` | `Projects`, `ProjectProgressVerifications` |
| View/control budgets by construction activity | `projectsApi` | `ProjectsController` | `ProjectService` | `CostCodes`, `ProjectBudgets`, `ProjectBudgetAllocations`, approved `PurchaseOrderLines` |
| Request materials and independently approve need | `requisitionsApi` | `V1/RequisitionsController` | `RequisitionWorkflowService` | `Requisitions`, `EngineerTechnicalChecks`, `RequisitionApprovalEvents` |
| Submit and independently approve supplier companies | `supplierOnboardingApi`, `suppliersApi` | `SupplierOnboardingController`, `SuppliersController` | `SupplierOnboardingService`, `SupplierService` | `SupplierOnboardingRequests`, `Suppliers` |
| Collect comparable supplier offers | `sourcingRoundsApi`, `suppliersApi` | `SourcingRoundsController`, `SuppliersController` | `SourcingService`, `SupplierService` | `SourcingRounds`, `SourcingRoundEvents`, `SupplierQuotes`, `Suppliers` |
| Prepare, approve and issue an order | `purchaseOrdersApi` | `PurchaseOrdersController` | `PurchaseOrderService` | `PurchaseOrders`, `PurchaseOrderLines`, `PurchaseOrderEvents` |
| Receive, store, issue, transfer and account for material | `inventoryApi` | `InventoryController` | `InventoryWorkflowService` | `GoodsReceipts`, `StockBalances`, `StockLedgerEntries`, `MaterialIssues`, `MaterialUsageRecords`, `StockTransfers`, `StockCounts` |
| Match invoices, authorize and execute payments | `financeApi` | `FinanceController` | `FinanceWorkflowService` | `SupplierInvoices`, `PaymentAuthorizations`, `Payments`, `PaymentReceipts` |
| Trace the complete material-and-money chain | `financeApi.controlEvents` | `FinanceController` | `FinanceWorkflowService`, `ControlEventWriter` | Existing workflow event tables plus hash-linked `ControlEvents` |

## Live React routes

| Browser route | Live view | Roles shown the route |
|---|---|---|
| `/` | Authenticated, role-scoped dashboard | Every signed-in role |
| `/projects` | Projects, budgets/commitments when permitted, Engineer progress | CEO, Supervisor, Engineer, Finance Officer, Auditor |
| `/requisitions` | Material request and technical/approval chain | CEO, Supervisor, Engineer, Foreman, Auditor |
| `/sourcing` | Sourcing rounds, quotes, supplier comparison and draft-PO creation | CEO, Supervisor, Procurement Officer, Auditor |
| `/suppliers` | Supplier application, independent approval and approved register | CEO, Procurement Officer, Finance Officer, Auditor |
| `/purchase-orders` | Submit, approve/return/reject, correct, cancel and issue | CEO, Supervisor, Procurement Officer, Storekeeper, Finance Officer, Auditor |
| `/inventory` | GRNs, store balances, issues, Foreman custody, transfers and stock counts | CEO, Supervisor, Engineer, Foreman, Storekeeper, Finance Officer, Auditor |
| `/finance` | Supplier invoices, three-way match, authorization, separate Finance execution and receipts | CEO, Procurement Officer, Finance Officer, Auditor |
| `/audit` | One chronological evidence chain across materials and cash | CEO, Auditor |
| `/access` | Review join requests, manage accounts and assign project scope | Administrator |

Live navigation comes from the server-authorized effective role. Normally this is
identical to the authenticated database role. A single explicitly configured IT
verification account may temporarily select another role in `live` mode; the
database role is unchanged and every service revalidates the temporary context.
That tester receives portfolio scope only while verification mode is explicitly
enabled, so each workspace can actually be inspected without fake project
assignments. Commands remain attributed to the real Administrator user ID, and
same-user segregation checks still stop the tester from performing conflicting
steps on the same requisition, order, transfer or payment.

## 1. Authentication, user scope and dashboard

| Method and path | Role | Purpose |
|---|---|---|
| `POST /auth/register` | Anonymous | Reserve a unique username and create a pending access request. Email addresses may be shared. |
| `POST /auth/login` | Anonymous | Validate the unique username and password and issue the session cookie. Rate limited per forwarded client IP. |
| `GET /auth/me` | Any signed-in user | Return actual/effective role metadata and projects in the current workspace scope. |
| `POST /auth/role-context` | Configured IT verifier only | Select a temporary effective workspace role without changing the account's database role. |
| `POST /auth/change-username` | Any signed-in user | Confirm the current password, reserve a new unique username, revoke existing sessions and append a security audit event. |
| `POST /auth/change-password` | Any signed-in user | Confirm the current password, replace its hash, revoke existing sessions and append a security audit event. |
| `POST /auth/logout` | Any signed-in user | Remove the session cookie. |
| `GET /dashboard` | Any signed-in user | Return only counts inside the current user's project scope. |
| `GET /access-requests` | Administrator | List pending or reviewed join requests. |
| `POST /access-requests/{id}/approve` | Administrator | Create the account with a selected role and project scope. |
| `POST /access-requests/{id}/reject` | Administrator | Reject a request without creating a login. |
| `GET /users/{userId}/projects` | Administrator | List a user's current assignments. |
| `PUT /users/{userId}/projects` | Administrator | End removed assignment periods and append newly activated periods. |

The cookie principal is checked against `Users.IsActive`, the actual database
role, and the server-side IT verification configuration on every request.
Deactivation, an actual role change, or disabling verification invalidates an
incompatible cookie immediately. Existing segregation-of-duties checks still use
the real user ID, so the verifier cannot approve their own earlier action.

Administrator, CEO and Auditor can list every project; only CEO and approved financial roles receive financial fields. Operational users can read and act only where an active `UserProjectAssignments` period exists.

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
| `POST /requisitions/stock-replenishment` | Assigned Storekeeper | Request reserve stock for a project store. This goes to the Supervisor, then Procurement, and cannot be used as a Foreman issue voucher. |
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
| `POST /purchase-orders/{id}/issue` | Assigned Procurement officer | Issue only an approved PO while the project remains active. A Procurement handoff within the same assigned project is allowed and recorded. |
| `POST /purchase-orders/{id}/cancel` | Procurement, Supervisor or CEO according to current state | Stop a non-issued PO with a required reason. |

For site-use requests, the requester, technical checker, supervisor decision-maker, procurement creator and PO approver are checked as separate responsibilities. A bulk store-replenishment request is raised by Stores and independently approved by the Supervisor before Procurement sourcing; it skips the Engineer because it is an inventory-level decision rather than a technical site-use need. Database triggers also reject a PO or line whose project, requisition, material, supplier, selected quote, quantity or price do not describe the same commercial source. Commercial snapshots are stored in append-only lines/events; operational roles receive only the information required for their next step.

## 5. Inventory and material custody

```text
Issued PO → Storekeeper GRN → project store balance
Approved site-use requisition → Storekeeper issue voucher → Foreman confirmation → use/wastage
Approved store-replenishment request → Procurement sourcing → PO → Storekeeper GRN → reserve stock
Supervisor transfer request → sending Storekeeper dispatch → different receiving Storekeeper receipt
Storekeeper physical count → Supervisor review → ledger adjustment when approved
```

| Method and path | Role | Purpose |
|---|---|---|
| `GET /inventory/receipts` | Storekeeper, Procurement, Finance, CEO, Auditor | Read independent delivery evidence inside scope. Procurement uses it only to identify orders eligible for invoice capture. |
| `POST /inventory/receipts` | Assigned Storekeeper | Record delivered, accepted and rejected quantity against an issued PO. Only accepted quantity enters stock; rejected goods may be replaced later. |
| `GET /inventory/balances` | Storekeeper, Foreman, Supervisor, Engineer, Finance, CEO, Auditor | Read each catalog material currently inside each visible project store. |
| `GET /inventory/ledger` | Storekeeper, Supervisor, Finance, CEO, Auditor | Read the append-only movement ledger and balance after every movement. |
| `GET /inventory/issues` | Storekeeper, Foreman, Supervisor, Engineer, CEO, Auditor | Read role-shaped issue vouchers. A Foreman sees only material handed to that account. |
| `POST /inventory/issues` | Assigned Storekeeper | Release stock only against one approved Foreman requisition. |
| `POST /inventory/issues/{id}/confirm` | Named Foreman | Confirm the physical handover or record a quantity dispute. |
| `POST /inventory/issues/{id}/usage` | Named Foreman | Append used or wasted quantity without exceeding the confirmed custody amount. |
| `GET`, `POST /inventory/transfers` | Supervisor, Stores, CEO, Auditor as appropriate | Read transfers or let a Supervisor request a movement between two assigned sites. |
| `POST /inventory/transfers/{id}/dispatch` | Sending-site Storekeeper | Remove dispatched quantity from the source store. |
| `POST /inventory/transfers/{id}/receive` | Different destination-site Storekeeper | Confirm destination quantity and add it to destination stock; differences are disputed. |
| `GET`, `POST /inventory/counts` | Storekeeper, Supervisor, CEO, Auditor as appropriate | Read physical counts or let Stores submit a stock snapshot. |
| `POST /inventory/counts/{id}/review` | Different assigned Supervisor | Approve/reject a count. Approval fails safely if stock moved after counting. |

Materials come from one categorized catalog. The Foreman selects the material and types only the numeric amount; its unit (`bags`, `tonnes`, `pieces`, `lengths`, `litres`, and so on) is locked from the selected catalog record so approval, PO, GRN, store balance and usage cannot silently change units.

## 6. Invoice-to-payment control and owner trace

```text
Accepted GRN → Procurement invoice capture → Finance three-way match
             → CEO only for high-value exception → Finance authorization
             → second Finance Officer executes → system receipt
```

| Method and path | Role | Purpose |
|---|---|---|
| `GET /finance/invoices` | Procurement, Finance, CEO, Auditor | Read the scoped invoice queue without granting action rights. |
| `POST /finance/invoices` | Assigned Procurement officer | Capture an immutable supplier invoice only after Stores has accepted the full PO quantity. This starter release does not silently treat one invoice as a partial-invoice schedule. |
| `POST /finance/invoices/{id}/review` | Different Finance officer | Compare invoice quantity, unit price and amount exactly with accepted GRNs and the issued PO. |
| `POST /finance/invoices/{id}/ceo-decision` | CEO | Decide only invoices above the configured high-value threshold; routine payments never require CEO operation. |
| `POST /finance/invoices/{id}/authorize` | Reviewing Finance officer | Create one append-only authority for the locked, matched amount. |
| `GET /finance/authorizations` | Finance, CEO, Auditor | Read payment instructions; `unpaidOnly=true` is the Finance execution queue. |
| `POST /finance/authorizations/{id}/pay` | Finance | Execute exactly the amount authorized by another Finance Officer, with a unique external bank/M-Pesa/cheque/cash reference. |
| `GET /finance/payments` | Finance, CEO, Auditor | Read immutable payments and system receipt numbers. |
| `GET /finance/control-events` | CEO, Auditor | Read the full chronological chain for a project or requisition across request, sourcing, PO, stock and payment. |

### Petty cash

```text
Supervisor request → Finance approval → second Finance Officer handover
                   → requesting Supervisor receipts/return → Finance reconciliation
```

Petty cash is restricted to KES 100,000 per request and an active project cost code.
The CEO observes the full chain but does not approve routine requests. The requesting
Supervisor cannot approve or disburse. The Finance Officer who approves cannot disburse
the same request, and the Finance Officer who disburses cannot approve its later reconciliation.

| Method and path | Role | Purpose |
|---|---|---|
| `GET /finance/petty-cash` | Supervisor, Finance, CEO, Auditor | Read role- and project-scoped requests, handovers and reconciliations. |
| `POST /finance/petty-cash` | Supervisor | Request a capped amount for one specific purpose and budget area. |
| `POST /finance/petty-cash/{id}/decision` | Finance | Independently approve a locked amount or reject with notes. |
| `POST /finance/petty-cash/{id}/disburse` | Finance | A Finance Officer other than the approver records the exact handover, external reference, recipient acknowledgement and proof. |
| `POST /finance/petty-cash/{id}/reconciliation` | Requesting Supervisor | Account for the full amount with receipt evidence and any cash-return reference. |
| `POST /finance/petty-cash/{id}/reconciliation-decision` | Finance | Close the evidence or return it for correction. |

New operational evidence is protected twice: application guards reject deletion/source-field rewrites, and PostgreSQL triggers independently reject the same mutations. `ControlEvents` are append-only and SHA-256 linked within each requisition chain.

## Supporting catalogs and operations

| Method and path | Role | Purpose |
|---|---|---|
| `GET /materials` / `GET /materials/{id}` | Signed-in | Select the shared material catalog. |
| `POST /materials`, `PUT /materials/{id}` | CEO or Procurement | Maintain catalog metadata/reference price. |
| `GET /supplier-onboarding` | Procurement, Finance, CEO, Auditor | Read pending and completed supplier applications. |
| `POST /supplier-onboarding` | Procurement | Submit locked company, contact, KRA and payment-contact details for review. |
| `POST /supplier-onboarding/{id}/decision` | Finance or CEO | Independently approve/reject once. Approval atomically creates the usable supplier record. |
| `GET /suppliers` | Procurement, Finance, CEO, Auditor | Redacted approved supplier list without tax/payment/contact details. |
| `GET /suppliers/{id}` | Procurement, Finance, CEO, Auditor | Protected approved-supplier detail. |
| `PUT /suppliers/{id}` | CEO | Change full supplier metadata; Procurement cannot redirect payment details. |
| `PATCH /suppliers/{id}/blacklist` | CEO | Block/reinstate a supplier independently of sourcing. |
| `GET /health/live` | Anonymous | Process liveness. |
| `GET /health` | Anonymous | Database/migration readiness. |

Supplier proposals never enter the quote dropdown directly. Proposal fields are immutable,
the submitter cannot review their own request, and a database trigger prevents deletion,
source-field rewrites or changing a completed decision. A rejected company must be submitted
as a new request; the previous decision remains visible.

## Database migration and rollout boundary

The EF migrations create the tables, foreign keys, filtered uniqueness constraints and append-only triggers. Application startup never applies migrations automatically.

After applying migrations:

1. bootstrap a CEO only if the database has no users;
2. assign every operational user to the correct two-site scope;
3. verify/add active cost codes and budget allocations;
4. switch the frontend from `demo` to `live` mode;
5. verify every role with a separate test identity before accepting real material or payment records;
6. enable the live inventory and finance routes only after the migration, role assignments and smoke test all succeed.
