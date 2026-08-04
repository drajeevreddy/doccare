# Endocare — Endocrine Practice Management System

A modern, full-stack medical practice management system built for endocrinology clinics. Streamlines patient care with appointments, prescriptions, billing, laboratory orders, and analytics — all in one place.

## Features

- **Patient Management** — Complete patient records with search, filters, and document uploads
- **Appointments** — Scheduling, calendar view, and ICS export for calendar integration
- **Consultations** — SOAP note forms, prescription builder, and patient summaries
- **Prescriptions** — Digital prescription creation and management
- **Billing** — Invoice generation with line-item tracking
- **Laboratory** — Lab order placement, result tracking, and clinical calculators (ASCVD, eGFR, BMI, HbA1c)
- **Pharmacy** — Medication dispense tracking and inventory
- **Analytics** — Clinical dashboards with blood sugar trends, BMI charts, and more
- **Reminders** — Automated appointment and medication reminders via cron jobs
- **Kiosk Portal** — Self-service check-in for patients
- **Queue Board** — Real-time patient queue and doctor assignment
- **Doctors Schedule** — Provider availability management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via [Supabase](https://supabase.com) |
| Auth | Supabase Auth (email/password + email verification) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + Radix UI |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| PDF/CSV | jsPDF, html2canvas |
| State | Zustand |
| Server State | TanStack React Query |
| Edge Functions | Supabase Edge Functions |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

```bash
# Clone the repo
git clone https://github.com/drajeevreddy/doccare.git
cd doccare

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Migrations

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, signup, forgot/reset password
│   ├── analytics/          # Clinical analytics dashboards
│   ├── appointments/       # Appointment scheduling
│   ├── billing/            # Invoice management
│   ├── consultation/       # SOAP notes & prescriptions
│   ├── dashboard/          # Main dashboard
│   ├── doctors/schedule/   # Provider schedules
│   ├── laboratory/         # Lab orders & results
│   ├── patients/           # Patient records & CRUD
│   ├── pharmacy/           # Medication dispensing
│   ├── portal/             # Patient self-service portal
│   ├── prescriptions/      # Prescription management
│   ├── queue-board/        # Live patient queue
│   ├── reminders/          # Appointment reminders
│   └── settings/           # App configuration
├── components/
│   ├── layout/             # Header, sidebar, shell
│   ├── ui/                 # shadcn/ui primitives
│   └── [domain]/           # Feature-specific components
├── lib/
│   ├── supabase/           # Supabase client, server, middleware
│   ├── calendar.ts         # Calendar helpers
│   ├── export-csv.ts       # CSV export utilities
│   ├── pdf.ts              # PDF generation
│   ├── queries.ts          # Database queries
│   └── utils.ts            # Shared utilities
├── hooks/                  # React hooks
├── stores/                 # Zustand stores
├── types/                  # TypeScript type definitions
└── middleware.ts           # Next.js middleware (auth protection)
supabase/
├── migrations/             # Database schema migrations
└── functions/              # Edge Functions (patient CRUD, appointment manager)
```

## Deployment

Connected to [Vercel](https://vercel.com) for continuous deployment. Push to `main` to trigger an automatic deploy.

## License

Private — all rights reserved.
