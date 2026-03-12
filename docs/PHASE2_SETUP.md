# Phase 2 setup — detailed walkthrough

Do **Step 1** (Supabase) and **Step 2** (Google) in any order. Then fill `.env.local` and run the app (**Step 3**).

---

## Step 1 — Supabase (database for users and tokens)

### 1.1 Create a Supabase project

1. Go to **https://supabase.com** and sign in (or create an account with GitHub/email).
2. Click **“New project”**.
3. Choose or create an **Organization** (e.g. “Personal” or your team name).
4. Fill in:
   - **Name:** e.g. `flowdesk`
   - **Database password:** choose a strong password and **save it somewhere safe** (you need it to connect to the DB later).
   - **Region:** pick one close to you.
5. Click **“Create new project”** and wait until the project is ready (green checkmark).

### 1.2 Run the NextAuth SQL schema

1. In the left sidebar, click **“SQL Editor”**.
2. Click **“New query”**.
3. Open this file in your project and copy **all** of its contents:
   - **File:** `flowdesk/supabase/next_auth_schema.sql`
   - Or from the repo root: `supabase/next_auth_schema.sql`
4. Paste into the Supabase SQL Editor (replace any existing text).
5. Click **“Run”** (or press Ctrl+Enter).
6. You should see **“Success. No rows returned”** — that’s correct. The tables were created.

### 1.3 Expose the `next_auth` schema

1. In the left sidebar, click **“Settings”** (gear icon).
2. Click **“API”** in the Settings menu.
3. Scroll to **“Exposed schemas”** (or “Schema” / “API settings”).
4. In the list of schemas, add **`next_auth`** (type it if it’s a text field, or check the box if it’s a list).
5. Save if there’s a Save button.

### 1.4 Copy your Supabase keys into `.env.local`

1. Stay on **Settings → API**.
2. **Project URL**  
   - Copy the **Project URL** (e.g. `https://xxxxxxxxxxxx.supabase.co`).  
   - In your project, open **`.env.local`** and paste it as:
     ```env
     SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
     ```
     (replace with your actual URL, no quotes)

3. **Service role key**  
   - Under **Project API keys**, find **“service_role”** (not anon).  
   - Click **Reveal** and copy the long key.  
   - In **`.env.local`**, set:
     ```env
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-long-key...
     ```
   - **Important:** Never commit this key or share it. It bypasses Row Level Security.

You’re done with Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` are filled in.

---

## Step 2 — Google OAuth (Sign in with Google)

### 2.1 Open Google Cloud Console

1. Go to **https://console.cloud.google.com/** and sign in with the Google account you want to use for development.
2. In the top bar, click the **project dropdown** (“Select a project” or the current project name).
3. Click **“New project”**.
   - **Project name:** e.g. `FlowDesk`.
   - Click **“Create”** and wait, then **select** that project.

### 2.2 Configure the OAuth consent screen

1. In the left menu go to **“APIs & Services”** → **“OAuth consent screen”** (or search for “OAuth consent”).
2. **User type:** choose **“External”** (so any Google account can sign in). Click **“Create”**.
3. **App information:**
   - **App name:** `FlowDesk`
   - **User support email:** your email
   - **Developer contact:** your email
4. Click **“Save and continue”**.
5. **Scopes:** click **“Add or remove scopes”**. You can leave the default (email, profile, openid). FlowDesk will request Gmail/Calendar/Tasks when the user signs in. Click **“Save and continue”**.
6. **Test users:** if the app is in “Testing” mode, add your own email as a test user. Otherwise click **“Save and continue”**.
7. Click **“Back to dashboard”**.

### 2.3 Create OAuth client ID (Web application)

1. Go to **“APIs & Services”** → **“Credentials”**.
2. Click **“+ Create credentials”** → **“OAuth client ID”**.
3. **Application type:** **“Web application”**.
4. **Name:** e.g. `FlowDesk web`.
5. **Authorized redirect URIs** — click **“+ Add URI”** and add these **one by one** (exactly as shown):
   - For local dev:
     ```text
     http://localhost:3000/api/auth/callback/google
     ```
   - For production (replace with your real Vercel URL when you have it):
     ```text
     https://YOUR-VERCEL-URL.vercel.app/api/auth/callback/google
     ```
     Example: `https://flowdesk-abc123.vercel.app/api/auth/callback/google`
6. Click **“Create”**.
7. A popup shows **Client ID** and **Client secret**. Copy both (or download JSON).
   - **Client ID** looks like: `123456789-xxxxx.apps.googleusercontent.com`
   - **Client secret** looks like: `GOCSPX-xxxxxxxxxxxxxxxx`

### 2.4 Paste Google keys into `.env.local`

Open **`.env.local`** and set:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret-here
```

(No quotes, no spaces around `=`.)

You’re done with Google when both are in `.env.local`.

---

## Step 3 — Run the app and sign in

1. In a terminal, from the **flowdesk** folder:
   ```bash
   cd "c:\Users\Ryan Neels\.cursor\flowdesk"
   npm run dev
   ```
2. Open **http://localhost:3000** in your browser.
3. You should see **“Sign in with Google”**. Click it.
4. Choose your Google account and approve the requested access (Gmail, Calendar, Tasks).
5. You should be redirected back to FlowDesk and see your name and “Phase 2 complete.”

If something fails:

- **“This page isn’t working” or “localhost is unable to handle this request” after approving Google**  
  - **Port mismatch:** `AUTH_URL` in `.env.local` must match the URL in your browser **including the port**. If you open `http://localhost:3000`, use `AUTH_URL=http://localhost:3000`. If you open `http://localhost:3001`, use `AUTH_URL=http://localhost:3001` and add `http://localhost:3001/api/auth/callback/google` to Google’s **Authorized redirect URIs**.  
  - **Callback error:** Check the terminal where `npm run dev` is running for a line like `[NextAuth] Callback error: ...`. The message may point to Supabase (e.g. schema not exposed or wrong key). Fix that, restart the dev server, and try again.
- **“supabaseUrl is required”** or **“Error with Supabase”** → Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and that you ran the SQL and exposed the `next_auth` schema.
- **“Redirect URI mismatch”** → In Google Cloud, the redirect URI must be exactly `http://localhost:3000/api/auth/callback/google` (no trailing slash, http not https for local).
- **“Access blocked” / consent screen** → Add your email as a test user on the OAuth consent screen, or publish the app (for production).

---

## Checklist

- [ ] Supabase project created
- [ ] `supabase/next_auth_schema.sql` run in SQL Editor
- [ ] `next_auth` added to Exposed schemas (Settings → API)
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured (External, app name, your email)
- [ ] OAuth client ID created (Web application)
- [ ] Redirect URI `http://localhost:3000/api/auth/callback/google` added
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
- [ ] `npm run dev` → open http://localhost:3000 → Sign in with Google works
