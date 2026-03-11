import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const PINK = '#e91e8c'
const DARK = '#0f172a'
const MID  = '#475569'
const LIGHT = '#94a3b8'
const BORDER = '#e2e8f0'
const BG = '#f8fafc'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: PINK,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: { width: 64, height: 64, marginRight: 14 },
  clinicBlock: { flex: 1 },
  clinicName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: PINK, marginBottom: 1 },
  clinicTagline: { fontSize: 7.5, color: LIGHT, marginBottom: 3, fontStyle: 'italic' },
  clinicDetails: { fontSize: 7.5, color: MID, lineHeight: 1.6 },
  reportCol: { alignItems: 'flex-end' },
  reportTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  reportMeta: { fontSize: 7.5, color: LIGHT, textAlign: 'right', lineHeight: 1.6 },

  // ── Patient card ──
  patientCard: {
    backgroundColor: BG,
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 20,
  },
  patientCol: { flex: 1 },
  sectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  patientName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 5 },
  infoRow: { flexDirection: 'row', marginBottom: 2 },
  infoLabel: { fontSize: 8, color: LIGHT, width: 68 },
  infoValue: { fontSize: 8, color: DARK, fontFamily: 'Helvetica-Bold', flex: 1 },

  // ── Summary bar ──
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: PINK,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  summaryDesc: { fontSize: 7, color: '#fce7f3', marginTop: 1 },
  summaryDivider: { width: 1, backgroundColor: '#f472b6', marginHorizontal: 6 },

  // ── Visit card ──
  visitCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: 'hidden',
  },
  visitHeader: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  visitIndex: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: PINK, marginRight: 8 },
  visitDate:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK, flex: 1 },
  visitMeta:  { fontSize: 8, color: MID },
  visitBody: { padding: 10 },

  fieldBox: { marginBottom: 7 },
  fieldLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  fieldValue: { fontSize: 8.5, color: '#1e293b', lineHeight: 1.5 },

  vitalsRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  vitalItem: { flex: 1 },

  // ── Services list (no pricing) ──
  servicesList: { marginTop: 6 },
  servicesHeader: {
    backgroundColor: BG,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  servicesHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    textTransform: 'uppercase',
  },
  serviceRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  serviceRowAlt: { backgroundColor: '#fafafa' },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 5,
  },
  footerLeft: { flex: 1, fontSize: 7, color: LIGHT },
  footerRight: { fontSize: 7, color: LIGHT },

  noVisits: { textAlign: 'center', color: LIGHT, fontSize: 10, marginTop: 24 },
  confidential: {
    fontSize: 7,
    color: LIGHT,
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(date: string | null) {
  if (!date) return '—'
  try { return new Date(date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return String(date) }
}

function calcAge(dob: string | null) {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let y = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() - birth.getMonth() < 0 || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) y--
  return `${y} yr`
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  patient: any
  visits: any[]
  fromDate: string | null
  toDate: string | null
  generatedAt: string
  logoDataUrl?: string | null
}

export default function MedicalHistoryPDF({ patient, visits, fromDate, toDate, generatedAt, logoDataUrl }: Props) {
  const generatedStr = new Date(generatedAt).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const dateRangeStr = fromDate || toDate
    ? `${fromDate ? fmt(fromDate) : 'All time'} – ${toDate ? fmt(toDate) : 'Present'}`
    : 'Complete medical history'

  return (
    <Document title={`Medical History — ${patient.name}`} author="RehabVet Veterinary Rehabilitation Centre">
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {logoDataUrl && <Image style={styles.logo} src={logoDataUrl} />}
          <View style={styles.clinicBlock}>
            <Text style={styles.clinicName}>RehabVet</Text>
            <Text style={styles.clinicTagline}>Proven steps to pain free mobility</Text>
            <Text style={styles.clinicDetails}>
              513 Serangoon Road, #01-01, Singapore 218154{'\n'}
              Tel: 6291 6881  ·  WhatsApp: +65 8798 7554  ·  hello@rehabvet.com
            </Text>
          </View>
          <View style={styles.reportCol}>
            <Text style={styles.reportTitle}>Medical History Report</Text>
            <Text style={styles.reportMeta}>{dateRangeStr}{'\n'}Generated: {generatedStr}</Text>
          </View>
        </View>

        {/* ── Patient info ── */}
        <View style={styles.patientCard}>
          <View style={styles.patientCol}>
            <Text style={styles.sectionLabel}>Patient</Text>
            <Text style={styles.patientName}>{patient.name}</Text>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Species:</Text><Text style={styles.infoValue}>{patient.species || '—'}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Breed:</Text><Text style={styles.infoValue}>{patient.breed || '—'}</Text></View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>
                {patient.gender ? (patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)) : '—'}
                {patient.neutered ? ' (Neutered)' : ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth:</Text>
              <Text style={styles.infoValue}>
                {fmt(patient.date_of_birth)}{patient.date_of_birth && calcAge(patient.date_of_birth) ? ` (${calcAge(patient.date_of_birth)})` : ''}
              </Text>
            </View>
            {patient.microchip && (
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Microchip:</Text><Text style={styles.infoValue}>{patient.microchip}</Text></View>
            )}
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.sectionLabel}>Owner</Text>
            <Text style={[styles.infoValue, { fontSize: 11, marginBottom: 5 }]}>{patient.client_name || '—'}</Text>
            {patient.client_phone && <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone:</Text><Text style={styles.infoValue}>{patient.client_phone}</Text></View>}
            {patient.client_email && <View style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{patient.client_email}</Text></View>}
          </View>
        </View>

        {/* ── Summary bar ── */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{visits.length}</Text>
            <Text style={styles.summaryDesc}>Total Visits</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{visits.length > 0 ? fmt(visits[0].visit_date) : '—'}</Text>
            <Text style={styles.summaryDesc}>First Visit</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{visits.length > 0 ? fmt(visits[visits.length - 1].visit_date) : '—'}</Text>
            <Text style={styles.summaryDesc}>Latest Visit</Text>
          </View>
        </View>

        {/* ── Visits ── */}
        {visits.length === 0 ? (
          <Text style={styles.noVisits}>No visits found for this date range.</Text>
        ) : (
          visits.map((visit: any, i: number) => {
            const services: any[] = visit.lineItems || []
            return (
              <View key={visit.id || i} style={styles.visitCard} wrap={false}>
                {/* Visit header */}
                <View style={styles.visitHeader}>
                  <Text style={styles.visitIndex}>#{i + 1}</Text>
                  <Text style={styles.visitDate}>{fmt(visit.visit_date)}</Text>
                  {visit.visit_number && <Text style={styles.visitMeta}>{visit.visit_number}{'   '}</Text>}
                  {visit.staff_name && <Text style={styles.visitMeta}>Seen by: {visit.staff_name}</Text>}
                </View>

                <View style={styles.visitBody}>
                  {/* Vitals */}
                  {(visit.weight_kg || visit.temperature_c) && (
                    <View style={styles.vitalsRow}>
                      {visit.weight_kg != null && (
                        <View style={styles.vitalItem}>
                          <Text style={styles.fieldLabel}>Weight</Text>
                          <Text style={styles.fieldValue}>{visit.weight_kg} kg</Text>
                        </View>
                      )}
                      {visit.temperature_c != null && (
                        <View style={styles.vitalItem}>
                          <Text style={styles.fieldLabel}>Temperature</Text>
                          <Text style={styles.fieldValue}>{visit.temperature_c} °C</Text>
                        </View>
                      )}
                      <View style={{ flex: 3 }} />
                    </View>
                  )}

                  {/* Clinical fields */}
                  {visit.history && (
                    <View style={styles.fieldBox}>
                      <Text style={styles.fieldLabel}>History / Presenting Complaint</Text>
                      <Text style={styles.fieldValue}>{visit.history}</Text>
                    </View>
                  )}
                  {visit.clinical_examination && (
                    <View style={styles.fieldBox}>
                      <Text style={styles.fieldLabel}>Clinical Examination</Text>
                      <Text style={styles.fieldValue}>{visit.clinical_examination}</Text>
                    </View>
                  )}
                  {visit.treatment && (() => {
                    let t = visit.treatment
                    try { const a = JSON.parse(t); if (Array.isArray(a)) t = a.join(', ') } catch {}
                    return t ? (
                      <View style={styles.fieldBox}>
                        <Text style={styles.fieldLabel}>Treatment</Text>
                        <Text style={styles.fieldValue}>{t}</Text>
                      </View>
                    ) : null
                  })()}
                  {visit.internal_notes && (
                    <View style={styles.fieldBox}>
                      <Text style={styles.fieldLabel}>Notes</Text>
                      <Text style={styles.fieldValue}>{visit.internal_notes}</Text>
                    </View>
                  )}

                  {/* Services (name only, no pricing) */}
                  {services.length > 0 && (
                    <View style={styles.servicesList}>
                      <View style={styles.servicesHeader}>
                        <Text style={styles.servicesHeaderText}>Services / Treatments Provided</Text>
                      </View>
                      {services.map((s: any, j: number) => (
                        <View key={j} style={[styles.serviceRow, j % 2 === 1 ? styles.serviceRowAlt : {}]}>
                          <Text style={[styles.fieldValue, { flex: 1 }]}>{s.description || '—'}</Text>
                          {s.quantity && Number(s.quantity) > 1 && (
                            <Text style={[styles.fieldValue, { color: MID }]}>×{s.quantity}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )
          })
        )}

        <Text style={styles.confidential}>This document is confidential and intended for veterinary use only.</Text>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>RehabVet Veterinary Rehabilitation Centre  ·  513 Serangoon Road, #01-01, Singapore 218154  ·  Tel: 6291 6881</Text>
          <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
