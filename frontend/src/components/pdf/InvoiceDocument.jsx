import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const C = {
  primary:   '#e63329',
  dark:      '#111827',
  muted:     '#6b7280',
  border:    '#e5e7eb',
  surface:   '#f9fafb',
  white:     '#ffffff',
  success:   '#16a34a',
  warning:   '#d97706',
  danger:    '#dc2626',
};

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: C.dark },

  /* ── Header ── */
  header:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  brandBlock: { flex: 1 },
  brandName:  { fontSize: 20, fontWeight: 'bold', color: C.primary, marginBottom: 4 },
  brandSub:   { fontSize: 9, color: C.muted, lineHeight: 1.5 },

  invoiceBlock: { alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 24, fontWeight: 'bold', color: C.muted, letterSpacing: 2, marginBottom: 8 },
  invoiceMeta:  { fontSize: 9, color: C.muted, textAlign: 'right', lineHeight: 1.6 },
  invoiceId:    { fontSize: 11, fontWeight: 'bold', color: C.dark, textAlign: 'right' },

  divider: { height: 2, backgroundColor: C.primary, marginBottom: 20 },
  dividerThin: { height: 1, backgroundColor: C.border, marginVertical: 12 },

  /* ── Bill to ── */
  billSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  billBlock:   { flex: 1 },
  billLabel:   { fontSize: 8, fontWeight: 'bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  billName:    { fontSize: 11, fontWeight: 'bold', color: C.dark, marginBottom: 3 },
  billDetail:  { fontSize: 9, color: C.muted, lineHeight: 1.5 },

  /* ── Status badges ── */
  badgeRow:  { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, fontSize: 8, fontWeight: 'bold' },
  badgePending:   { backgroundColor: '#fffbeb', color: '#92400e' },
  badgeConfirmed: { backgroundColor: '#dbeafe', color: '#1e40af' },
  badgeDelivered: { backgroundColor: '#f0fdf4', color: '#14532d' },
  badgeCancelled: { backgroundColor: '#fef2f2', color: '#7f1d1d' },
  badgeUnpaid:  { backgroundColor: '#fef2f2', color: C.danger },
  badgePartial: { backgroundColor: '#fffbeb', color: C.warning },
  badgePaid:    { backgroundColor: '#f0fdf4', color: C.success },

  /* ── Items table ── */
  tableHeader: { flexDirection: 'row', backgroundColor: C.surface, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 4, marginBottom: 2 },
  tableRow:    { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottom: `1pt solid ${C.border}` },
  tableRowAlt: { backgroundColor: '#fafafa' },

  colProduct:  { flex: 3 },
  colSku:      { flex: 2 },
  colQty:      { flex: 1, textAlign: 'center' },
  colUnit:     { flex: 1.5, textAlign: 'right' },
  colTotal:    { flex: 1.5, textAlign: 'right' },

  thText: { fontSize: 8, fontWeight: 'bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tdText: { fontSize: 9, color: C.dark },
  tdMuted:{ fontSize: 8, color: C.muted },

  /* ── Totals ── */
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalsBlock:   { width: 220 },
  totalsRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsLabel:   { fontSize: 9, color: C.muted },
  totalsValue:   { fontSize: 9, color: C.dark, fontWeight: 'bold' },
  grandRow:      { borderTop: `2pt solid ${C.dark}`, marginTop: 4, paddingTop: 6 },
  grandLabel:    { fontSize: 11, fontWeight: 'bold', color: C.dark },
  grandValue:    { fontSize: 11, fontWeight: 'bold', color: C.primary },
  dueRow:        { backgroundColor: '#fef2f2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, marginTop: 4 },
  dueLabel:      { fontSize: 9, fontWeight: 'bold', color: C.danger },
  dueValue:      { fontSize: 9, fontWeight: 'bold', color: C.danger },

  /* ── Payment info ── */
  paySection: { marginTop: 20, padding: 12, backgroundColor: C.surface, borderRadius: 4 },
  payTitle:   { fontSize: 9, fontWeight: 'bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  payGrid:    { flexDirection: 'row', gap: 24 },
  payItem:    { flex: 1 },
  payLabel:   { fontSize: 8, color: C.muted, marginBottom: 3 },
  payValue:   { fontSize: 9, fontWeight: 'bold', color: C.dark },

  /* ── Note ── */
  noteSection: { marginTop: 16, padding: 10, borderLeft: `3pt solid ${C.primary}`, backgroundColor: '#fff5f5' },
  noteLabel:   { fontSize: 8, fontWeight: 'bold', color: C.primary, marginBottom: 4 },
  noteText:    { fontSize: 9, color: C.dark, lineHeight: 1.5 },

  /* ── Footer ── */
  footer:     { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerLine: { height: 1, backgroundColor: C.border, marginBottom: 8 },
  footerText: { fontSize: 8, color: C.muted, textAlign: 'center' },
});

function fmt(amount) {
  if (amount == null) return '—';
  return `\u09F3 ${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' });
}

const STATUS_BADGE_STYLE = {
  pending:   s.badgePending,
  confirmed: s.badgeConfirmed,
  delivered: s.badgeDelivered,
  cancelled: s.badgeCancelled,
};

const PAY_BADGE_STYLE = {
  unpaid:  s.badgeUnpaid,
  partial: s.badgePartial,
  paid:    s.badgePaid,
};

export default function InvoiceDocument({ order, siteName = 'Badol Tyre Ghar', whatsappNumber = '' }) {
  const invoiceNo = String(order._id).slice(-8).toUpperCase();
  const dealer    = order.dealer?.profile?.businessName
    || order.dealer?.profile?.name
    || order.dealerName
    || 'Walk-in Customer';
  const phone = order.dealer?.phone || order.dealerPhone || '';
  const balanceDue = Math.max(0, (order.grandTotal || 0) - (order.amountPaid || 0));

  return (
    <Document title={`Invoice #${invoiceNo}`} author={siteName}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>{siteName}</Text>
            <Text style={s.brandSub}>
              Wholesale Tyres & Tubes{'\n'}
              {whatsappNumber ? `WhatsApp: ${whatsappNumber}` : ''}
            </Text>
          </View>
          <View style={s.invoiceBlock}>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.invoiceId}>#{invoiceNo}</Text>
            <Text style={s.invoiceMeta}>
              {'Date: '}{fmtDate(order.createdAt)}{'\n'}
              {order.inquiryId ? `Inquiry ref: #${String(order.inquiryId._id || order.inquiryId).slice(-6).toUpperCase()}` : ''}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Bill To ── */}
        <View style={s.billSection}>
          <View style={s.billBlock}>
            <Text style={s.billLabel}>Bill To</Text>
            <Text style={s.billName}>{dealer}</Text>
            {phone ? <Text style={s.billDetail}>Phone: {phone}</Text> : null}
          </View>
          <View style={[s.billBlock, { alignItems: 'flex-end' }]}>
            <Text style={s.billLabel}>Order Details</Text>
            <Text style={s.billDetail}>
              {'Items: '}{(order.items || []).length}{'\n'}
              {'Method: '}{order.paymentMethod || '—'}
            </Text>
          </View>
        </View>

        {/* ── Status badges ── */}
        <View style={s.badgeRow}>
          <View style={[s.badge, STATUS_BADGE_STYLE[order.status] || s.badgePending]}>
            <Text>{(order.status || 'pending').toUpperCase()}</Text>
          </View>
          <View style={[s.badge, PAY_BADGE_STYLE[order.paymentStatus] || s.badgeUnpaid]}>
            <Text>{(order.paymentStatus || 'unpaid').toUpperCase()}</Text>
          </View>
        </View>

        {/* ── Items table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colProduct]}>Product</Text>
          <Text style={[s.thText, s.colSku]}>SKU</Text>
          <Text style={[s.thText, s.colQty]}>Qty</Text>
          <Text style={[s.thText, s.colUnit]}>Unit Price</Text>
          <Text style={[s.thText, s.colTotal]}>Total</Text>
        </View>

        {(order.items || []).map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tdText, s.colProduct]}>{item.productName || 'Product'}</Text>
            <Text style={[s.tdMuted, s.colSku]}>{item.variantSku}</Text>
            <Text style={[s.tdText, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.tdText, s.colUnit]}>{fmt(item.unitPrice)}</Text>
            <Text style={[s.tdText, s.colTotal]}>{fmt(item.totalPrice)}</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalsSection}>
          <View style={s.totalsBlock}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{fmt(order.subtotal)}</Text>
            </View>
            {order.discount > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Discount</Text>
                <Text style={[s.totalsValue, { color: C.success }]}>− {fmt(order.discount)}</Text>
              </View>
            )}
            <View style={[s.totalsRow, s.grandRow]}>
              <Text style={s.grandLabel}>Grand Total</Text>
              <Text style={s.grandValue}>{fmt(order.grandTotal)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Amount Paid</Text>
              <Text style={[s.totalsValue, { color: C.success }]}>{fmt(order.amountPaid)}</Text>
            </View>
            {balanceDue > 0 && (
              <View style={[s.totalsRow, s.dueRow]}>
                <Text style={s.dueLabel}>Balance Due</Text>
                <Text style={s.dueValue}>{fmt(balanceDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Payment info ── */}
        {(order.paymentMethod || order.amountPaid > 0) && (
          <View style={s.paySection}>
            <Text style={s.payTitle}>Payment Information</Text>
            <View style={s.payGrid}>
              <View style={s.payItem}>
                <Text style={s.payLabel}>Method</Text>
                <Text style={s.payValue}>{order.paymentMethod || '—'}</Text>
              </View>
              <View style={s.payItem}>
                <Text style={s.payLabel}>Amount Paid</Text>
                <Text style={s.payValue}>{fmt(order.amountPaid)}</Text>
              </View>
              <View style={s.payItem}>
                <Text style={s.payLabel}>Balance Due</Text>
                <Text style={[s.payValue, balanceDue > 0 ? { color: C.danger } : { color: C.success }]}>
                  {fmt(balanceDue)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Admin note ── */}
        {order.adminNote ? (
          <View style={s.noteSection}>
            <Text style={s.noteLabel}>Note</Text>
            <Text style={s.noteText}>{order.adminNote}</Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <View style={s.footerLine} />
          <Text style={s.footerText}>
            {siteName} · Thank you for your business!
            {whatsappNumber ? `  |  WhatsApp: ${whatsappNumber}` : ''}
          </Text>
        </View>

      </Page>
    </Document>
  );
}
