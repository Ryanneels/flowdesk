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

## Next: Phase 2

After GitHub and Vercel are set up and you’ve confirmed the live URL works, we’ll add:

- **NextAuth.js** with **Google OAuth**
- **Multi-account support** and storing tokens in **Supabase**

So you can sign in with Google and the app can act on your behalf (Gmail, Calendar, Tasks) in later phases.
