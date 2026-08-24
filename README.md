# Government School Website with Admin CMS

A complete, production-ready Government School Website with a fully-functional Admin Panel, backed entirely by **Appwrite**.

Built with **React + Vite + Tailwind CSS v4** and **Lucide React** icons, styled in an official Indian government blue/gold aesthetic with subtle tricolor accents.

---

## ✨ Features

### Public Website
- 🏛️ **Official Government UI** – blue/gold theme with tricolor accents, high-contrast accessibility toggle
- 🌐 **Bilingual-ready** – English/Hindi language toggle UI
- 🎠 **Hero section** with rotating banner placeholders, school stats, and Ashoka Chakra motif
- 📢 **Notice Ticker** – scrolling marquee of pinned notices
- 📋 **Notice Board** – wooden-board styled list with PDF attachments and pin support
- 👨‍🏫 **Faculty / Teachers** – cards with photos from Appwrite Storage
- 🖼️ **Photo Gallery** – filterable by category (Campus, Events, Sports, Annual Day) with lightbox
- 📍 **Contact Section** – address, phone, email, inquiry form, and Google Maps embed
- 🔗 **Footer** with Government links, visitor-counter stub, and Back-to-Top
- 📱 **Fully responsive**, keyboard-accessible, reduced-motion friendly

### Admin Panel (`#/admin`)
- 🔐 **Appwrite email/password authentication** (default: `admin@school.local` / `Admin@12345`)
- 📝 **Notices Manager** – create/edit/delete/pin notices; upload PDF attachments
- 👨‍🏫 **Teachers Manager** – add/edit/remove faculty with photo uploads and display order
- 🖼️ **Gallery Manager** – single & bulk photo uploads with title + category
- ⚙️ **Settings Manager** – update school name, address, principal message, logo, hero banners, etc.
- 🚪 One-click logout

### Backend (Appwrite)
- **Database**: `school_db`
- **Collections**: `notices`, `teachers`, `gallery`, `school_info` (all publicly readable, authenticated-write)
- **Storage Bucket**: `school_assets` (public read; supports jpg/jpeg/png/webp/gif/pdf up to 20 MB)
- Seeded with sample notices, teachers, school info, and gallery placeholders

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Provision Appwrite backend

The `.env.local` file is pre-populated with your Appwrite credentials. Run the setup script:

```bash
# Dry run first (reports what would be created — safe, no writes)
node setup-appwrite.js

# Actually create everything + seed data
node setup-appwrite.js --apply
```

This will:
1. Verify connectivity to your Appwrite project
2. Create the `school_db` database (if missing)
3. Create all 4 collections + their attributes
4. Create the `school_assets` storage bucket with public-read permissions
5. Create a default admin user (`admin@school.local` / `Admin@12345`) if no users exist
6. Seed sample notices, teachers, gallery categories, and school settings

> ⚠️ **Important**: After first login, change the default admin password from Appwrite Console → Auth → Users.

### 3. Run the dev server
```bash
npm run dev
```
Open http://localhost:5173

- Public site: `http://localhost:5173/`
- Admin panel: `http://localhost:5173/#/admin`

### 4. Build for production
```bash
npm run build
```
Output goes to `dist/` — deploy this folder to Vercel, Netlify, Cloudflare Pages, or any static host.

---

## 🔧 Configuration

All config is in `.env.local` (committed with the pre-filled values for convenience):

| Variable | Value |
|---|---|
| `VITE_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `VITE_APPWRITE_PROJECT_ID` | `6a8bb200003e1fcd3d26` |
| `VITE_APPWRITE_DATABASE_ID` | `school_db` |
| `VITE_APPWRITE_BUCKET_ID` | `school_assets` |
| `APPWRITE_API_KEY` (server-only, used by `setup-appwrite.js`) | (pre-filled) |

**Never** expose the `APPWRITE_API_KEY` to browser code. It is intentionally not prefixed with `VITE_` so Vite never bundles it.

---

## 📁 Project Structure

```
.
├── setup-appwrite.js          # One-shot Appwrite provisioning script (Node SDK)
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                # Vercel deployment config
├── netlify.toml               # Netlify deployment config
├── .env.local                 # Pre-populated env vars
├── .env.example
└── src/
    ├── main.jsx               # React entry point
    ├── App.jsx                # Hash router (/#/admin → admin, else public)
    ├── index.css              # Tailwind + custom gov theme
    ├── lib/
    │   └── appwrite.js        # All Appwrite client helpers + admin CRUD
    ├── context/
    │   └── AppContext.jsx     # Auth, global data, language/high-contrast state
    ├── components/
    │   ├── Navbar.jsx
    │   ├── Hero.jsx
    │   ├── NoticeTicker.jsx
    │   ├── About.jsx
    │   ├── PrincipalDesk.jsx
    │   ├── Teachers.jsx
    │   ├── Gallery.jsx
    │   ├── NoticeBoard.jsx
    │   ├── Contact.jsx
    │   ├── Footer.jsx
    │   ├── ScrollProgress.jsx
    │   └── Link.jsx
    └── admin/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── NoticesManager.jsx
        ├── TeachersManager.jsx
        ├── GalleryManager.jsx
        └── SettingsManager.jsx
```

---

## 🚢 Deployment

### Vercel
- `vercel.json` is pre-configured. Just import the repo.
- Build command: `npm run build` → Output: `dist/`

### Netlify
- `netlify.toml` is pre-configured with SPA redirects.
- Build command: `npm run build` → Publish: `dist/`

### Any static host
Upload the contents of `dist/` after `npm run build`.

---

## 🔒 Security Notes

- The **server API key** in `.env.local` is used *only* by the one-time setup script. It never ships to the browser.
- The public site uses Appwrite's Web SDK with **public-read** permissions; only authenticated users (admins) can write.
- **Disable public registration** in Appwrite Console → Auth → Settings so random visitors cannot create accounts.
- Change the default admin password immediately after first login.

---

## 📝 Default Admin Credentials (change after first login!)
- **Email**: `admin@school.local`
- **Password**: `Admin@12345`

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, Framer Motion, react-hot-toast
- **Icons**: Lucide React
- **Backend**: Appwrite Cloud (Frankfurt region)
- **Deployment-ready**: Vercel (`vercel.json`) + Netlify (`netlify.toml`) configs included
