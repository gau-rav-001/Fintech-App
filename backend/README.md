# SmartFinance Backend — Node.js + Express + PostgreSQL

Production-ready FinTech API with JWT auth, OTP email, Google OAuth,
conditional onboarding, dynamic dashboard, and admin portal.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | PostgreSQL 14+ |
| ORM/Query | `pg` (native driver, no ORM) |
| Auth | JWT + bcrypt |
| OTP | Nodemailer (Gmail SMTP) |
| Google OAuth | Passport.js + passport-google-oauth20 |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, email, Google OAuth keys

# 3. Create the database
psql -U postgres -c "CREATE DATABASE smartfinance;"

# 4. Run migrations (creates all tables)
npm run db:migrate

# 5. Seed first admin account
npm run db:seed

# 6. Start server
npm run dev       # development (nodemon)
npm start         # production
```

---

## PostgreSQL Schema

### Table: `users`
Stores all user data. Financial arrays (`expenses`, `investments`, `goals`, `loans`)
are stored as **JSONB** — flexible, indexed, and queryable.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, auto-generated |
| full_name | VARCHAR | |
| email | VARCHAR | UNIQUE |
| password_hash | TEXT | bcrypt, never returned |
| google_id | VARCHAR | UNIQUE, nullable |
| provider | ENUM | `email` / `google` |
| is_profile_complete | BOOLEAN | default FALSE |
| income_monthly | NUMERIC | |
| expenses | JSONB | `[{category, amount, icon, color}]` |
| investments | JSONB | `[{type, name, investedAmount, currentValue, ...}]` |
| goals | JSONB | `[{name, targetAmount, currentSavings, targetDate, ...}]` |
| loans | JSONB | `[{type, lenderName, outstandingAmount, emi, ...}]` |

### Table: `admins`
Separate table — admins cannot access user routes.

### Table: `content`
Webinars, news updates, and videos managed by admins.

---

## API Reference

### Auth  `/api/auth`

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/signup` | `{fullName, email, mobile, password}` | Register → sends OTP |
| POST | `/login` | `{email, password}` | Login → sends OTP |
| POST | `/verify-otp` | `{email, otp}` | Verify OTP → returns JWT |
| POST | `/resend-otp` | `{email}` | Resend OTP |
| GET | `/google` | — | Start Google OAuth |
| GET | `/me` | *(auth)* | Current user |
| POST | `/logout` | *(auth)* | Logout |

### User  `/api/user`  *(Bearer token required)*

| Method | Path | Description |
|---|---|---|
| POST | `/onboarding` | Save full profile → `isProfileComplete = true` |
| GET | `/profile` | Full user data |
| PUT | `/update` | Partial update |
| POST | `/change-password` | Change password |
| GET | `/dashboard/summary` | Net worth, savings, insights *(profile required)* |

### Admin  `/api/admin`

| Method | Path | Description |
|---|---|---|
| POST | `/login` | Admin login → JWT |
| GET | `/me` | *(admin auth)* |
| GET | `/stats` | Platform statistics |
| GET | `/users` | All users (page, search) |
| GET | `/users/:id` | Single user |
| GET | `/content` | All content |
| POST | `/content` | Create webinar / news / video |
| PUT | `/content/:id` | Update |
| DELETE | `/content/:id` | Delete |

### Public  `/api/content`

| Method | Path | Description |
|---|---|---|
| GET | `/?type=webinar` | Published content (no auth) |

---

## Environment Variables

| Key | Description |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/smartfinance` |
| `DB_HOST/PORT/NAME/USER/PASSWORD` | Individual fields (if no DATABASE_URL) |
| `DB_SSL` | `true` for Supabase / Railway / Render |
| `JWT_SECRET` | Long random string |
| `JWT_EXPIRES_IN` | e.g. `30d` |
| `EMAIL_USER` | Gmail address |
| `EMAIL_PASS` | Gmail App Password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5000/api/auth/google/callback` |
| `CLIENT_URL` | Frontend URL e.g. `http://localhost:5173` |

---

## Hosted PostgreSQL Options (Free Tier)

| Provider | Notes |
|---|---|
| **Supabase** | `DB_SSL=true`, use connection string from Dashboard |
| **Railway** | Auto-provides `DATABASE_URL`, set `DB_SSL=true` |
| **Render** | Free PostgreSQL instance, use internal URL |
| **Neon** | Serverless PG, set `DB_SSL=true` |
| **Local** | `postgresql://postgres:password@localhost:5432/smartfinance` |

---

## Frontend Integration

```bash
# In your React project .env:
VITE_API_URL=http://localhost:5000/api
```

Copy these two files to your React project:
- `api.ts`            → `src/app/services/api.ts`
- `AuthCallback.tsx`  → `src/app/pages/AuthCallback.tsx`

Add the callback route in `src/app/routes.tsx`:
```ts
import { AuthCallback } from "./pages/AuthCallback";
// add to routes array:
{ path: "/auth/callback", Component: AuthCallback },
```

---

## Gmail App Password

1. Google Account → Security → Enable 2-Step Verification  
2. Search "App Passwords" → Mail → Generate  
3. Paste the 16-char password as `EMAIL_PASS`

## Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials  
2. Create OAuth 2.0 Client ID (Web application)  
3. Authorised redirect URI: `http://localhost:5000/api/auth/google/callback`  
4. Copy Client ID and Secret to `.env`
