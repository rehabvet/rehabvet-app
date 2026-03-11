import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const PINK  = '#e91e8c'
const DARK  = '#0f172a'
const MID   = '#475569'
const LIGHT = '#94a3b8'
const BG    = '#f8fafc'
const BORDER = '#e2e8f0'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: DARK, paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, backgroundColor: '#fff' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: PINK, paddingBottom: 12, marginBottom: 18 },
  logo: { width: 60, height: 60, marginRight: 14 },
  clinicBlock: { flex: 1 },
  clinicName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: PINK, marginBottom: 1 },
  clinicSub: { fontSize: 7.5, color: LIGHT, marginBottom: 3 },
  clinicDetails: { fontSize: 7.5, color: MID, lineHeight: 1.6 },
  invoiceCol: { alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3 },
  invoiceNum: { fontSize: 9, color: PINK, fontFamily: 'Helvetica-Bold' },
  invoiceMeta: { fontSize: 8, color: MID, textAlign: 'right', lineHeight: 1.7, marginTop: 3 },

  // Parties
  partiesRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  partyBox: { flex: 1, backgroundColor: BG, borderRadius: 6, padding: 10 },
  partyLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  partyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3 },
  partyDetail: { fontSize: 8, color: MID, lineHeight: 1.6 },

  // Status badge
  paidBadge: { backgroundColor: '#dcfce7', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 12 },
  paidText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#15803d' },

  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: PINK, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4, marginBottom: 2 },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt: { backgroundColor: BG },
  colDesc: { flex: 4 },
  colQty: { width: 35, textAlign: 'center' },
  colPrice: { width: 65, textAlign: 'right' },
  colTotal: { width: 65, textAlign: 'right' },
  cellText: { fontSize: 8.5, color: DARK },
  cellMuted: { fontSize: 8.5, color: MID },

  // Totals
  totalsBox: { alignItems: 'flex-end', marginTop: 8, marginBottom: 16 },
  totalRow: { flexDirection: 'row', width: 200, marginBottom: 3 },
  totalLabel: { flex: 1, fontSize: 8.5, color: MID },
  totalValue: { fontSize: 8.5, color: DARK, textAlign: 'right' },
  grandRow: { flexDirection: 'row', width: 200, backgroundColor: DARK, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, marginTop: 4 },
  grandLabel: { flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff' },
  grandValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff' },

  // Payment
  paymentBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 6, padding: 10, marginBottom: 16 },
  paymentTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#15803d', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 },
  paymentRow: { flexDirection: 'row', marginBottom: 2 },
  paymentLabel: { fontSize: 8, color: '#166534', width: 80 },
  paymentValue: { fontSize: 8, color: '#14532d', fontFamily: 'Helvetica-Bold', flex: 1 },

  // Notes
  notesBox: { borderLeftWidth: 3, borderLeftColor: PINK, paddingLeft: 10, marginBottom: 16 },
  notesLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: LIGHT, textTransform: 'uppercase', marginBottom: 3 },
  notesText: { fontSize: 8.5, color: MID, lineHeight: 1.5 },

  // Thank you
  thankYou: { textAlign: 'center', fontSize: 10, fontFamily: 'Helvetica-Bold', color: PINK, marginBottom: 2 },
  thankYouSub: { textAlign: 'center', fontSize: 8, color: LIGHT },

  // Footer
  footer: { position: 'absolute', bottom: 18, left: 40, right: 40, flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 5 },
  footerLeft: { flex: 1, fontSize: 7, color: LIGHT },
  footerRight: { fontSize: 7, color: LIGHT },
})

function fmt(n: number | string | null) {
  if (n == null) return '0.00'
  return Number(n).toFixed(2)
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return String(d) }
}
function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

interface Props {
  invoice: any
  lineItems: any[]
  payments: any[]
  logoDataUrl?: string | null
}

export default function InvoicePDF({ invoice, lineItems, payments, logoDataUrl }: Props) {
  const subtotal = parseFloat(invoice.subtotal || 0)
  const tax = parseFloat(invoice.tax || 0)
  const total = parseFloat(invoice.total || 0)
  const amountPaid = parseFloat(invoice.amount_paid || 0)
  const balance = Math.max(0, total - amountPaid)
  const isPaid = invoice.status === 'paid'

  const generatedStr = new Date().toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore', day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <Document title={`Invoice ${invoice.invoice_number}`} author="RehabVet Pte Ltd">
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {logoDataUrl && <Image style={styles.logo} src={logoDataUrl} />}
          <View style={styles.clinicBlock}>
            <Text style={styles.clinicName}>RehabVet Pte Ltd</Text>
            <Text style={styles.clinicSub}>Proven steps to pain free mobility</Text>
            <Text style={styles.clinicDetails}>
              513 Serangoon Road, #01-01, Singapore 218154{'\n'}
              Tel: 6291 6881  ·  hello@rehabvet.com  ·  www.rehabvet.com{'\n'}
              UEN: 201606729H
            </Text>
          </View>
          <View style={styles.invoiceCol}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNum}>{invoice.invoice_number}</Text>
            {invoice.bill_number && invoice.bill_number !== invoice.invoice_number && (
              <Text style={[styles.invoiceMeta, { color: LIGHT }]}>Ref: {invoice.bill_number}</Text>
            )}
            <Text style={styles.invoiceMeta}>
              Date: {fmtDate(invoice.date)}{'\n'}
              Due: {fmtDate(invoice.due_date)}
            </Text>
          </View>
        </View>

        {/* ── Bill To / Patient ── */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Bill To</Text>
            <Text style={styles.partyName}>{invoice.client_name || '—'}</Text>
            {invoice.client_phone && <Text style={styles.partyDetail}>Tel: {invoice.client_phone}</Text>}
            {invoice.client_email && <Text style={styles.partyDetail}>{invoice.client_email}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Patient</Text>
            <Text style={styles.partyName}>{invoice.patient_name || '—'}</Text>
            {invoice.patient_species && <Text style={styles.partyDetail}>{invoice.patient_species}{invoice.patient_breed ? ` · ${invoice.patient_breed}` : ''}</Text>}
            {invoice.visit_date && <Text style={styles.partyDetail}>Visit: {fmtDate(invoice.visit_date)}</Text>}
          </View>
        </View>

        {/* ── Paid badge ── */}
        {isPaid && (
          <View style={styles.paidBadge}>
            <Text style={styles.paidText}>✓ PAID IN FULL</Text>
          </View>
        )}

        {/* ── Line items ── */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Amount</Text>
        </View>
        {lineItems.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.cellMuted, { flex: 1 }]}>No items</Text>
          </View>
        ) : (
          lineItems.map((li: any, i: number) => {
            const qty = Number(li.qty ?? li.quantity ?? 1)
            const unitPrice = Number(li.unit_price ?? 0)
            const amount = Number(li.amount ?? li.total ?? unitPrice * qty)
            return (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.cellText, styles.colDesc]}>{li.description || '—'}</Text>
                <Text style={[styles.cellMuted, styles.colQty]}>{qty}</Text>
                <Text style={[styles.cellMuted, styles.colPrice]}>S${fmt(unitPrice)}</Text>
                <Text style={[styles.cellText, styles.colTotal]}>S${fmt(amount)}</Text>
              </View>
            )
          })
        )}

        {/* ── Totals ── */}
        <View style={styles.totalsBox}>
          {tax > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>S${fmt(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST</Text>
                <Text style={styles.totalValue}>S${fmt(tax)}</Text>
              </View>
            </>
          )}
          {amountPaid > 0 && amountPaid < total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={[styles.totalValue, { color: '#16a34a' }]}>S${fmt(amountPaid)}</Text>
            </View>
          )}
          {balance > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Balance Due</Text>
              <Text style={[styles.totalValue, { color: '#dc2626' }]}>S${fmt(balance)}</Text>
            </View>
          )}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>S${fmt(total)}</Text>
          </View>
        </View>

        {/* ── Payment record ── */}
        {payments.length > 0 && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Payment Received</Text>
            {payments.map((p: any, i: number) => (
              <View key={i} style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{fmtDate(p.date)}</Text>
                <Text style={styles.paymentValue}>
                  S${fmt(p.amount)}  ·  {capitalize(p.method || 'cash')}
                  {p.reference ? `  ·  Ref: ${p.reference}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Thank you ── */}
        <Text style={styles.thankYou}>Thank you for choosing RehabVet! 🐾</Text>
        <Text style={styles.thankYouSub}>We look forward to seeing {invoice.patient_name || 'your pet'} again.</Text>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>RehabVet Pte Ltd  ·  UEN: 201606729H  ·  513 Serangoon Road, #01-01, Singapore 218154</Text>
          <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
