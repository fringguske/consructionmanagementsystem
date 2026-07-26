# ConstructionMS

ConstructionMS is a React and ASP.NET Core foundation for tracing construction projects, material movement, procurement and financial approvals across multiple sites.

## Current status

The frontend is a demonstration application. The backend contains the domain model, validated contracts, EF Core persistence and migrations, but the HTTP API is intentionally not connected yet. Controllers are not registered or mapped, and authentication/RBAC is not implemented. Do not expose the API publicly until those controls are complete.

## Repository structure

- `constructionms-frontend` — React/Vite demonstration UI.
- `ConstructionMS.Api` — future HTTP composition layer.
- `ConstructionMS.Application` — DTOs, service contracts and pure application rules.
- `ConstructionMS.Domain` — persistent domain entities.
- `ConstructionMS.Infrastructure` — EF Core context, migrations and service implementations.

## Secure backend configuration

Committed settings deliberately contain no database credentials. For local development, store `ConnectionStrings:DefaultConnection` with .NET user secrets for `ConstructionMS.Api`. In deployment, provide `ConnectionStrings__DefaultConnection` through the platform's secret store and override `AllowedHosts` with the real host allowlist.

Never commit connection strings, `.env` files, certificates, database dumps or deployment credentials. The repository ignore rules cover the common local variants, but secret storage is still the developer's responsibility.

## Reproducible build

The repository pins .NET SDK 10.0.110 and commits NuGet lock files. After a package change, restore normally and review the lock-file diff. In CI or an unchanged checkout, use locked restore:

```bash
dotnet restore ConstructionMS.slnx --locked-mode
dotnet build ConstructionMS.slnx --configuration Release --no-restore
```

Compiler warnings and package vulnerability findings fail the build. `NU1900` (the advisory service being unreachable) remains visible but is non-fatal, so CI should perform the locked restore with network access. Database migrations are versioned but are never applied automatically by application startup.

## Before a live API deployment

- Implement authentication and a fail-closed authorization policy.
- Derive requester, approver and payer identities from authenticated claims, never request bodies.
- Enforce role and project scope for every operation.
- Add immutable audit records for workflow and master-data changes.
- Add explicit production CORS, proxy/forwarded-header, rate-limit and exception-handling policies.
- Confirm that all project, person, supplier and financial demonstration data is synthetic before publishing the repository.
