# SmartFinance recovery plan

Deployment is on hold. The starting revision is c006ef3. A binary Git diff, status inventory and original audit are preserved outside the repository in ../smartfinance-recovery-c006ef3/. The diff SHA-256 is F79708B2B69E9A8FDAC844A8EE0C69A4BFC5EE9DF692B490DC048398329B1AC4. Treat this checkpoint as private.

1. Restore missing source from the merged revision without changing existing files. Reinstall lockfile dependencies into an isolated location and build. Compare earlier merge backups before considering any alternate revision.
2. Contain credential, dump and image exposure. Preserve legitimate data privately. Implement fail-closed startup, complete ordered migrations and separate readiness from liveness. Verify with disposable Postgres, image configuration checks and, where available, running containers.
3. Trace registration, OTP, OAuth, profile and financial writes. Apply field allowlists, bounds, consistent normalization and role checks. Check production mail and logging behavior. Exercise boundary and failure cases.
4. Integrate advisor and client consultation, messaging and recommendation workflows using authenticated relationships. Test consent, isolation, chronology and booking conflicts. Restrict administrator access to administrative data.
5. Remove synthetic production state and reconcile dashboard and settings with persisted profiles. Check all routed pages for false success and missing navigation. Run the three role journeys against isolated data.
6. Check AI tool arguments, user scoping, output accuracy and provider failure behavior. Test equivalent rupee amounts and all supported financial calculations with independent expected values.
7. Verify responsive layouts, accessibility, keyboard operation, error states, bundle cost, DB and request performance. Review dependencies, Indian advisory and privacy obligations and recovery procedures. Record commands, results and outstanding release gates in the requested reports.

## Initial workflow inventory

| Pages | Server and storage boundary |
|---|---|
| Home, Services, Insurance, Webinars, NotFound | Public navigation, service descriptions and content; content router and content table for persisted publications. |
| Signup, Login, ResetPassword, AuthCallback, Onboarding | Auth and user routes, users table, OTP adapter and session cookies. |
| Dashboard, Settings, FinancialPlanner, SIPCalculator, LumpsumCalculator | Authenticated profile, financial arrays, dashboard summary and local calculations. Verify synchronization with normalized financial tables. |
| AIChat | AI routes, conversation/message tables and financial tool services. |
| AdvisorRegister, AdvisorInviteClaim, AdvisorPortal | Advisor auth, user consent endpoints, advisors, relationships, notifications and Phase 7.2 communication tables. |
| AdminLogin, AdminPortal and legacy admin redirect | Admin auth, admins, users, content, advisor approvals and audit records. |

Release review requires an independently reproduced clean build, disposable migration and restore, numeric tests, successful authenticated journeys for all three roles and documented resolution of credential rotation and data exposure. Source inspection alone cannot close these gates.
