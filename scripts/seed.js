const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, '..', 'data', 'rehabvet.db')
const dir = path.dirname(DB_PATH)
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Create tables
db.exec(`
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
`)

const hash = bcrypt.hashSync('password123', 10)
const adminHash = bcrypt.hashSync('2809Leonie!', 10)

const staff = [
  // Veterinarians
  { name: 'Dr. Sara Lam', email: 'sara@rehabvet.com', role: 'vet', phone: '+65 6291 6881', specializations: '["Physiotherapy","Acupuncture","CCRT","CVA","Rehabilitation"]' },
  // Veterinary Technician
  { name: 'Xan Chuah Yee Chien', email: 'xan@rehabvet.com', role: 'vet', phone: '+65 6291 6881', specializations: '["Veterinary Medicine","Holistic Medicine"]' },
  // Therapists
  { name: 'Sean Tan', email: 'sean@rehabvet.com', role: 'therapist', phone: '+65 6291 6881', specializations: '["Hydrotherapy","Equine Rehabilitation","Canine Rehabilitation"]' },
  { name: 'Joyce Ho', email: 'joyce@rehabvet.com', role: 'therapist', phone: '+65 6291 6881', specializations: '["Hydrotherapy","Animal Rehabilitation"]' },
  { name: 'Hazel Lim', email: 'hazel@rehabvet.com', role: 'therapist', phone: '+65 6291 6881', specializations: '["Animal Rehabilitation"]' },
  { name: 'Noelle Lim', email: 'noelle@rehabvet.com', role: 'therapist', phone: '+65 6291 6881', specializations: '["Animal Rehabilitation","Pet Handling"]' },
  { name: 'Claire', email: 'claire@rehabvet.com', role: 'therapist', phone: '+65 6291 6881', specializations: '["Animal Rehabilitation"]' },
  // Office Manager (admin)
  { name: 'Admin', email: 'admin@rehabvet.com', role: 'admin', phone: '+65 6291 6881', specializations: '[]', useAdminHash: true },
]

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, email, password_hash, name, role, phone, specializations)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const userIds = {}
for (const s of staff) {
  const id = uuidv4()
  insertUser.run(id, s.email, s.useAdminHash ? adminHash : hash, s.name, s.role, s.phone, s.specializations)
  userIds[s.email] = id
}

// Sample clients and patients
const clients = [
  { name: 'Tan Wei Ming', email: 'weiming@gmail.com', phone: '+65 8111 2001', address: '123 Bukit Timah Rd, Singapore 259874' },
  { name: 'Linda Chua', email: 'lindachua@yahoo.com', phone: '+65 8111 2002', address: '45 Orchard Rd, Singapore 238867' },
  { name: 'Raj Kumar', email: 'raj.kumar@gmail.com', phone: '+65 8111 2003', address: '78 Serangoon Ave 3, Singapore 556106' },
  { name: 'Emily Ang', email: 'emilyang@hotmail.com', phone: '+65 8111 2004', address: '90 Tampines St 11, Singapore 521090' },
  { name: 'Michael Soh', email: 'msoh@gmail.com', phone: '+65 8111 2005', address: '12 Holland Rd, Singapore 278947' },
]

const insertClient = db.prepare(`
  INSERT OR IGNORE INTO clients (id, name, email, phone, address)
  VALUES (?, ?, ?, ?, ?)
`)

const clientIds = []
for (const c of clients) {
  const id = uuidv4()
  insertClient.run(id, c.name, c.email, c.phone, c.address)
  clientIds.push(id)
}

const patients = [
  { clientIdx: 0, name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', dob: '2019-03-15', weight: 32.5, sex: 'neutered_male', history: 'ACL surgery 2024, post-op rehab required' },
  { clientIdx: 0, name: 'Mochi', species: 'Cat', breed: 'British Shorthair', dob: '2020-06-20', weight: 5.2, sex: 'spayed_female', history: 'Arthritis in hind legs' },
  { clientIdx: 1, name: 'Max', species: 'Dog', breed: 'German Shepherd', dob: '2017-11-10', weight: 38.0, sex: 'male', history: 'Degenerative myelopathy, mobility declining' },
  { clientIdx: 2, name: 'Luna', species: 'Dog', breed: 'Poodle', dob: '2021-01-05', weight: 8.3, sex: 'spayed_female', history: 'Luxating patella surgery, needs physio' },
  { clientIdx: 3, name: 'Cookie', species: 'Dog', breed: 'Corgi', dob: '2018-08-22', weight: 12.1, sex: 'neutered_male', history: 'IVDD, recovered with conservative treatment' },
  { clientIdx: 4, name: 'Shadow', species: 'Cat', breed: 'Siamese', dob: '2016-04-30', weight: 4.8, sex: 'male', history: 'Senior cat with chronic pain, acupuncture maintenance' },
]

const insertPatient = db.prepare(`
  INSERT OR IGNORE INTO patients (id, client_id, name, species, breed, date_of_birth, weight, sex, medical_history)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const patientIds = []
for (const p of patients) {
  const id = uuidv4()
  insertPatient.run(id, clientIds[p.clientIdx], p.name, p.species, p.breed, p.dob, p.weight, p.sex, p.history)
  patientIds.push(id)
}

// Sample treatment plans
const insertPlan = db.prepare(`
  INSERT OR IGNORE INTO treatment_plans (id, patient_id, created_by, approved_by, title, diagnosis, goals, modalities, frequency, total_sessions, completed_sessions, status, start_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const vetId = userIds['sarah@rehabvet.com']
const therapistId = userIds['michelle@rehabvet.com']

const planId1 = uuidv4()
insertPlan.run(planId1, patientIds[0], vetId, vetId,
  'Post-ACL Rehabilitation Program',
  'Right cranial cruciate ligament rupture, post TPLO surgery',
  'Restore full range of motion, rebuild muscle mass, return to normal activity',
  '["Hydrotherapy","Physiotherapy","Laser Therapy"]',
  '2x per week', 16, 6, 'active', '2026-01-06')

const planId2 = uuidv4()
insertPlan.run(planId2, patientIds[2], vetId, vetId,
  'Degenerative Myelopathy Management',
  'Degenerative myelopathy - progressive',
  'Maintain mobility, slow progression, manage pain',
  '["Hydrotherapy","Acupuncture","Physiotherapy"]',
  '3x per week', 24, 12, 'active', '2025-12-01')

// Sample appointments for this week
const insertAppt = db.prepare(`
  INSERT OR IGNORE INTO appointments (id, patient_id, client_id, therapist_id, treatment_plan_id, date, start_time, end_time, modality, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const today = new Date()
const dates = []
for (let i = 0; i < 5; i++) {
  const d = new Date(today)
  d.setDate(d.getDate() + i)
  dates.push(d.toISOString().split('T')[0])
}

const apptData = [
  { patientIdx: 0, clientIdx: 0, therapist: 'michelle@rehabvet.com', plan: planId1, dateIdx: 0, start: '09:00', end: '09:45', modality: 'Hydrotherapy', status: 'confirmed' },
  { patientIdx: 2, clientIdx: 1, therapist: 'david@rehabvet.com', plan: planId2, dateIdx: 0, start: '10:00', end: '10:45', modality: 'Acupuncture', status: 'confirmed' },
  { patientIdx: 3, clientIdx: 2, therapist: 'rachel@rehabvet.com', plan: null, dateIdx: 0, start: '11:00', end: '11:45', modality: 'Physiotherapy', status: 'scheduled' },
  { patientIdx: 0, clientIdx: 0, therapist: 'michelle@rehabvet.com', plan: planId1, dateIdx: 1, start: '09:00', end: '09:45', modality: 'Physiotherapy', status: 'scheduled' },
  { patientIdx: 4, clientIdx: 3, therapist: 'ahmad@rehabvet.com', plan: null, dateIdx: 1, start: '14:00', end: '14:45', modality: 'Hydrotherapy', status: 'scheduled' },
  { patientIdx: 5, clientIdx: 4, therapist: 'kevin@rehabvet.com', plan: null, dateIdx: 2, start: '10:00', end: '10:30', modality: 'Acupuncture', status: 'scheduled' },
  { patientIdx: 1, clientIdx: 0, therapist: 'lisa@rehabvet.com', plan: null, dateIdx: 2, start: '15:00', end: '15:45', modality: 'Laser Therapy', status: 'scheduled' },
  { patientIdx: 2, clientIdx: 1, therapist: 'michelle@rehabvet.com', plan: planId2, dateIdx: 3, start: '09:00', end: '09:45', modality: 'Hydrotherapy', status: 'scheduled' },
]

for (const a of apptData) {
  insertAppt.run(uuidv4(), patientIds[a.patientIdx], clientIds[a.clientIdx],
    userIds[a.therapist], a.plan, dates[a.dateIdx], a.start, a.end, a.modality, a.status)
}

// Sample completed sessions with SOAP notes
const insertSession = db.prepare(`
  INSERT OR IGNORE INTO sessions (id, appointment_id, patient_id, therapist_id, treatment_plan_id, date, modality, duration_minutes, subjective, objective, assessment, plan, pain_score, mobility_score, progress_notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

for (let i = 1; i <= 6; i++) {
  const d = new Date(today)
  d.setDate(d.getDate() - (i * 3))
  insertSession.run(uuidv4(), null, patientIds[0], userIds['michelle@rehabvet.com'], planId1,
    d.toISOString().split('T')[0], i % 2 === 0 ? 'Hydrotherapy' : 'Physiotherapy', 45,
    'Owner reports improved weight bearing on right hind. More willing to walk.',
    `ROM right stifle: flexion ${120 + i*2}°, extension ${155 + i}°. Muscle mass right thigh: ${28 + i*0.5}cm.`,
    `Session ${i}/16. Steady improvement in ROM and muscle mass. Gait improving.`,
    'Continue current protocol. Increase treadmill speed next session.',
    Math.max(2, 6 - i), Math.min(9, 4 + i),
    `Good progress. Pain decreasing, mobility improving session over session.`)
}

// Sample invoices
const insertInvoice = db.prepare(`
  INSERT OR IGNORE INTO invoices (id, invoice_number, client_id, patient_id, date, due_date, subtotal, tax, total, amount_paid, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const insertItem = db.prepare(`
  INSERT OR IGNORE INTO invoice_items (id, invoice_id, description, modality, quantity, unit_price, total)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const inv1 = uuidv4()
insertInvoice.run(inv1, 'RV-2026-001', clientIds[0], patientIds[0], '2026-02-01', '2026-02-15', 540, 37.80, 577.80, 577.80, 'paid')
insertItem.run(uuidv4(), inv1, 'Hydrotherapy Session x3', 'Hydrotherapy', 3, 120, 360)
insertItem.run(uuidv4(), inv1, 'Physiotherapy Session x2', 'Physiotherapy', 2, 90, 180)

const inv2 = uuidv4()
insertInvoice.run(inv2, 'RV-2026-002', clientIds[1], patientIds[2], '2026-02-10', '2026-02-24', 780, 54.60, 834.60, 400, 'partial')
insertItem.run(uuidv4(), inv2, 'Hydrotherapy Session x4', 'Hydrotherapy', 4, 120, 480)
insertItem.run(uuidv4(), inv2, 'Acupuncture Session x3', 'Acupuncture', 3, 100, 300)

const inv3 = uuidv4()
insertInvoice.run(inv3, 'RV-2026-003', clientIds[2], patientIds[3], '2026-02-15', '2026-03-01', 270, 18.90, 288.90, 0, 'sent')
insertItem.run(uuidv4(), inv3, 'Physiotherapy Session x3', 'Physiotherapy', 3, 90, 270)

// Sample payments
const insertPayment = db.prepare(`
  INSERT OR IGNORE INTO payments (id, invoice_id, amount, method, reference, date)
  VALUES (?, ?, ?, ?, ?, ?)
`)
insertPayment.run(uuidv4(), inv1, 577.80, 'paynow', 'PN-20260201-001', '2026-02-01')
insertPayment.run(uuidv4(), inv2, 400, 'card', 'VISA-****-1234', '2026-02-10')

// Treatment types
const insertTreatment = db.prepare(`
  INSERT OR IGNORE INTO treatment_types (id, name, category, duration, color, sort_order)
  VALUES (?, ?, ?, ?, ?, ?)
`)
const treatmentTypes = [
  // Uncategorized
  { name: 'Lunch', category: 'Uncategorized', duration: 60, color: 'bg-gray-400' },
  { name: 'Admin', category: 'Uncategorized', duration: 15, color: 'bg-gray-500' },
  { name: 'On Leave', category: 'Uncategorized', duration: 540, color: 'bg-gray-300' },
  { name: 'OFF', category: 'Uncategorized', duration: 540, color: 'bg-gray-300' },
  { name: 'Half Day Off', category: 'Uncategorized', duration: 240, color: 'bg-gray-400' },
  { name: 'DO NOT BOOK', category: 'Uncategorized', duration: 60, color: 'bg-red-300' },
  // Pet Rehabilitation
  { name: 'Rehabilitation - Hydrotherapy', category: 'Pet Rehabilitation', duration: 60, color: 'bg-cyan-500' },
  { name: 'Animal Rehabilitation - Follow Ups', category: 'Pet Rehabilitation', duration: 60, color: 'bg-blue-400' },
  { name: 'TCM Acupuncture Review', category: 'Pet Rehabilitation', duration: 30, color: 'bg-purple-400' },
  { name: 'TCVM Tui-na and acupuncture', category: 'Pet Rehabilitation', duration: 60, color: 'bg-purple-500' },
  { name: 'Pain Relief', category: 'Pet Rehabilitation', duration: 30, color: 'bg-orange-400' },
  { name: 'House-Call', category: 'Pet Rehabilitation', duration: 90, color: 'bg-teal-500' },
  { name: 'UWTM', category: 'Pet Rehabilitation', duration: 45, color: 'bg-cyan-400' },
  // Other Services
  { name: 'Hyperbaric Oxygen', category: 'Other Services', duration: 60, color: 'bg-orange-500' },
  { name: 'Fitness Swim', category: 'Other Services', duration: 45, color: 'bg-sky-400' },
  // Consultation & Assessment
  { name: 'Orthopedic & Neurological Assessment', category: 'Consultation & Assessment', duration: 60, color: 'bg-green-500' },
  { name: 'TCM Consultation', category: 'Consultation & Assessment', duration: 60, color: 'bg-emerald-500' },
  { name: 'Reassessment', category: 'Consultation & Assessment', duration: 30, color: 'bg-green-400' },
  { name: 'Assessment Fun Swim', category: 'Consultation & Assessment', duration: 30, color: 'bg-sky-500' },
]
let sortOrder = 0
for (const t of treatmentTypes) {
  insertTreatment.run(uuidv4(), t.name, t.category, t.duration, t.color, sortOrder++)
}

console.log('✅ Database seeded successfully!')
console.log(`   ${staff.length} staff members`)
console.log(`   ${clients.length} clients`)
console.log(`   ${patients.length} patients`)
console.log(`   2 treatment plans`)
console.log(`   ${apptData.length} appointments`)
console.log(`   6 session records`)
console.log(`   3 invoices`)
console.log('')
console.log('Login credentials (all accounts):')
console.log('  Password: password123')
console.log('')
console.log('Key accounts:')
console.log('  Admin:     catherine@rehabvet.com')
console.log('  Vet:       sarah@rehabvet.com')
console.log('  Therapist: michelle@rehabvet.com')

db.close()
