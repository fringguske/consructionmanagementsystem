# Production database rollout

Use this procedure for every PostgreSQL production rollout. Migrations are never
applied automatically by the API.

## 1. Preflight

Confirm the database identity, current migration and owner of an established
application table without displaying the connection string:

```sql
SELECT current_database(), current_user, inet_server_addr(), inet_server_port(),
       current_setting('server_version');

SELECT "MigrationId"
FROM "__EFMigrationsHistory"
ORDER BY "MigrationId" DESC
LIMIT 5;

SELECT pg_get_userbyid(relowner) AS established_application_owner
FROM pg_class
WHERE oid = 'public."Users"'::regclass;
```

The role used to apply migrations must be the established application owner.
Using a maintenance superuser creates otherwise valid tables that the API role
cannot read or write. If policy requires a privileged migration role, explicitly
transfer ownership or grant the required table and sequence privileges before the
API starts; never rely on a superuser's default privileges.

Review the pending migration source and generated SQL. Run any migration-specific
business-data gates before continuing.

## 2. Backup and maintenance window

Stop the API and every other process that writes to the database. Create and
validate a custom-format backup in a restricted directory:

```bash
pg_dump --format=custom --no-owner --no-acl \
  --file=/secure/location/constructionms-before-release.dump \
  "$CONSTRUCTIONMS_BACKUP_PG_URI"

pg_restore --list \
  /secure/location/constructionms-before-release.dump >/dev/null
```

Retain the backup until the new API and data checks have been accepted. Restore
the backup or forward-fix if rollout fails; never migrate `Down` when that would
remove audit or workflow records.

## 3. Generate and apply one atomic script

Build the reviewed release, then generate only the pending range without
EF-managed transaction statements. Replace the two placeholders with the exact
IDs confirmed during preflight and code review:

```bash
dotnet build ConstructionMS.slnx --configuration Release --no-restore -m:1

dotnet ef migrations script \
  <CURRENT_PRODUCTION_MIGRATION> \
  <TARGET_RELEASE_MIGRATION> \
  --project ConstructionMS.Infrastructure/ConstructionMS.Infrastructure.csproj \
  --startup-project ConstructionMS.Api/ConstructionMS.Api.csproj \
  --configuration Release \
  --no-build \
  --no-transactions \
  --output /tmp/constructionms-production.sql
```

Apply the script through the established application-owner connection. A lock
timeout or SQL error then rolls back the entire migration range:

```bash
PGOPTIONS='-c lock_timeout=10s -c statement_timeout=15min' \
psql "$CONSTRUCTIONMS_APP_PG_URI" \
  --set=ON_ERROR_STOP=1 \
  --single-transaction \
  --file=/tmp/constructionms-production.sql
```

## 4. Ownership and access verification

Run these checks through `CONSTRUCTIONMS_APP_PG_URI`, not a superuser connection.
The first query must show the expected target migration. The second must return
zero rows.

```sql
SELECT "MigrationId"
FROM "__EFMigrationsHistory"
ORDER BY "MigrationId" DESC
LIMIT 5;

WITH required_table("Name") AS (
    VALUES
        ('ControlEvents'),
        ('GoodsReceipts'),
        ('MaterialIssues'),
        ('MaterialUsageRecords'),
        ('PaymentAuthorizations'),
        ('PaymentReceipts'),
        ('Payments'),
        ('StockBalances'),
        ('StockCounts'),
        ('StockLedgerEntries'),
        ('StockTransfers'),
        ('SupplierInvoices'),
        ('SupplierOnboardingRequests')
)
SELECT "Name" AS inaccessible_table
FROM required_table
WHERE NOT has_table_privilege(
    current_user,
    format('%I.%I', 'public', "Name"),
    'SELECT');
```

Only then start the new API. Verify both health endpoints and exercise at least
one authenticated read for procurement, inventory and finance:

- `GET /api/v1/health/live` returns HTTP 200;
- `GET /api/v1/health` returns HTTP 200;
- procurement supplier/sourcing data loads without a server error;
- inventory receipts load without a server error;
- finance supplier invoices load without a server error.
