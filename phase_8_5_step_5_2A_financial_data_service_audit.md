# Phase 8.5 Step 5.2A — FinancialDataService Implementation Audit

## 1. Executive Summary
The `FinancialDataService` implementation was audited against the approved Step 5.2 design contract. While it correctly implements the normalized-first/legacy-fallthrough dual-read pattern without mutating any data, there are several strict contract deviations that MUST be fixed before proceeding to the code refactoring phase (Step 5.2B). The most critical issues are a feature-flag bypass in `getFinancialProfile` and a mismatch between the Goal/Loan model query parameters and the service implementation.

## 2. Actual Model Contract Verification
The models in `FinancialEntities.js` and `PlanningEntities.js` were inspected.
- **Income/Expense/Investment:** Service correctly calls `findByUserId(userId, { activeOnly: true })`.
- **Loan:** Service calls `Loan.findByUserId(userId, { status: "active" })`. The model supports this.
- **Goal:** Service calls `Goal.findByUserId(userId, { status: "active" })`. **MISMATCH:** The approved design required filtering by `status IN ('planning', 'active', 'on_track')`. However, the current `Goal` model only accepts a single equality check for `status` (`status = $2`). The implementation falls back to `"active"`, which entirely omits `"planning"` goals.
- **Alert:** Service calls `Alert.findByUserId(userId)`. The model defaults to filtering `is_dismissed = FALSE`.

## 3. Actual Legacy Data Shape
The `users` table JSONB/flat columns are exposed via `User.findById(userId)`. 
The `formatUser()` method returns:
- `user.income.monthly`
- `user.income.source`
- `user.income.additionalMonthly`
- `user.expenses` (Array)
- `user.investments` (Array)
- `user.loans` (Array)
- `user.goals` (Array)
The derivation logic accurately reflects this mapped shape, rather than the raw snake_case DB columns (`income_monthly`, etc.).

## 4. Legacy Derivation Audit
| Function | Correct | Issue | Severity | Evidence |
|----------|---------|-------|----------|----------|
| `deriveLegacyIncome` | Yes | None | NONE | Correctly maps `income.monthly` and `income.additionalMonthly` to normalized array structure. |
| `deriveLegacyExpenses` | Yes | None | NONE | Correctly falls back and sanitizes numeric strings. |
| `deriveLegacyInvestments` | Yes | API Mismatch | MEDIUM | Renames `type` to `investmentType`. Breaks `userController.js` dashboard which relies on `inv.type`. |
| `deriveLegacyLoans` | Yes | API Mismatch | MEDIUM | Renames `type` to `loanType`. |
| `deriveLegacyGoals` | Yes | API Mismatch | MEDIUM | Renames `currentSavings` to `currentAmount`. Breaks `userController.js` which relies on `g.currentSavings`. |

*Date Safety:* Missing target, purchase, and start dates fall back to `null` instead of being fabricated.
*Malformed Data:* Caught inside a `try/catch` and returns `[]`. Does not swallow DB connection errors.

## 5. Feature Flag Audit
- **getIncome, getExpenses, getInvestments, getLoans, getGoals:** Correctly check `if (useNormalizedReads())` before querying normalized tables.
- **getSips, getAssets, getRetirementPlans, getFinancialHealth, getAlerts:** Correctly ignore the flag (as they have no legacy equivalent and solely depend on normalized data).
- **getFinancialProfile:** **VIOLATION.** The implementation unconditionally queries `FinancialProfile.findByUserId(userId)` without checking the `useNormalizedReads()` feature flag.

## 6. Financial Profile Audit
**ISSUE (HIGH):** The service violates the feature flag contract by always querying `FinancialProfile.findByUserId(userId)` before falling back to legacy derivation. If the migration backfills profiles while `USE_NORMALIZED_READS` is false, the application will abruptly switch to normalized profiles before the gate is opened.

## 7. Goal Status Audit
**ISSUE (HIGH):** Valid statuses in DB: `'planning', 'active', 'achieved', 'abandoned'`.
The approved design mandated returning `'planning', 'active', 'on_track'`. (Note: `on_track` is not in the DB enum).
The current service queries `{ status: "active" }`. This silently drops all goals in the `'planning'` phase from normalized reads.

## 8. Loan Status Audit
Valid statuses in DB: `'active', 'paid_off', 'foreclosed'`.
The service filters by `{ status: "active" }`. This is acceptable for active financial snapshots and aligns with existing intelligence behavior which only accounts for active liabilities.

## 9. Partial Normalized Data Analysis
The `normalized.length > 0` check guarantees that if a partial migration occurs (e.g., 2 out of 3 loans successfully migrate), the legacy fallback is completely bypassed, and the service returns only the 2 migrated loans. This is documented and accepted per the Step 5.2 approved design ("if normalized entity set has records: normalized wins"). It emphasizes the need for full atomic transactional batching during the actual migration.

## 10. Native Record Protection
The service queries the base normalized tables directly without filtering by migration metadata or `migration_mappings`. Native records will be safely included, and no destruction of native records can occur through this read abstraction.

## 11. Date Safety
The service correctly passes `null` dates from legacy JSON through to the caller. However, `financialIntelligence.js` (`calculateGoalProgress`) still contains the unpatched logic:
```javascript
const target = new Date(goal.targetDate); // Creates 1970-01-01 on null
```
This will result in invalid epoch-based math if not explicitly patched during the refactor phase.

## 12. Error Handling
Database errors generated by `User.findById(userId)` or normalized model queries properly propagate (throw) up to the caller. They are not silently caught and converted to `[]`. Only structurally malformed JSONB data inside a successful user row triggers the safe `[]` fallback.

## 13. Authorization Boundary
The service correctly isolates identity: it accepts an explicit `userId` parameter and performs no direct inspection of `req.user`, JWTs, or advisor headers.

## 14. API Contract Compatibility
**ISSUE (HIGH):** The canonical shapes returned by the service rename several fields from legacy conventions, which will break existing frontend callers and the `userController.js` dashboard unless mitigated during the refactoring step:
- `investment.type` -> `investment.investmentType`
- `loan.type` -> `loan.loanType`
- `goal.currentSavings` -> `goal.currentAmount`

## 15. Performance Audit
`getFinancialSnapshot` effectively utilizes `Promise.all` across 8 concurrent model queries. A failure in any one query correctly rejects the entire snapshot. There is a minor N+1 inefficiency during legacy fallback (each `get*` method calls `User.findById`), but since snapshot resolves them concurrently, DB caching mitigates the severity.

## 16. Security Regression Check
No modifications were made to `auth.js`, JWTs, cookies, RBAC, or advisor client controllers.

## 17. Test Gap Analysis
Existing tests lack explicit coverage for:
- Normalized vs Legacy fallback feature flag toggling.
- Malformed legacy JSON handling.
- Mixed native/migrated records.
- Null target date preservation and edge cases.
- FinancialDataService isolation tests.

## 18. Recommended Minimal Fixes (Before Refactoring Callers)
1. Wrap `FinancialProfile.findByUserId` in `useNormalizedReads()` inside `getFinancialProfile`.
2. Update the `Goal` model to support `status IN (...)` or explicitly fetch both `planning` and `active` goals in `getGoals`.
3. Provide legacy alias properties (e.g., `type: l.loanType`) in the canonical objects to prevent breaking `userController.js` and the frontend.

## 19. Final Gates
- MODEL CONTRACTS: HOLD
- LEGACY DATA SHAPE: GO
- DERIVATION LOGIC: HOLD (API mismatches)
- FEATURE FLAG: HOLD (Profile violation)
- FINANCIAL PROFILE: HOLD
- GOAL STATUS: HOLD
- LOAN STATUS: GO
- PARTIAL DATA SAFETY: GO (Accepted as design)
- NATIVE RECORD SAFETY: GO
- DATE SAFETY: HOLD (calculateGoalProgress patch pending)
- ERROR HANDLING: GO
- AUTHORIZATION BOUNDARY: GO
- API COMPATIBILITY: HOLD
- PERFORMANCE: GO
- SECURITY REGRESSION: GO
- TEST COVERAGE: HOLD

**OVERALL: HOLD**
