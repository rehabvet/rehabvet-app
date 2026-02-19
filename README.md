# RehabVet Clinic Management System

Practice management web application for **RehabVet** — Singapore's first veterinary rehabilitation, physiotherapy, and hydrotherapy clinic.

Built specifically for **rehabilitation clinic workflow**: multi-session treatment plans, progress tracking with pain/mobility scores, SOAP notes, and modality-specific scheduling.

## Quick Start

```bash
# Install dependencies
npm install

# Seed the database with demo data
npm run db:seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Office Manager (Admin) | catherine@rehabvet.com | password123 |
| Veterinarian | sarah@rehabvet.com | password123 |
| Therapist | michelle@rehabvet.com | password123 |

All 14 staff accounts use password `password123`.

## Features

### Core Modules

- **Dashboard** — Today's appointments, recent sessions, key metrics at a glance
- **Calendar** — Monthly view with color-coded modalities, click to drill into daily appointments
- **Appointments** — Schedule sessions, manage status (scheduled → confirmed → in progress → completed), conflict detection
- **Clients** — Pet owner profiles with contact details, linked pets, invoice history
- **Patients** — Pet profiles with species, breed, weight, medical history, allergies, microchip
- **Treatment Plans** — Multi-session rehab programs with diagnosis, goals, modality selection, progress tracking, vet approval workflow
- **Sessions** — SOAP notes (Subjective/Objective/Assessment/Plan), pain scores, mobility scores, progress tracking
- **Billing** — Invoice creation with line items, GST calculation, payment recording (cash, card, bank transfer, PayNow)
- **Reports** — Revenue analytics, sessions by modality, patient outcomes, staff utilization
- **Staff** — Team directory with roles and specializations

### Rehabilitation-Specific

- **Modalities**: Physiotherapy, Hydrotherapy, Acupuncture, HBOT, Chiropractic, TCM, Laser Therapy, Electrotherapy
- **Progress Tracking**: Pain scores (0-10) and mobility scores (0-10) with visual progress bars
- **Treatment Plans**: Multi-session programs with session counting, progress percentage, and vet approval
- **SOAP Notes**: Structured clinical documentation per session

### Role-Based Access

| Feature | Admin | Vet | Therapist | Receptionist |
|---------|-------|-----|-----------|--------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Calendar & Appointments | ✅ | ✅ | ✅ (own only) | ✅ |
| Clients & Patients | ✅ | ✅ | ✅ | ✅ |
| Treatment Plans | ✅ | ✅ (can approve) | ✅ (create as pending) | — |
| Sessions | ✅ | ✅ | ✅ (log own) | — |
| Billing | ✅ | — | — | ✅ |
| Reports | ✅ | ✅ | — | — |
| Staff Management | ✅ | — | — | — |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT with httpOnly cookies
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Authenticated pages
│   │   ├── dashboard/        # Main dashboard
│   │   ├── calendar/         # Monthly calendar
│   │   ├── appointments/     # Appointment management
│   │   ├── clients/          # Client CRUD + detail
│   │   ├── patients/         # Patient CRUD + detail
│   │   ├── treatment-plans/  # Plan CRUD + detail + approval
│   │   ├── sessions/         # Session logging (SOAP)
│   │   ├── billing/          # Invoice CRUD + payments
│   │   ├── reports/          # Analytics dashboard
│   │   └── staff/            # Staff directory
│   ├── api/                  # REST API routes
│   │   ├── auth/             # Login, logout, me
│   │   ├── clients/          # Client CRUD
│   │   ├── patients/         # Patient CRUD
│   │   ├── appointments/     # Appointment CRUD
│   │   ├── treatment-plans/  # Plan CRUD + approval
│   │   ├── sessions/         # Session CRUD
│   │   ├── invoices/         # Invoice CRUD + payments
│   │   ├── staff/            # Staff list
│   │   ├── reports/          # Analytics queries
│   │   └── dashboard/        # Dashboard stats
│   └── login/                # Login page
├── components/               # Shared components
├── lib/
│   ├── auth.ts               # JWT auth utilities
│   ├── db.ts                 # SQLite connection
│   └── utils.ts              # Helpers, constants
data/
├── rehabvet.db               # SQLite database (auto-created)
scripts/
└── seed.js                   # Database seeder
```

## Database Schema

**14 staff** (3 vets, 10 therapists, 1 office manager) are seeded by default, along with sample clients, patients, treatment plans, appointments, sessions, and invoices.

Key tables:
- `users` — Staff with roles (admin/vet/therapist/receptionist)
- `clients` — Pet owners
- `patients` — Pets linked to clients
- `treatment_plans` — Multi-session rehab programs with approval workflow
- `appointments` — Scheduled sessions with conflict detection
- `sessions` — Completed session records with SOAP notes
- `invoices` / `invoice_items` — Billing with line items and GST
- `payments` — Payment records (cash, card, bank transfer, PayNow)
- `documents` — File uploads (X-rays, lab reports, photos)

## Deployment (Local Mac mini)

Currently configured for local deployment at `192.168.1.130`:

```bash
# Production build
npm run build

# Start production server
npm start

# Or run on a specific port
PORT=3000 npm start
```

### Run as background service (launchd)

```bash
# Create a plist for auto-start
cat > ~/Library/LaunchAgents/com.rehabvet.app.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.rehabvet.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>node_modules/.bin/next</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/marcus/.openclaw/workspace/rehabvet-app</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>3000</string>
        <key>JWT_SECRET</key>
        <string>your-production-secret-here</string>
    </dict>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.rehabvet.app.plist
```

### Access from other devices on the network

The app will be accessible at `http://192.168.1.130:3000` from any device on the same network (tablets, phones, etc).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `JWT_SECRET` | dev default | Token signing secret (change in production!) |

## Future Enhancements

- [ ] Payment gateway integration (Stripe/PayNow QR)
- [ ] Email/SMS appointment reminders
- [ ] Client portal (pet owners can view progress)
- [ ] File uploads (X-rays, photos, videos)
- [ ] Export reports to PDF/Excel
- [ ] Cloud deployment (Vercel + managed database)
- [ ] Multi-clinic support
- [ ] Inventory management (supplies, medications)

## Branding

Colors match RehabVet's identity:
- **Pink/Magenta** (#D6336C) — "Rehab" text, primary actions
- **Gold/Amber** (#F59F00) — "Vet" text, accents
- **Dark Navy** (#1a1a2e) — Login background

Logo: Heart icon with pink/gold color scheme matching rehabvet.com
