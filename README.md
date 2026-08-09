# ConstructionMS

ConstructionMS is a React and ASP.NET Core construction-control system for multiple sites. The first live workflow slice now covers authenticated project scope, project progress and budgets, material requisitions, supplier sourcing, and independently approved purchase orders.

The existing React demonstration remains the default. Set the frontend to `live` mode only after the API and database have been configured.

## Repository structure

- `constructionms-frontend` — React/Vite UI with separate `demo` and `live` API modes.
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
- Foreman → Engineer → Supervisor requisition workflow with a hash-chained event history.
- Procurement sourcing rounds, immutable supplier quotes and snapshotted reference prices.
- Draft → submit → independent approval → issue purchase-order workflow, including return, rejection, correction and cancellation paths.
- PostgreSQL triggers that reject updates or deletes to approval/evidence records.

Inventory receipt/issue, invoice matching and payments remain later slices. Do not treat an issued PO as proof that goods were received or paid.

## Secure configuration

Committed settings contain no database credentials. Configure `ConnectionStrings:DefaultConnection` with .NET user secrets locally or `ConnectionStrings__DefaultConnection` in the deployment secret store.

Production must also override:

- `AllowedHosts` with the public hostname;
- `Cors__AllowedOrigins__0` only when the frontend is genuinely cross-origin;
- `ItVerification__Enabled=true` and `ItVerification__TesterUsername=<username>` only
  while the named Administrator account needs live role inspection during development;
- TLS at nginx or the hosting platform, because production authentication cookies are Secure;
- trusted forwarded-proxy addresses if nginx is not running on the same host.

Never commit connection strings, `.env` files, certificates, database dumps or bootstrap credentials. The repository ignore rules cover common variants, including `*.pem` and every `.env` except `.env.example`.

IT verification never accepts a password from configuration and never changes
the account's stored role. Disable it when development verification is complete.

## Database setup

Migrations are versioned but are deliberately not applied during application startup:

```bash
dotnet ef database update \
  --project ConstructionMS.Infrastructure/ConstructionMS.Infrastructure.csproj \
  --startup-project ConstructionMS.Api/ConstructionMS.Api.csproj
```

The workflow migration preserves legacy requisitions as imported evidence. Legacy `Pending` and `Approved` rows are routed through a fresh Engineer/Supervisor review so an old approval cannot bypass the new controls. Existing `Projects.Budget` values become explicitly labelled legacy baseline budget revisions.

Production rollout requires a maintenance window, a verified PostgreSQL backup and an atomic two-migration apply. Follow [docs/production-database-rollout.md](docs/production-database-rollout.md); do not run the old API against the migrated schema or use the destructive `Down` migrations as a rollback strategy.

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

## Frontend modes

`constructionms-frontend/.env.example` documents the two safe settings. Demo mode is the default:

```text
VITE_API_MODE=demo
VITE_API_BASE_URL=/api/v1
```

For the real authenticated paths, use an uncommitted local `.env` with `VITE_API_MODE=live`. All frontend requests send the HTTP-only session cookie and use the typed client in `src/api`.

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
