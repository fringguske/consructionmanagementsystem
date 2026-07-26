# Construct Control System — frontend

React and TypeScript frontend for the multi-project construction management system.

## Included screens

- Portfolio control-room dashboard
- Project/site portfolio
- Procurement: requisitions, POs, GRNs, and suppliers
- Inventory balances and inter-site transfers
- Budget, payments, and financial activity
- Workforce and subcontractor oversight
- Equipment register
- Audit trail and control exceptions

The current screens use representative demo records so the complete workflow can
be reviewed while the corresponding .NET endpoints are developed. Mutations and
queries should be moved behind a typed API client during backend integration.

## Run locally

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run build
npm run lint
```
