# FlowDesk — Deploy to Vercel and set up live Gmail

This guide gets your app (all phases) onto Vercel and configures **live** label+archive (triggered when email arrives) plus optional cron fallback.

---

## 1. Push your code and connect Vercel

1. **Commit and push** everything to GitHub (your `flowdesk` repo):
   ```bash
   cd flowdesk
   git add .
   git status
   git commit -m "Phases 2–5: auth, DB, Gmail, labels, corrections, process-inbox, push"
   git push origin main
   ```

2. **Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in (GitHub).
   - **Add New Project** → Import the `flowdesk` (or `Ryanneels/flowdesk`) repo.
   - **Framework Preset:** Next.js (leave defaults).
   - **Root Directory:** `./` (or leave blank if the repo root is the app).
   - Do **not** deploy yet — add env vars first (step 2).

---

## 2. Environment variables in Vercel

In the project → **Settings** → **Environment Variables**, add these for **Production** (and **Preview** if you use it):

| Name | Value | Notes |
|------|--------|--------|
| `AUTH_SECRET` | (from `npx auth secret`) | Required for NextAuth |
| `AUTH_URL` | `https://your-app.vercel.app/api/auth` | **Must be exact:** your Vercel URL + `/api/auth` (no trailing slash). Required so Google sign-in redirects back correctly. |
| `NEXTAUTH_URL` | Same as `AUTH_URL` | Set to the same value as `AUTH_URL`. Some code paths still use this; avoids redirect/callback issues. |
| `AUTH_TRUST_HOST` | `true` | Recommended in production (Vercel sets this automatically in many cases). |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | OAuth client |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | OAuth client |
| `SUPABASE_URL` | From Supabase project settings | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase API keys | Service role key |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/app/apikey) | For label suggestions |
| `CRON_SECRET` | Random string (e.g. `npx auth secret`) | For cron job auth |
| `GMAIL_PUBSUB_TOPIC` | See step 3 below | Full topic name for live Gmail |

Then **Save** and trigger a **Redeploy** (Deployments → ⋮ → Redeploy).

---

## 2b. If Google sign-in gets stuck loading

If after clicking “Sign in with Google” the app hangs or never returns from Google:

1. **Set `AUTH_URL` correctly in Vercel**
   - It must be your **exact** app URL including the auth path:  
     `https://YOUR_ACTUAL_DOMAIN.vercel.app/api/auth`  
   - No trailing slash. Example: `https://flowdesk-abc123.vercel.app/api/auth`
   - **Settings** → **Environment Variables** → edit `AUTH_URL` → **Save** → **Redeploy**.

2. **Add the production redirect URI in Google Cloud**
   - On your **live** app, open **`https://YOUR_ACTUAL_DOMAIN.vercel.app/api/debug-auth-url`** in the browser. Copy the **`redirectUriForGoogle`** value (it should look like `https://..../api/auth/callback/google`).
   - [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → open your **OAuth 2.0 Client ID** (Web application).
   - Under **Authorized redirect URIs**, click **Add URI** and paste that URL **exactly** (no trailing slash).
   - **Save**.

3. **Set both AUTH_URL and NEXTAUTH_URL** in Vercel to the same value (e.g. `https://yourapp.vercel.app/api/auth`). Some auth code paths use `NEXTAUTH_URL`; having both avoids redirect issues.

4. **Redeploy** after changing env vars so the new values are used.

### 2c. If login still hangs after fixing AUTH_URL and Google URI

1. **See where it hangs (browser)**
   - Open your app in Chrome/Edge, press **F12** → **Network** tab. Leave it open.
   - Click **Sign in with Google**, sign in at Google, then watch the **Network** tab.
   - Find the request to **`/api/auth/callback/google`** (it may have `?code=...&state=...`).
   - If that request stays **Pending** and never completes → the server is hanging (often Supabase or the adapter). If it returns **302** or **500** → note the status and any redirect.

2. **See what the server does (Vercel logs)**
   - In **Vercel** → your project → **Deployments** → open the latest deployment.
   - Click **Functions** (or **Logs** / **Runtime Logs**).
   - Try signing in again, then refresh the logs. You should see:
     - `[NextAuth] Incoming callback request: ... has code` when the callback is hit.
     - `[NextAuth] Callback response status: 302` if it succeeded, or `[NextAuth] Callback error: ...` if it threw.
   - If you see **Callback error** or a Supabase/DB error, fix that (e.g. Supabase URL/key, or run the SQL scripts in Supabase).

3. **Check Supabase from production**
   - On your **live** app open **`https://YOUR_APP.vercel.app/api/debug-db`**.
   - If that fails or times out, the app cannot reach Supabase from Vercel (e.g. wrong `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, or network). Fix env and redeploy.

4. **Try in a private/incognito window** so no old cookies or cache affect the flow.

---

## 3. Google Cloud: Pub/Sub for live Gmail (optional but recommended)

Live processing runs when Gmail receives new mail. Gmail sends a notification to a **Pub/Sub topic**; a **push subscription** calls your Vercel URL.

1. **Open [Google Cloud Console](https://console.cloud.google.com)** and select the **same project** you use for Gmail API and OAuth.

2. **Enable APIs**
   - **APIs & Services** → **Library**
   - Enable **Cloud Pub/Sub API** and **Gmail API** (if not already).

3. **Create a topic**
   - **Pub/Sub** → **Topics** → **Create topic**
   - **Topic ID:** e.g. `gmail-flowdesk`
   - **Create**
   - Note the full name: `projects/YOUR_PROJECT_ID/topics/gmail-flowdesk`.

4. **Grant Gmail permission to publish**
   - Open the topic → **Permissions** → **Add principal**
   - **New principals:** `gmail-api-push@system.gserviceaccount.com`
   - **Role:** **Pub/Sub Publisher**
   - **Save**

5. **Create a push subscription**
   - **Pub/Sub** → **Subscriptions** → **Create subscription**
   - **Subscription ID:** e.g. `flowdesk-gmail-push`
   - **Topic:** the topic you created (e.g. `gmail-flowdesk`)
   - **Delivery type:** **Push**
   - **Endpoint URL:** `https://YOUR_VERCEL_APP.vercel.app/api/gmail/push`
   - **Create**

6. **Set env in Vercel**
   - In Vercel → **Settings** → **Environment Variables**
   - Add: `GMAIL_PUBSUB_TOPIC` = `projects/YOUR_PROJECT_ID/topics/gmail-flowdesk` (your full topic name)
   - Redeploy.

7. **Turn on watch for your account**
   - After deploy, sign in to FlowDesk and click **Turn on live** on the Gmail card. That registers your mailbox with Gmail; new mail will trigger `/api/gmail/push` and label+archive will run.

---

## 4. Supabase: run all SQL and expose next_auth

If sign-in fails with **Configuration** and the error page says AdapterError (Supabase failed saving session), do the following.

### Expose the next_auth schema (required)

1. **Supabase Dashboard** → your project → **Settings** (gear) → **API** (or **Database**).
2. Find **Exposed schemas** (or **Schema** / **Data API**).
3. Add **`next_auth`** to the list (with `public`, etc.). **Save**.
4. If you don’t see “Exposed schemas”, run the last two lines of `supabase/next_auth_schema.sql` in the SQL Editor:
   ```sql
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, next_auth';
   NOTIFY pgrst, 'reload schema';
   ```

### Run SQL in order

In **Supabase** → **SQL Editor**, run these in order (if you haven’t already):

1. **NextAuth schema**  
   Full contents of `supabase/next_auth_schema.sql`.

2. **Grants for NextAuth**  
   `supabase/grant_next_auth_permissions.sql`

3. **App tables**  
   `supabase/flowdesk_tables.sql`

4. **Label categories (Phase 5)**  
   `supabase/phase5_label_categories.sql`

5. **Label corrections**  
   `supabase/label_corrections.sql`

---

## 5. Vercel Cron (fallback every 10 minutes)

The repo includes `vercel.json` with a cron that calls `/api/gmail/process-inbox` every 10 minutes. Vercel sends `CRON_SECRET` in the `Authorization` header when that env var is set.

- Ensure **CRON_SECRET** is set in Vercel (step 2).
- No extra setup; the cron runs automatically after deploy.

---

## 6. OAuth redirect URI

In **Google Cloud Console** → **APIs & Services** → **Credentials** → your OAuth 2.0 Client:

- **Authorized redirect URIs** must include:  
  `https://YOUR_VERCEL_APP.vercel.app/api/auth/callback/google`

---

## Summary

- **Deploy:** Push to GitHub, connect Vercel, add env vars, redeploy.
- **Live Gmail:** Create Pub/Sub topic + push subscription, grant Gmail publish, set `GMAIL_PUBSUB_TOPIC`, then click **Turn on live** in the app.
- **Cron:** Set `CRON_SECRET`; the 10‑minute process-inbox runs automatically.
- **Supabase:** Run all SQL scripts so tables and permissions exist.

After this, new mail can trigger labeling and archiving in real time (push), with the cron as a backup.
