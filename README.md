# ConstructionMS

ConstructionMS is a React and ASP.NET Core construction-control system for multiple sites. The live workflow covers authenticated project scope, project progress and budgets, material requisitions, independently approved supplier onboarding, supplier sourcing, purchase orders, inventory and controlled payments.

The React application is live-only: every displayed record and counter comes from the authenticated API.

## Repository structure

- `constructionms-frontend` — React/Vite UI backed by the live API.
- `ConstructionMS.Api` — authenticated HTTP endpoints, authorization, rate limiting and health checks.
- `ConstructionMS.Application` — request/response contracts and service interfaces.
- `ConstructionMS.Domain` — persistent workflow entities.
- `ConstructionMS.Infrastructure` — EF Core, PostgreSQL mappings, migrations and workflow services.
- `docs/api-map.md` — frontend → API → service → database map for the implemented paths.

## Implemented live paths

- Cookie authentication and current-user project scope.
- CEO-managed user-to-project assignment periods with retained history.
- Role-scoped dashboards and project records.
- CEO project/cost-area setup, append-only budget revisions and Engineer progress verifications.
- Foreman → Engineer → Supervisor site-use requests, plus Storekeeper → Supervisor bulk store-replenishment requests, with hash-chained event history.
- Procurement sourcing rounds, immutable supplier quotes and snapshotted reference prices.
- Procurement supplier applications with independent Finance/CEO approval before a company becomes available for quotations.
- Draft → submit → independent approval → issue purchase-order workflow, including return, rejection, correction and cancellation paths.
- Storekeeper GRNs, delivery-level Engineer technical acceptance where required before stock becomes usable, traceable replacement after rejection, store balances, immutable movement ledger, Foreman issue confirmation/use/wastage, dual-confirmed transfers and independently reviewed stock counts.
- Supplier invoice capture after full receipt, Finance three-way matching only after required delivery checks, Supervisor payment authorization, CEO high-value exceptions, Finance execution and system receipts.
- Supervisor-requested petty cash with Finance approval and handover, immutable Supervisor receipt confirmation, full accountability and Finance reconciliation.
- One CEO/Auditor material-and-money trace backed by hash-linked control events.
- Role-specific task inboxes and persistent in-app overdue notifications.
- Controlled opening inventory/cash positions, material returns and custody close-out.
- Inventory and finance period closing with separately approved corrections.
- Private, authenticated evidence-file upload and download for supported workflow records.
- PostgreSQL triggers that reject updates or deletes to approval/evidence records.

## Secure configuration

Committed settings contain no database credentials. Configure `ConnectionStrings:DefaultConnection` with .NET user secrets locally or `ConnectionStrings__DefaultConnection` in the deployment secret store.

Production must also override:

- `AllowedHosts` with the public hostname;
- `Cors__AllowedOrigins__0` only when the frontend is genuinely cross-origin;
- `ItVerification__Enabled=true` and `ItVerification__TesterUserId=<stable user ID>` are preferred. `ItVerification__TesterUsername=<username>` remains a fallback for initial setup.
- TLS at nginx or the hosting platform, because production authentication cookies are Secure;
- `EvidenceStorage__RootPath` with a private, backed-up directory outside the web root;
- trusted forwarded-proxy addresses if nginx is not running on the same host.

Never commit connection strings, `.env` files, certificates, database dumps or bootstrap credentials. The repository ignore rules cover common variants, including `*.pem` and every `.env` except `.env.example`.

IT verification never accepts a password from configuration and never changes
the account's stored role. While explicitly enabled, the named tester can inspect
all projects in each selected workspace, but actions retain the real Administrator
user ID and same-person duty conflicts remain blocked. Disable it when development
verification is complete.

## Database setup

Migrations are versioned but are deliberately not applied during application startup:

```bash
dotnet ef database update \
  --project ConstructionMS.Infrastructure/ConstructionMS.Infrastructure.csproj \
  --startup-project ConstructionMS.Api/ConstructionMS.Api.csproj
```

The workflow migration preserves legacy requisitions as imported evidence. Legacy `Pending` and `Approved` rows are routed through a fresh Engineer/Supervisor review so an old approval cannot bypass the new controls. Existing `Projects.Budget` values become explicitly labelled legacy baseline budget revisions.

The delivery-acceptance migration preserves PO lines that already have a positive-quantity GRN as legacy stock so deployed balances are not changed retrospectively. Existing PO lines without received stock and all new PO lines take the material's snapshotted technical-acceptance policy.

Production rollout requires a maintenance window, a verified PostgreSQL backup and an atomic pending-migration apply using the established application database role. Follow [docs/production-database-rollout.md](docs/production-database-rollout.md); do not run an incompatible old API against the migrated schema or use destructive `Down` migrations as a rollback strategy.

After approval, the Administrator assigns each operational user to the correct projects. The system intentionally does not infer access from names or give all users every site.

### First Administrator on an empty database

There is no default password. On a brand-new database with an empty `Users` table, provide these values through user secrets or environment variables:

- `Bootstrap__Administrator__Username`
- `Bootstrap__Administrator__FullName`
- `Bootstrap__Administrator__Email`
- `Bootstrap__Administrator__PhoneNumber`
- `Bootstrap__Administrator__Password`

Then run the API once with `--bootstrap-administrator`. The command refuses to run if migrations are pending or any user already exists. Remove all bootstrap secrets immediately after it succeeds.

```bash
dotnet run --project ConstructionMS.Api/ConstructionMS.Api.csproj -- --bootstrap-administrator
```

### Administrator account recovery

A signed-in user can change their own password from the account menu. The change
ends every existing session for that account and creates an append-only security
audit event.

If the Administrator cannot sign in, run the recovery command from an interactive
terminal on the application server. It reads the new password twice without
displaying it. Passwords are deliberately rejected from command-line arguments,
environment variables, and redirected input so they do not enter shell history or
process listings.

```bash
dotnet run --project ConstructionMS.Api/ConstructionMS.Api.csproj -- \
  --reset-administrator-password \
  --administrator-username <username>
```

For a published deployment, run the same two options after the API DLL. The command
requires an up-to-date database, an active Administrator account, and the normal
deployment connection string. It never creates a second Administrator.

## Frontend configuration

`constructionms-frontend/.env.example` documents the live API setting:

```text
VITE_API_MODE=live
VITE_API_BASE_URL=/api/v1
```

All frontend requests send the HTTP-only session cookie and use the typed client in `src/api`.

## Health endpoints

- `GET /api/v1/health/live` — process liveness only.
- `GET /api/v1/health` — readiness; returns 503 when PostgreSQL cannot be reached or migrations are pending.

## Reproducible verification

The repository pins .NET SDK 10.0.110 and commits NuGet lock files. CI or an unchanged checkout should use locked restore:

```bash
dotnet restore ConstructionMS.slnx --locked-mode
dotnet build ConstructionMS.slnx --configuration Release --no-restore -m:1
npm --prefix constructionms-frontend run build
npm --prefix constructionms-frontend run lint
```

Compiler warnings and package vulnerability findings fail the .NET build. `NU1900` remains visible but non-fatal when the advisory service is unreachable, so CI should restore with network access.

## Deliberate boundary before finance goes live

Supplier payment destinations are not yet part of an approved payable. Before activating invoice/payment APIs, add effective-dated supplier payment-detail changes with independent verification, three-way PO/GRN/invoice matching, and a payee snapshot on the approved payable. Procurement cannot be allowed to redirect a payment by editing current supplier details.
