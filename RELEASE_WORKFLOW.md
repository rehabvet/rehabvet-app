# RehabVet Release Workflow (Dev → Prod)

## Branch policy
- `main` = production-ready only
- `dev` = integration/staging branch for all changes
- feature branches (optional) branch from `dev`

## Rules
1. Make all code changes in `dev` (or feature branches merged into `dev`).
2. Run QA smoke checks on `dev`.
3. Batch multiple validated changes.
4. Merge `dev` → `main` only when approved for production release.
5. Tag production release after merge (optional but recommended).

## QA smoke checklist (minimum)
- [ ] Login (admin) works
- [ ] Dashboard loads
- [ ] Staff list loads
- [ ] Clients list loads
- [ ] Patients list loads
- [ ] Appointments list loads for a date range
- [ ] Treatment types load
- [ ] Reports endpoint responds
- [ ] No 5xx errors in server logs during smoke run

## Deploy note
- Railway production should track `main` only.
- `dev` can be used for local validation before promotion.
