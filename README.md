# SmartFinance — Project Analysis & Fix Instructions

## Project Summary

SmartFinance is a full-stack Indian fintech web app:

| Layer    | Stack                                      | Dev Port |
|----------|--------------------------------------------|----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind    | 5173     |
| Backend  | Node.js + Express + PostgreSQL             | 5000     |

---

## ✅ Frontend ↔ Backend Connection — VERIFIED

Every single API call in the frontend maps to a real backend route. The full route-to-route mapping is clean:

| Frontend (api.ts)              | Backend Route                    |
|-------------------------------|----------------------------------|
| authAPI.signup                | POST   /api/auth/signup          |
| authAPI.login                 | POST   /api/auth/login           |
| authAPI.verifyOTP             | POST   /api/auth/verify-otp      |
| authAPI.resendOTP             | POST   /api/auth/resend-otp      |
| authAPI.exchangeCode          | POST   /api/auth/exchange-code   |
| authAPI.me                    | GET    /api/auth/me              |
| authAPI.logout                | POST   /api/auth/logout          |
| userAPI.onboarding            | POST   /api/user/onboarding      |
| userAPI.getProfile            | GET    /api/user/profile         |
| userAPI.updateProfile         | PUT    /api/user/update          |
| userAPI.changePassword        | POST   /api/user/change-password |
| userAPI.getDashboard          | GET    /api/user/dashboard/summary|
| adminAPI.login                | POST   /api/admin/login          |
| adminAPI.me                   | GET    /api/admin/me             |
| adminAPI.getStats             | GET    /api/admin/stats          |
| adminAPI.getUsers             | GET    /api/admin/users          |
| adminAPI.getUserById          | GET    /api/admin/users/:id      |
| adminAPI.getContent/CRUD      | /api/admin/content (GET/POST/PUT/DELETE) |
| contentAPI.getAll             | GET    /api/content              |

Google OAuth flow is also complete:
`GET /api/auth/google` → Google → `GET /api/auth/google/callback`
→ backend issues one-time code → frontend `/auth/callback`
→ `POST /api/auth/exchange-code` → JWT stored ✅

Auth/session flow: JWT in Bearer header, token stored in
sessionStorage (default) or localStorage (remember me), with
a blacklist for revoked tokens on logout. ✅

---

## 🐛 Issues Found & Fixes Applied

### FIX 1 — Missing Vite Dev Proxy (CRITICAL)
**File:** `vite.config.ts`

**Problem:** The frontend `.env` had `VITE_API_URL=http://localhost:5000/api`.
Making requests directly to a different origin (port 5000 from port 5173)
means the browser sends CORS preflight requests. While CORS headers were set
correctly in the backend, this setup:
- Exposes the backend address in browser network tab
- Can break in some environments where localhost cross-origin is blocked
- Prevents cookie-based auth from working (cookies need same origin)

**Fix:** Added a Vite `server.proxy` config that forwards all `/api/*`
requests to `http://localhost:5000`. The frontend now uses relative
`VITE_API_URL=/api` — no origin, no port — and the dev server bridges
the gap invisibly.

### FIX 2 — Frontend .env URL
**File:** `.env` (root, not backend/.env)

**Problem:** `VITE_API_URL=http://localhost:5000/api` — hardcoded absolute URL.

**Fix:** Change to `VITE_API_URL=/api`

### FIX 3 — api.ts fallback URL
**File:** `src/app/services/api.ts`

**Problem:** Hardcoded fallback `"http://localhost:5000/api"` in the BASE constant.

**Fix:** Fallback changed to `"/api"` to match the proxy setup.

### FIX 4 — No unified start command (DX improvement)
**File:** `package.json` (root)

**Problem:** No way to start frontend + backend together. Developers had to
open two terminals manually.

**Fix:** Added `dev:all` script using `concurrently`. After installing:
```
npm install
npm run dev:all
```
Both servers start with color-coded output (FRONT / BACK).

---

## 📋 What Was Already Fixed (In-Code Comments)

The codebase contains many `// FIX:` comments — previous bugs that were
already patched before this review. For your reference:

| Area | Fix |
|------|-----|
| authController | `bcryptjs` was missing import — now imported ✅ |
| authController | Constant-time compare to prevent user enumeration ✅ |
| authController | `exchangeCode` endpoint added (Google OAuth completion) ✅ |
| AuthCallback.tsx | Reads `?code=` param, not `?token=` — exchanges it for JWT ✅ |
| authService.ts | `remember` flag correctly persists to localStorage vs sessionStorage ✅ |
| AuthContext.tsx | `updateUser` reads `remember` from session instead of localStorage ✅ |
| userRoutes.js | `timeHorizonYears` min changed from 0 to 1 (matches DB CHECK constraint) ✅ |
| userRoutes.js | Password change uses same strength rules as signup ✅ |
| adminRoutes.js | PUT /content/:id now has full validation middleware ✅ |
| auth.js middleware | Handles `TokenRevokedError` explicitly ✅ |
| jwt.js | Token blacklist with JTI, auto-cleaned every 15 min ✅ |
| otp.js | Pluggable Redis adapter documented ✅ |

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Database `Smartfinance` created

### 1. Set up the database
```bash
cd backend
npm install
node db/migrate.js    # creates all tables
node db/seed.js       # creates default admin account
```

Default admin login:
- Email: `admin@smartfinance.in`
- Password: `Admin2024!`

### 2. Configure backend secrets
Edit `backend/.env`:
- Set your real `JWT_SECRET` (already set in your file)
- Set `EMAIL_USER` and `EMAIL_PASS` for Gmail OTP sending (already set)
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google OAuth
  (currently placeholder — required for Google login to work)

### 3. Start both servers (after applying fixes)
```bash
# In project root
npm install             # installs concurrently
npm run dev:all         # starts frontend (5173) + backend (5000)
```

Or manually in two terminals:
```bash
# Terminal 1
npm run dev             # frontend

# Terminal 2
cd backend && npm run dev   # backend
```

---

## ⚠️ Important Notes

### Google OAuth is NOT fully configured
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` are still
set to placeholder values (`your_google_client_id`). Google login will
redirect to `/login?error=google` until you:
1. Create a project at console.cloud.google.com
2. Enable the Google+ API
3. Create OAuth 2.0 credentials with redirect URI:
   `http://localhost:5000/api/auth/google/callback`
4. Paste the real Client ID and Secret into `backend/.env`

### OTP uses in-memory storage
`backend/utils/otp.js` stores OTPs in a Node.js `Map`. This is fine for
development and single-server production, but OTPs are lost on server
restart. For multi-instance deployments, switch to the Redis adapter
documented in that file.

### JWT blacklist is in-memory
`backend/utils/jwt.js` keeps a revoked-token blacklist in a `Map`. Same
caveat as above — lost on restart. Acceptable for dev; use Redis in prod.

### Dashboard uses localStorage cache
`Dashboard.tsx` reads financial data from `mockData.ts` (localStorage),
not directly from the backend API. This is by design — the backend stores
the ground truth, and `Onboarding.tsx` writes it to both the backend and
local cache. If a user clears browser storage, the Dashboard will show
empty data until they re-onboard or a sync mechanism is added.

---

## 📁 Files to Replace

Copy these files from the FIXES/ folder into your project:

| FIXES/ path | Replace in project |
|-------------|-------------------|
| `vite.config.ts` | `Fintech/vite.config.ts` |
| `.env` | `Fintech/.env` |
| `src/app/services/api.ts` | `Fintech/src/app/services/api.ts` |
| `package.json` | `Fintech/package.json` (then run `npm install`) |