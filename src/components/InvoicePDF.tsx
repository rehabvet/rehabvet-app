import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const PINK    = '#e91e8c'
const DARK    = '#0f172a'
const MID     = '#64748b'
const LIGHT   = '#94a3b8'
const BORDER  = '#e2e8f0'
const BG      = '#f8fafc'
const GREEN   = '#16a34a'
const GREENBG = '#f0fdf4'
const GREENBORDER = '#bbf7d0'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 44,
    backgroundColor: '#ffffff',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  logo: { width: 52, height: 52 },
  clinicName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  clinicTagline: { fontSize: 7.5, color: LIGHT, marginBottom: 5, fontStyle: 'italic' },
  clinicDetails: { fontSize: 7.5, color: MID, lineHeight: 1.7 },
  headerRight: { alignItems: 'flex-end' },
  invoiceLabel: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: DARK, letterSpacing: 1, marginBottom: 4 },
  invoiceNum: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: PINK, marginBottom: 6 },
  metaTable: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  metaKey: { fontSize: 7.5, color: LIGHT, width: 44, textAlign: 'right', marginRight: 6 },
  metaVal: { fontSize: 7.5, color: DARK, fontFamily: 'Helvetica-Bold', textAlign: 'right', minWidth: 70 },

  // ── Divider ──
  divider: { borderBottomWidth: 1.5, borderBottomColor: PINK, marginBottom: 20 },
  dividerThin: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 16 },

  // ── Bill To / Patient ──
  partiesRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  partyBox: { flex: 1 },
  partyLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 3,
  },
  partyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3 },
  partyDetail: { fontSize: 8, color: MID, lineHeight: 1.65 },

  // ── Status badge ──
  statusRow: { marginBottom: 16 },
  paidBadge: {
    backgroundColor: GREENBG,
    borderWidth: 1,
    borderColor: GREENBORDER,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paidText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREEN },
  unpaidBadge: {
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  unpaidText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#854d0e' },

  // ── Table ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: DARK,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 0,
  },
  thText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.3 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: { backgroundColor: BG },
  colDesc: { flex: 1 },
  colQty: { width: 30, textAlign: 'center' },
  colPrice: { width: 70, textAlign: 'right' },
  colAmt: { width: 70, textAlign: 'right' },
  cellText: { fontSize: 8.5, color: DARK },
  cellNote: { fontSize: 7.5, color: LIGHT, marginTop: 2 },
  cellMid: { fontSize: 8.5, color: MID },

  // ── Totals ──
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, marginBottom: 18 },
  totalsTable: { width: 210 },
  totalRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 2 },
  totalDivider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 4 },
  tLabel: { flex: 1, fontSize: 8.5, color: MID },
  tValue: { fontSize: 8.5, color: DARK, textAlign: 'right' },
  tLabelBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },
  tValueBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right' },
  balancePaid: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREEN },
  balancePaidVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREEN, textAlign: 'right' },
  grandBox: {
    backgroundColor: DARK,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    marginTop: 6,
  },
  grandLabel: { flex: 1, fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  grandValue: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' },

  // ── Payment record ──
  paymentSection: {
    backgroundColor: GREENBG,
    borderWidth: 1,
    borderColor: GREENBORDER,
    borderRadius: 5,
    padding: 10,
    marginBottom: 16,
  },
  paymentHeading: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  payDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: GREEN, marginRight: 6 },
  payText: { fontSize: 8.5, color: '#166534', flex: 1 },
  payAmt: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#14532d' },

  // ── Notes ──
  notesSection: {
    borderLeftWidth: 2,
    borderLeftColor: PINK,
    paddingLeft: 10,
    marginBottom: 18,
  },
  notesLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  notesText: { fontSize: 8.5, color: MID, lineHeight: 1.6 },

  // ── Thank you ──
  thankYouBox: { alignItems: 'center', marginBottom: 10 },
  thankYouText: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: PINK, marginBottom: 2 },
  thankYouSub: { fontSize: 8, color: LIGHT },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    alignItems: 'center',
  },
  footerLeft: { flex: 1, fontSize: 7, color: LIGHT },
  footerRight: { fontSize: 7, color: LIGHT },
})

function fmt(n: number | string | null) {
  return 'S$' + Number(n ?? 0).toFixed(2)
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return String(d) }
}
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

interface Props {
  invoice: any
  lineItems: any[]
  payments: any[]
  logoDataUrl?: string | null
}

export default function InvoicePDF({ invoice, lineItems, payments, logoDataUrl }: Props) {
  const subtotal  = Number(invoice.subtotal ?? invoice.total ?? 0)
  const tax       = Number(invoice.tax ?? 0)
  const total     = Number(invoice.total ?? 0)
  const isPaid    = invoice.status === 'paid'

  // Use sum of payments if available, fallback to amount_paid field
  const paidSum   = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const amountPaid = paidSum > 0 ? paidSum : Number(invoice.amount_paid ?? 0)
  const balance   = isPaid ? 0 : Math.max(0, total - amountPaid)

  return (
    <Document title={`Invoice ${invoice.invoice_number}`} author="RehabVet Pte Ltd">
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoDataUrl && <Image style={styles.logo} src={logoDataUrl} />}
            <View>
              <Text style={styles.clinicName}>RehabVet Pte Ltd</Text>
              <Text style={styles.clinicTagline}>Proven steps to pain free mobility</Text>
              <Text style={styles.clinicDetails}>
                513 Serangoon Road, #01-01, Singapore 218154{'\n'}
                Tel: 6291 6881  ·  hello@rehabvet.com{'\n'}
                UEN: 201606729H
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNum}>{invoice.invoice_number}</Text>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Date</Text>
                <Text style={styles.metaVal}>{fmtDate(invoice.date)}</Text>
              </View>
              {!isPaid && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Due</Text>
                  <Text style={styles.metaVal}>{fmtDate(invoice.due_date)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Bill To / Patient ── */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Bill To</Text>
            <Text style={styles.partyName}>{invoice.client_name || '—'}</Text>
            {invoice.client_phone ? <Text style={styles.partyDetail}>Tel: {invoice.client_phone}</Text> : null}
            {invoice.client_email ? <Text style={styles.partyDetail}>{invoice.client_email}</Text> : null}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Patient</Text>
            <Text style={styles.partyName}>{invoice.patient_name || '—'}</Text>
            {invoice.patient_species ? (
              <Text style={styles.partyDetail}>
                {invoice.patient_species}{invoice.patient_breed ? ` · ${invoice.patient_breed}` : ''}
              </Text>
            ) : null}
            {invoice.visit_date ? <Text style={styles.partyDetail}>Visit: {fmtDate(invoice.visit_date)}</Text> : null}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Status</Text>
            <View style={{ marginTop: 4 }}>
              {isPaid ? (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidText}>✓  PAID IN FULL</Text>
                </View>
              ) : (
                <View style={styles.unpaidBadge}>
                  <Text style={styles.unpaidText}>PAYMENT DUE</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Line items ── */}
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, styles.colDesc]}>Description</Text>
          <Text style={[styles.thText, styles.colQty]}>Qty</Text>
          <Text style={[styles.thText, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.thText, styles.colAmt]}>Amount</Text>
        </View>

        {lineItems.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.cellMid, { flex: 1 }]}>No items</Text>
          </View>
        ) : lineItems.map((li: any, i: number) => {
          const qty       = Number(li.qty ?? li.quantity ?? 1)
          const unitPrice = Number(li.unit_price ?? 0)
          const amount    = Number(li.amount ?? li.total ?? unitPrice * qty)
          return (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <View style={styles.colDesc}>
                <Text style={styles.cellText}>{li.description || '—'}</Text>
                {li.dispensing_instructions ? <Text style={styles.cellNote}>{li.dispensing_instructions}</Text> : null}
              </View>
              <Text style={[styles.cellMid, styles.colQty]}>{qty}</Text>
              <Text style={[styles.cellMid, styles.colPrice]}>{fmt(unitPrice)}</Text>
              <Text style={[styles.cellText, styles.colAmt]}>{fmt(amount)}</Text>
            </View>
          )
        })}

        {/* ── Totals ── */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            {tax > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.tLabel}>Subtotal</Text>
                  <Text style={styles.tValue}>{fmt(subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.tLabel}>GST</Text>
                  <Text style={styles.tValue}>{fmt(tax)}</Text>
                </View>
                <View style={styles.totalDivider} />
              </>
            )}
            <View style={styles.grandBox}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{fmt(total)}</Text>
            </View>
            {isPaid ? (
              <View style={[styles.totalRow, { marginTop: 4 }]}>
                <Text style={styles.balancePaid}>✓ Paid in Full</Text>
                <Text style={styles.balancePaidVal}>{fmt(total)}</Text>
              </View>
            ) : amountPaid > 0 ? (
              <>
                <View style={[styles.totalRow, { marginTop: 4 }]}>
                  <Text style={styles.tLabel}>Amount Paid</Text>
                  <Text style={[styles.tValue, { color: GREEN }]}>{fmt(amountPaid)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.tLabelBold, { color: '#dc2626' }]}>Balance Due</Text>
                  <Text style={[styles.tValueBold, { color: '#dc2626' }]}>{fmt(balance)}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* ── Payments ── */}
        {payments.length > 0 && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentHeading}>Payment Record</Text>
            {payments.map((p: any, i: number) => (
              <View key={i} style={styles.paymentRow}>
                <View style={styles.payDot} />
                <Text style={styles.payText}>
                  {fmtDate(p.created_at || p.date)}  ·  {cap(p.method || 'cash')}
                  {p.reference ? `  ·  Ref: ${p.reference}` : ''}
                </Text>
                <Text style={styles.payAmt}>{fmt(p.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Notes ── */}
        {invoice.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── Thank you ── */}
        <View style={styles.thankYouBox}>
          <Text style={styles.thankYouText}>Thank you for choosing RehabVet 🐾</Text>
          <Text style={styles.thankYouSub}>
            We look forward to seeing {invoice.patient_name || 'your pet'} again.
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            RehabVet Pte Ltd  ·  UEN: 201606729H  ·  513 Serangoon Road, #01-01, Singapore 218154  ·  hello@rehabvet.com
          </Text>
          <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
