import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Image, Font
} from '@react-pdf/renderer'

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#e91e8c',
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: {
    width: 56,
    height: 56,
    marginRight: 14,
  },
  clinicBlock: {
    flex: 1,
  },
  clinicName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#e91e8c',
    marginBottom: 2,
  },
  clinicTagline: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
  },
  clinicDetails: {
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.5,
  },
  reportTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'right',
  },

  // Patient info card
  patientCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 24,
  },
  patientSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 8,
    color: '#64748b',
    width: 70,
  },
  infoValue: {
    fontSize: 8,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  badge: {
    backgroundColor: '#fce7f3',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 7,
    color: '#be185d',
    fontFamily: 'Helvetica-Bold',
  },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#e91e8c',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    gap: 0,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  summaryDesc: {
    fontSize: 7,
    color: '#fce7f3',
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#f472b6',
    marginHorizontal: 8,
  },

  // Visit card
  visitCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  visitHeader: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  visitNumber: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#e91e8c',
    marginRight: 8,
  },
  visitDate: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    flex: 1,
  },
  visitStaff: {
    fontSize: 8,
    color: '#64748b',
  },
  visitBody: {
    padding: 10,
  },
  visitGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  visitGridItem: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 8.5,
    color: '#1e293b',
    lineHeight: 1.5,
  },
  fieldBox: {
    marginBottom: 8,
  },

  // Line items table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 6,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  col_desc: { flex: 3 },
  col_qty:  { width: 30, textAlign: 'center' },
  col_price:{ width: 55, textAlign: 'right' },
  col_total:{ width: 55, textAlign: 'right' },
  tableTotal: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopWidth: 1.5,
    borderTopColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  tableTotalLabel: {
    flex: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
    paddingRight: 8,
  },
  tableTotalValue: {
    width: 55,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
  footerLeft: {
    flex: 1,
    fontSize: 7,
    color: '#94a3b8',
  },
  footerRight: {
    fontSize: 7,
    color: '#94a3b8',
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 8,
  },

  noVisits: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 20,
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmt(date: string | null) {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return date }
}

function fmtMoney(n: number | null) {
  if (n == null) return '—'
  return `S$${Number(n).toFixed(2)}`
}

function calcAge(dob: string | null) {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) years--
  return `${years} yr`
}

// ─── Component ─────────────────────────────────────────────────────────────
interface Props {
  patient: any
  visits: any[]
  fromDate: string | null
  toDate: string | null
  generatedAt: string
  logoDataUrl?: string | null
}

export default function MedicalHistoryPDF({ patient, visits, fromDate, toDate, generatedAt, logoDataUrl }: Props) {
  const totalSpend = visits.reduce((sum: number, v: any) => {
    const vTotal = (v.lineItems || []).reduce((s: number, li: any) => s + Number(li.unit_price || 0) * Number(li.quantity || 1), 0)
    return sum + vTotal
  }, 0)

  const generatedStr = new Date(generatedAt).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const dateRangeStr = fromDate || toDate
    ? `${fromDate ? fmt(fromDate) : 'All time'} – ${toDate ? fmt(toDate) : 'Present'}`
    : 'Complete medical history'

  return (
    <Document
      title={`Medical History — ${patient.name}`}
      author="RehabVet Veterinary Rehabilitation Centre"
      subject="Patient Medical History"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {logoDataUrl && (
            <Image style={styles.logo} src={logoDataUrl} />
          )}
          <View style={styles.clinicBlock}>
            <Text style={styles.clinicName}>RehabVet</Text>
            <Text style={styles.clinicTagline}>Veterinary Rehabilitation Centre</Text>
            <Text style={styles.clinicDetails}>
              513 Serangoon Road, #01-01, Singapore 218154{'  '}|{'  '}Tel: 6291 6881{'  '}|{'  '}WhatsApp: +65 8798 7554{'\n'}
              hello@rehabvet.com{'  '}|{'  '}www.rehabvet.com
            </Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>Medical History Report</Text>
            <Text style={styles.reportSubtitle}>{dateRangeStr}</Text>
            <Text style={[styles.reportSubtitle, { marginTop: 2 }]}>Generated: {generatedStr}</Text>
          </View>
        </View>

        {/* ── Patient Info ── */}
        <View style={styles.patientCard}>
          <View style={styles.patientSection}>
            <Text style={styles.sectionLabel}>Patient</Text>
            <Text style={styles.patientName}>{patient.name}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Species:</Text>
              <Text style={styles.infoValue}>{patient.species || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Breed:</Text>
              <Text style={styles.infoValue}>{patient.breed || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>
                {patient.gender ? (patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)) : '—'}
                {patient.neutered ? ' (Neutered)' : ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth:</Text>
              <Text style={styles.infoValue}>{fmt(patient.date_of_birth)}{patient.date_of_birth && calcAge(patient.date_of_birth) ? ` (${calcAge(patient.date_of_birth)})` : ''}</Text>
            </View>
            {patient.microchip && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Microchip:</Text>
                <Text style={styles.infoValue}>{patient.microchip}</Text>
              </View>
            )}
          </View>
          <View style={styles.patientSection}>
            <Text style={styles.sectionLabel}>Owner</Text>
            <Text style={[styles.infoValue, { fontSize: 11, marginBottom: 4 }]}>{patient.client_name || '—'}</Text>
            {patient.client_phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{patient.client_phone}</Text>
              </View>
            )}
            {patient.client_email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{patient.client_email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Summary Bar ── */}
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
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{fmtMoney(totalSpend)}</Text>
            <Text style={styles.summaryDesc}>Total Billed</Text>
          </View>
        </View>

        {/* ── Visits ── */}
        {visits.length === 0 ? (
          <Text style={styles.noVisits}>No visits found for this date range.</Text>
        ) : (
          visits.map((visit: any, i: number) => {
            const lineItems: any[] = visit.lineItems || []
            const visitTotal = lineItems.reduce((s: number, li: any) => s + Number(li.unit_price || 0) * Number(li.quantity || 1), 0)

            return (
              <View key={visit.id} style={styles.visitCard} wrap={false}>
                {/* Visit header */}
                <View style={styles.visitHeader}>
                  <Text style={styles.visitNumber}>#{i + 1}</Text>
                  <Text style={styles.visitDate}>{fmt(visit.visit_date)}</Text>
                  {visit.visit_number && <Text style={styles.visitStaff}>{visit.visit_number}{'  '}</Text>}
                  {visit.staff_name && <Text style={styles.visitStaff}>Dr/Therapist: {visit.staff_name}</Text>}
                </View>

                <View style={styles.visitBody}>
                  {/* Vitals row */}
                  {(visit.weight_kg || visit.temperature_c) && (
                    <View style={[styles.visitGrid, { marginBottom: 8 }]}>
                      {visit.weight_kg && (
                        <View style={styles.visitGridItem}>
                          <Text style={styles.fieldLabel}>Weight</Text>
                          <Text style={styles.fieldValue}>{visit.weight_kg} kg</Text>
                        </View>
                      )}
                      {visit.temperature_c && (
                        <View style={styles.visitGridItem}>
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
                    let treatText = visit.treatment
                    try { const arr = JSON.parse(visit.treatment); if (Array.isArray(arr)) treatText = arr.join(', ') } catch {}
                    return treatText ? (
                      <View style={styles.fieldBox}>
                        <Text style={styles.fieldLabel}>Treatment</Text>
                        <Text style={styles.fieldValue}>{treatText}</Text>
                      </View>
                    ) : null
                  })()}

                  {/* Line items */}
                  {lineItems.length > 0 && (
                    <View>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.col_desc]}>Service / Product</Text>
                        <Text style={[styles.tableHeaderText, styles.col_qty]}>Qty</Text>
                        <Text style={[styles.tableHeaderText, styles.col_price]}>Unit Price</Text>
                        <Text style={[styles.tableHeaderText, styles.col_total]}>Total</Text>
                      </View>
                      {lineItems.map((li: any, j: number) => (
                        <View key={j} style={[styles.tableRow, j % 2 === 1 ? styles.tableRowAlt : {}]}>
                          <Text style={[styles.fieldValue, styles.col_desc]}>{li.description || '—'}</Text>
                          <Text style={[styles.fieldValue, styles.col_qty]}>{li.quantity || 1}</Text>
                          <Text style={[styles.fieldValue, styles.col_price]}>{fmtMoney(li.unit_price)}</Text>
                          <Text style={[styles.fieldValue, styles.col_total]}>{fmtMoney(Number(li.unit_price || 0) * Number(li.quantity || 1))}</Text>
                        </View>
                      ))}
                      <View style={styles.tableTotal}>
                        <Text style={styles.tableTotalLabel}>Visit Total</Text>
                        <Text style={styles.tableTotalValue}>{fmtMoney(visitTotal)}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )
          })
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            RehabVet Veterinary Rehabilitation Centre  ·  513 Serangoon Road, #01-01, Singapore 218154  ·  Tel: 6291 6881
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}
