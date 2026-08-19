# Govt. Boys H. S. School Cantt, Guna

One React/Vite repository and one Vercel deployment containing:

- Public website: `/#/` (or `/`)
- Admin CMS: `/#/admin-lakshya`
- Backend: Appwrite Cloud Authentication, Database, Realtime and Storage

## Local development

```bash
npm install
cp .env.example .env
# Fill the four Appwrite public identifiers
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Node.js 20+ is recommended (`.nvmrc` is included).

## Appwrite setup

The browser cannot securely create Appwrite databases or buckets because that
requires a server API key. No API key is included in this repository.

Create the resources once using Appwrite Console. The exact collection,
attribute, index, permission and bucket specification is in:

- `appwrite/schema.json`
- `appwrite/SETUP.md`

Create trusted administrators under **Auth → Users** and disable public user
registration. Login uses Appwrite email/password sessions. No admin password is
stored in source code, environment variables or localStorage.

## Environment variables

```env
VITE_APPWRITE_ENDPOINT=
VITE_APPWRITE_PROJECT_ID=
VITE_APPWRITE_DATABASE_ID=
VITE_APPWRITE_BUCKET_ID=
```

These are public Web SDK identifiers. Never expose an Appwrite API key or
server secret in a `VITE_*` variable.

## CMS data flow

```text
Admin draft
  → validate
  → Appwrite database transaction
  → commit only after every operation succeeds
  → public website realtime refresh
```

Publish deletes and recreates the CMS documents inside an Appwrite transaction.
Until commit, visitors continue seeing the previous complete version. On any
failure the transaction is rolled back and the toast shows the exact failed
collection/document operation.

The public website never uses localStorage for CMS content. Local storage is
used only for language preference, last admin email and local activity display.

## Storage

One bucket: `school-media` (or the ID configured in
`VITE_APPWRITE_BUCKET_ID`). Images are validated, uploaded with progress,
stored as Appwrite file view URLs, and removed only after a successful content
publish no longer references them.

## Permissions

Every CMS collection:

- Public: Read
- Authenticated users: Create, Read, Update, Delete
- Public registration: disabled

Bucket:

- Public: Read
- Authenticated users: Create, Update, Delete
- File security: enabled

## Vercel deployment

1. Import this GitHub repository into Vercel.
2. Framework: Vite; build command: `npm run build`; output: `dist`.
3. Add all four `VITE_APPWRITE_*` variables for Development, Preview and
   Production.
4. Add the Vercel domain as an Appwrite Web platform hostname.
5. Redeploy without stale build cache after changing variables.

Hash routing requires no SPA rewrite.

## GitHub commands

```bash
git init
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git add .
git commit -m "Initial production CMS"
git push -u origin main
```

## Folder structure

```text
src/components/       Public website UI
src/cms/              Admin CMS UI and context
src/cms/lib/appwrite  One Appwrite client
src/cms/lib/repository.ts  Database read/publish transaction
src/cms/lib/storage.ts     Appwrite Storage operations
appwrite/             Backend schema and setup guide
```

## Security notes

- No API secret is committed or exposed to the browser.
- React does not render user content through `dangerouslySetInnerHTML`.
- Uploads accept images only and enforce a 10 MB client limit; configure the
  same restrictions on the bucket.
- Public visitors receive no create/update/delete permissions.
- Global Error Boundary and explicit backend error states prevent white pages
  and fake success messages.