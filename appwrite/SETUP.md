# Appwrite Cloud Setup

Create one Appwrite project, one database, and one bucket. Add Web platforms
for `localhost` and the Vercel production domain. Never create a frontend API
key; the Web SDK uses the project ID and Account session.

> Automation: everything below can be checked with `npm run verify:appwrite`
> and created with `npm run setup:appwrite -- --apply`
> (reads a local, git-ignored `.env.setup` containing `APPWRITE_API_KEY`).

## Authentication

Create admin users in **Auth → Users**. Disable public registration in project
Auth settings. The CMS uses email/password sessions; all authenticated users
are considered CMS administrators, so only create trusted users.

## Collection permissions (all collections)

- Document security: **disabled**
- Read: `Role.any()`
- Create/Update/Delete: `Role.users()`

This makes the website public read-only and authenticated admins full CRUD.

## Common attributes (all 18 collections)

| Attribute | Type | Size | Required | Default |
|---|---:|---:|---:|---:|
| revision | string | 36 | yes | — |
| lang | string | 8 | yes | — |
| kind | string | 32 | yes | — |
| payload | string | 100000 | yes | — |
| sortOrder | integer | — | yes | 0 |

Indexes: `revision` key; `[kind, lang]` key; `sortOrder` key.

## Additional attributes

All additional attributes below are optional unless specified.

- **settings**: `publishedAt` string(64)
- **teachers**: `name` string(256), `subject` string(256),
  `qualification` string(256), `experience` string(128),
  `designation` string(256), `photoUrl` URL/string(2048)
- **gallery**: `imageUrl` URL/string(2048), `title` string(256),
  `caption` string(2048), `category` string(128). Index `category`.
- **notices**: `tag` string(128), `displayDate` string(64),
  `title` string(256), `body` string(5000), `pinned` boolean,
  `important` boolean, `status` enum(`draft`,`published`),
  `publishDate` string(32), `expiryDate` string(32). Indexes `status`,
  `pinned`, `publishDate`, `expiryDate`.
- **facilities**: `title` string(256), `description` string(3000),
  `meta` string(128)
- **achievements**: `title` string(256), `description` string(3000),
  `period` string(128), `tag` string(128)
- **vocational_courses**: `courseKey` string(64), `name` string(256),
  `tagline` string(512), `description` string(5000),
  `eligibility` string(1024), `duration` string(256),
  `imageUrl` URL/string(2048). Index `[courseKey, lang]`.
- **vocational_subjects**, **vocational_certificates**,
  **vocational_skills**, **vocational_careers**: `courseKey` string(64),
  `value` string(2048). Index `[courseKey, lang]`.
- **social_links**: `label` string(128), `url` URL/string(2048)

Collections `navigation`, `hero`, `about`, `principal`, `highlights`,
`vocational`, and `footer` need only common attributes.

## Storage bucket

- ID must equal `VITE_APPWRITE_BUCKET_ID` (recommended: `school-media`)
- File security: enabled
- Maximum size: 10 MB
- Extensions: jpg, jpeg, png, webp, gif, svg
- Read: any
- Create/Update/Delete: users

Uploaded files additionally receive public-read and authenticated-user
update/delete permissions from the Web SDK.

## Environment

```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=<PROJECT_ID>
VITE_APPWRITE_DATABASE_ID=<DATABASE_ID>
VITE_APPWRITE_BUCKET_ID=school-media
```

Add the same values in Vercel for Development, Preview and Production, then
redeploy without using an old build cache.