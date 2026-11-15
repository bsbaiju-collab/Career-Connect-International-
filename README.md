# CareerConnect India — starter portal

A responsive React/Vite front-end prototype for a free, nationwide jobs and internships portal.

## Current prototype features
- Responsive homepage and navigation
- Search by keyword and location
- Category and opportunity-type filters
- Job detail view
- Employer vacancy submission form
- Sample vacancy persistence in the current browser using `localStorage`

## Important limitations
This is a **front-end prototype**, not a live job portal yet.
- The job cards are illustrative sample listings, not verified vacancies.
- A vacancy submitted in the demo is saved only in that browser and is not visible to other users.
- Login, student accounts, employer accounts, shared database, resume uploads, email alerts, moderation and admin roles are not connected yet.
- Do not collect or upload real candidate personal information until authentication, database access policies and privacy notices are implemented.

## Run locally
Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Build for deployment
```bash
npm run build
```
The production site is generated in `dist/`.

## Recommended production architecture
- Frontend: React + Vite
- Hosting: Cloudflare Pages
- Database and authentication: Supabase
- File storage: Supabase Storage (private buckets for CVs)
- Email: a free-tier transactional email provider, subject to its current limits

## Production milestones
1. Create Supabase project and schema for profiles, employers, jobs, applications and reports.
2. Add Supabase Auth with separate candidate, employer and administrator roles.
3. Enforce Row Level Security (RLS) on every table.
4. Add employer vacancy submission with `pending` status.
5. Add admin approval/rejection workflow; only approved jobs are public.
6. Add private CV storage with signed, time-limited access and explicit candidate consent.
7. Add application tracking, moderation, abuse reporting and privacy/terms pages.
8. Deploy to Cloudflare Pages and connect a domain if desired.

## Suggested initial job status values
`draft`, `pending`, `approved`, `rejected`, `expired`, `suspended`

## Suggested user roles
`candidate`, `employer`, `moderator`, `admin`

## Before public launch
- Publish Privacy Policy, Terms of Use and Employer Posting Guidelines.
- Establish a job-verification process and reporting channel.
- Collect only necessary personal data.
- Provide account deletion and data correction workflows.
- Review applicable Indian privacy and IT requirements.

## Supabase schema starter
A preliminary SQL schema and row-level security policies are included at `supabase/schema.sql`. Review and test these policies in a separate development project before using real user data. Admin/moderator policies and private CV storage policies still need to be implemented and tested.
