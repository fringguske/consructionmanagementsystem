# Production database rollout

These steps apply only the first-four workflow migrations to a PostgreSQL database currently ending at `20260727193905_RenameManagerRoleToSupervisor`.

## 1. Preflight

Confirm the database identity and migration history without displaying its connection string:

```sql
SELECT current_database(), current_user, inet_server_addr(), inet_server_port(),
       current_setting('server_version');

SELECT "MigrationId"
FROM "__EFMigrationsHistory"
ORDER BY "MigrationId" DESC
LIMIT 5;

SELECT "Status", count(*)
FROM "Requisitions"
GROUP BY "Status"
ORDER BY "Status";
```

Review every legacy `Approved` requisition before continuing. The migration deliberately sends legacy `Pending` and `Approved` records back through Engineer and Supervisor review. Already fulfilled records must not be allowed to trigger duplicate procurement.

Confirm that the migration's function names are not already owned by another application:

```sql
SELECT n.nspname, p.proname, pg_get_userbyid(p.proowner)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN (
    'constructionms_reject_evidence_mutation',
    'constructionms_close_assignment_period_only',
    'constructionms_preserve_po_commercial_source',
    'constructionms_validate_po_commercial_source',
    'constructionms_validate_po_line_source'
);
```

The expected result before the migration is zero rows.

## 2. Backup and maintenance window

Stop the old API and every process that writes to the database. The new schema is intentionally incompatible with old requisition writes.

Create and validate a custom-format backup in a restricted directory:

```bash
pg_dump --format=custom --no-owner --no-acl \
  --file=/secure/location/constructionms-before-first-four.dump \
  "$CONSTRUCTIONMS_PG_URI"

pg_restore --list \
  /secure/location/constructionms-before-first-four.dump >/dev/null
```

Retain the backup until the new API and data checks have been accepted. Restore this backup or forward-fix if rollout fails; never migrate `Down`, because `Down` removes new audit and workflow records.

## 3. Generate and apply one atomic script

Build the reviewed release, then generate only the two new migrations without EF-managed transaction statements:

```bash
dotnet build ConstructionMS.slnx --configuration Release --no-restore -m:1

dotnet ef migrations script \
  20260727193905_RenameManagerRoleToSupervisor \
  20260803104510_LinkRequisitionsToCostCodes \
  --project ConstructionMS.Infrastructure/ConstructionMS.Infrastructure.csproj \
  --startup-project ConstructionMS.Api/ConstructionMS.Api.csproj \
  --configuration Release \
  --no-build \
  --no-transactions \
  --output /tmp/constructionms-production.sql
```

Apply both migrations inside one PostgreSQL transaction. A lock timeout or SQL error then rolls back the entire rollout:

```bash
PGOPTIONS='-c lock_timeout=10s -c statement_timeout=15min' \
psql "$CONSTRUCTIONMS_PG_URI" \
  --set=ON_ERROR_STOP=1 \
  --single-transaction \
  --file=/tmp/constructionms-production.sql
```

## 4. Verification

Both migration rows must exist:

```sql
SELECT "MigrationId"
FROM "__EFMigrationsHistory"
WHERE "MigrationId" IN (
    '20260803095108_ImplementFirstFourApiPaths',
    '20260803104510_LinkRequisitionsToCostCodes'
)
ORDER BY "MigrationId";
```

Every requisition must have a valid cost code from the same project, an imported audit-chain event, and no generated sentinel data:

```sql
SELECT r."Id"
FROM "Requisitions" r
LEFT JOIN "CostCodes" c ON c."Id" = r."CostCodeId"
WHERE c."Id" IS NULL OR c."ProjectId" <> r."ProjectId";

SELECT r."Id"
FROM "Requisitions" r
LEFT JOIN "RequisitionApprovalEvents" e
  ON e."RequisitionId" = r."Id" AND e."SequenceNumber" = 1
WHERE e."Id" IS NULL OR length(e."EventHash") <> 64;

SELECT count(*) AS invalid_requisitions
FROM "Requisitions"
WHERE "NeededByDate" = '-infinity'::date
   OR "UpdatedAt" = '-infinity'::timestamptz
   OR btrim("Purpose") = ''
   OR "WorkflowRevision" < 1;
```

The first two queries must return zero rows and `invalid_requisitions` must be zero. Only then deploy/start the new API and verify `GET /api/v1/health` returns HTTP 200.
