// Centralized DB schema creation (idempotent)
// Keep in sync with scripts/seed.js

export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','vet','therapist','receptionist')),
    phone TEXT,
    specializations TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id),
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    date_of_birth TEXT,
    weight REAL,
    sex TEXT CHECK(sex IN ('male','female','neutered_male','spayed_female')),
    microchip TEXT,
    medical_history TEXT,
    allergies TEXT,
    notes TEXT,
    photo_url TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS treatment_plans (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    created_by TEXT REFERENCES users(id),
    approved_by TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    diagnosis TEXT,
    goals TEXT,
    modalities TEXT,
    frequency TEXT,
    total_sessions INTEGER,
    completed_sessions INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending_approval','active','completed','discontinued')),
    start_date TEXT,
    end_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    therapist_id TEXT REFERENCES users(id),
    treatment_plan_id TEXT REFERENCES treatment_plans(id),
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    modality TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','in_progress','completed','cancelled','no_show')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    appointment_id TEXT REFERENCES appointments(id),
    patient_id TEXT NOT NULL REFERENCES patients(id),
    therapist_id TEXT NOT NULL REFERENCES users(id),
    treatment_plan_id TEXT REFERENCES treatment_plans(id),
    date TEXT NOT NULL,
    modality TEXT NOT NULL,
    duration_minutes INTEGER,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    pain_score INTEGER CHECK(pain_score BETWEEN 0 AND 10),
    mobility_score INTEGER CHECK(mobility_score BETWEEN 0 AND 10),
    progress_notes TEXT,
    measurements TEXT,
    exercises TEXT,
    home_exercises TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL REFERENCES clients(id),
    patient_id TEXT REFERENCES patients(id),
    date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    amount_paid REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','partial','overdue','cancelled')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    modality TEXT,
    session_id TEXT REFERENCES sessions(id),
    quantity INTEGER DEFAULT 1,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id),
    amount REAL NOT NULL,
    method TEXT CHECK(method IN ('cash','card','bank_transfer','paynow','other')),
    reference TEXT,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    uploaded_by TEXT REFERENCES users(id),
    filename TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_path TEXT NOT NULL,
    category TEXT CHECK(category IN ('xray','lab_report','photo','document','video','other')),
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_patients_client ON patients(client_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
  CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_patient ON sessions(patient_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
  CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
  CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);

  CREATE TABLE IF NOT EXISTS treatment_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    color TEXT DEFAULT 'bg-gray-400',
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;
