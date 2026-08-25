# Construct Control System — frontend

React and TypeScript frontend for the multi-project construction management system.

## Included screens

- Role-specific task inbox and overdue notifications
- Project/site portfolio
- Requisitions, supplier sourcing, purchase orders, GRNs and supplier invoices
- Inventory, movement, custody return and close-out
- Opening positions, period closing and controlled corrections
- Payments, petty cash and cash-book reporting
- Private evidence files and complete audit history

The frontend is live-only. Screens, counters and task totals are loaded from the authenticated API; no demonstration records are bundled into the application.

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
