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
| `AUTH_URL` | `https://your-app.vercel.app` | Your Vercel URL |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | OAuth client |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | OAuth client |
| `SUPABASE_URL` | From Supabase project settings | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase API keys | Service role key |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/app/apikey) | For label suggestions |
| `CRON_SECRET` | Random string (e.g. `npx auth secret`) | For cron job auth |
| `GMAIL_PUBSUB_TOPIC` | See step 3 below | Full topic name for live Gmail |

Then **Save** and trigger a **Redeploy** (Deployments → ⋮ → Redeploy).

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

## 4. Supabase: run all SQL

In **Supabase** → **SQL Editor**, run these in order (if you haven’t already):

1. **NextAuth schema**  
   Contents of `supabase/next_auth_schema.sql` (or run the schema your NextAuth adapter expects).

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
