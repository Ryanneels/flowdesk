# FlowDesk

FlowDesk is a full-stack web app that integrates with Google Workspace to manage Gmail and Google Calendar with AI (Gemini)—inspired by Fyxer and Reclaim.

---

## Phase 1 — Project setup ✅

Phase 1 is **initializing the app and getting it online**. Here’s what’s done and what you do next.

### What we set up

| Thing | What it is (beginner version) |
|-------|-------------------------------|
| **Next.js** | A React-based framework. It gives you pages, API routes, and builds your app for production. |
| **TypeScript** | JavaScript with types. Helps catch mistakes before you run the app. |
| **Tailwind CSS** | A utility-first CSS library. You style by adding classes like `rounded-lg` and `bg-white`. |
| **App Router** | Next.js’s file-based routing. The `app/` folder defines your pages (e.g. `app/page.tsx` = home). |
| **ESLint** | A linter that flags style and common bugs. Run with `npm run lint`. |

The project folder is **`flowdesk`** (lowercase) because npm project names can’t use capitals. The product name is still **FlowDesk** everywhere in the UI.

### Run the app locally

1. Open a terminal in the project folder:
   ```bash
   cd "c:\Users\Ryan Neels\.cursor\flowdesk"
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. In your browser go to: **http://localhost:3000**  
   You should see the FlowDesk Phase 1 landing page.

---

## Connect to GitHub and deploy to Vercel

Do these steps **in order**. After this, your app will be on the internet and we can move to Phase 2 (Auth).

### Step 1 — Create a GitHub account (if you don’t have one)

- Go to [github.com](https://github.com) and sign up.
- You’ll use GitHub to store your code and to connect to Vercel.

### Step 2 — Install Git (if needed)

- If you’re not sure whether Git is installed, open a terminal and run: `git --version`.
- If it’s not installed: [Download Git for Windows](https://git-scm.com/download/win) and install it.

### Step 3 — Create a new repository on GitHub

1. On GitHub, click the **+** (top right) → **New repository**.
2. **Repository name:** `flowdesk` (or any name you like).
3. Choose **Public**.
4. **Do not** check “Add a README” or “Add .gitignore”—the project already has these.
5. Click **Create repository**.

### Step 4 — Push your FlowDesk code to GitHub

In a terminal, run these commands **from the flowdesk project folder** (`c:\Users\Ryan Neels\.cursor\flowdesk`). Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

```bash
cd "c:\Users\Ryan Neels\.cursor\flowdesk"

git init
git add .
git commit -m "Phase 1: Next.js app setup"

git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/flowdesk.git
git push -u origin main
```

When Git asks for credentials, use your GitHub username and a **Personal Access Token** (not your password). To create one: GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**. Give it “repo” scope.

### Step 5 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use **Continue with GitHub**).
2. Click **Add New…** → **Project**.
3. **Import** the `flowdesk` repository (or whatever you named it).
4. Leave the default settings (Framework: Next.js, root directory: `./`).
5. Click **Deploy**.
6. Wait a minute. Vercel will build and deploy your app and give you a URL like `flowdesk-xxx.vercel.app`.

### Step 6 — Confirm Phase 1 is done

- Open the Vercel URL in your browser. You should see the same FlowDesk Phase 1 page as on localhost.
- Once that works, **Phase 1 is complete.** Tell your assistant you’re ready for **Phase 2 — Auth** (NextAuth.js with Google OAuth and storing tokens in Supabase).

---

## Project structure (quick reference)

```
flowdesk/
├── app/
│   ├── layout.tsx   # Wraps every page (fonts, metadata)
│   ├── page.tsx     # Home page (what you see at /)
│   └── globals.css  # Global styles and Tailwind
├── public/          # Static files (images, etc.)
├── package.json     # Dependencies and scripts
├── next.config.ts   # Next.js config
├── tailwind.config.ts
├── tsconfig.json
└── README.md        # This file
```

---

## Scripts

| Command | What it does |
|--------|----------------|
| `npm run dev` | Start the app in development mode (with hot reload). |
| `npm run build` | Build the app for production. |
| `npm run start` | Run the built app locally (run `npm run build` first). |
| `npm run lint` | Run ESLint to check for issues. |

---

## Phase 2 — Auth ✅

Phase 2 adds **sign-in with Google** and stores **tokens in Supabase** so FlowDesk can use Gmail, Calendar, and Tasks on your behalf (including when you’re offline).

### What we added

| Thing | What it does |
|-------|----------------|
| **NextAuth.js (v5)** | Handles “Sign in with Google,” sessions, and callbacks. |
| **Supabase adapter** | Saves users, sessions, and OAuth tokens (refresh + access) in Supabase. |
| **Google OAuth scopes** | We request `gmail.modify`, `calendar`, and `tasks` so we can use those APIs later. |

### Run Phase 2 locally (setup steps)

**Detailed walkthrough:** see **[docs/PHASE2_SETUP.md](docs/PHASE2_SETUP.md)** for step-by-step instructions with exact clicks and what to copy.

Do these once, then run the app.

#### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**. Pick an organization, name (e.g. `flowdesk`), database password, and region.
3. Wait for the project to be ready.

#### 2. Create the NextAuth tables in Supabase

1. In the Supabase dashboard, open **SQL Editor**.
2. Open the file **`supabase/next_auth_schema.sql`** in this repo and copy its full contents.
3. Paste into the SQL Editor and click **Run**.
4. Go to **Settings** → **API**. Under **Exposed schemas**, add **`next_auth`** and save. (This lets the adapter use the `next_auth` schema.)

#### 3. Get Supabase keys

Still in **Settings** → **API**:

- **Project URL** → copy. This is `SUPABASE_URL`.
- **Project API keys** → **service_role** (secret) → copy. This is `SUPABASE_SERVICE_ROLE_KEY`. Keep it secret.

#### 4. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Open **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
3. If asked, configure the **OAuth consent screen** (External, your email, app name e.g. “FlowDesk”, save).
4. Application type: **Web application**.
5. **Authorized redirect URIs** — add:
   - `http://localhost:3000/api/auth/callback/google`
   - Your production URL, e.g. `https://flowdesk-xxx.vercel.app/api/auth/callback/google`
6. Create. Copy the **Client ID** and **Client secret** → these are `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

#### 5. Environment variables

1. In the project folder, copy the example env file:
   ```bash
   copy .env.local.example .env.local
   ```
2. Open **`.env.local`** and set:
   - `AUTH_SECRET` — run `npx auth secret` in the project and paste the output.
   - `AUTH_URL` — `http://localhost:3000` for local dev.
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from step 4.
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from step 3.

#### 6. Run the app

```bash
npm run dev
```

Open **http://localhost:3000**. You should see **Sign in with Google**. After signing in, you’ll see your name and “Phase 2 complete.” Your tokens are stored in Supabase.

### Deploy Phase 2 to Vercel

In the Vercel project **Settings** → **Environment Variables**, add the same variables as in `.env.local`:

- `AUTH_SECRET`, `AUTH_URL` (use your Vercel URL, e.g. `https://flowdesk-xxx.vercel.app`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

Add **Authorized redirect URIs** for your Vercel URL in Google Cloud Console (see step 4 above). Then redeploy.

### Multi-account (later)

Right now you sign in with one Google account. “Add account” and “switch account” (multiple Google accounts in one FlowDesk session) can be added in a later step.

---

---

## Phase 3 — Database ✅

Phase 3 adds the **FlowDesk app tables** in Supabase and confirms the connection.

### What we added

| Table | Purpose |
|-------|---------|
| **label_rules** | Approved email → label rules for Gmail auto-labeling (Phase 5). |
| **scheduled_tasks** | Google Tasks that have been slotted onto the calendar. |
| **habits** | Recurring time blocks (e.g. exercise 7am–8am daily). |
| **activity_log** | Audit log of every action the app takes (for the dashboard). |

All tables use `user_id` referencing `next_auth.users(id)`.

### Run Phase 3 (one-time)

1. Open **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
2. Open **`supabase/flowdesk_tables.sql`** in this repo, copy **all** of its contents, and paste into the editor.
3. Click **Run**. You should see “Success. No rows returned.”
4. Confirm the connection: open **http://localhost:3000/api/debug-db** in your browser. You should see `"ok": true` and “Phase 3 DB check passed.”

### Project structure (updated)

```
supabase/
├── next_auth_schema.sql    # Auth tables (Phase 2)
├── flowdesk_tables.sql     # App tables (Phase 3)
├── grant_next_auth_permissions.sql
└── README.md
```

---

## Phase 4 — Gmail integration ✅

Phase 4 **connects the Gmail API**: read emails, list labels, and apply labels (foundation for AI labeling in Phase 5).

### What we added

| Item | Purpose |
|------|---------|
| **lib/google-token.ts** | Gets the user’s Google access token from Supabase (next_auth.accounts), refreshes it if expired, and returns it for API calls. |
| **GET /api/gmail/labels** | List the signed-in user’s Gmail labels. |
| **GET /api/gmail/messages** | List messages (query: `maxResults`, `labelIds`; default: INBOX, 10). |
| **GET /api/gmail/messages/[id]** | Get one message (metadata: subject, from, snippet). |
| **POST /api/gmail/messages/[id]/labels** | Add/remove labels on a message (body: `addLabelIds`, `removeLabelIds`). |
| **GmailPreview (dashboard)** | When signed in, shows a card with your labels and recent inbox messages. |

### How to try it

1. Sign in at **http://localhost:3000**.
2. The **Gmail (Phase 4)** card should show your labels and recent inbox message IDs.
3. Optional: call the APIs directly (e.g. `GET /api/gmail/labels`, `GET /api/gmail/messages?maxResults=5`).

---

## Next: Phase 5

Phase 5 will add **AI email labeling** with Gemini: suggest labels for new emails and an approval flow before applying rules.
