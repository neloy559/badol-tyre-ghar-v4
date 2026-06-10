import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica'
  },
  title: {
    fontSize: 18,
    marginBottom: 16,
    fontWeight: 'bold'
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1pt solid #e5e7eb',
    paddingVertical: 6
  },
  header: {
    backgroundColor: '#f3f4f6'
  },
  cell: {
    flex: 1,
    fontSize: 9,
    paddingHorizontal: 4
  },
  boldCell: {
    flex: 1,
    fontSize: 9,
    paddingHorizontal: 4,
    fontWeight: 'bold'
  }
});

export default function CatalogDocument({ products, categoryName }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Badol Tyre Ghar — {categoryName}</Text>
        
        {/* Header row */}
        <View style={[styles.row, styles.header]}>
          {['Product', 'Size', 'PLY', 'Price'].map(h => (
            <Text key={h} style={styles.boldCell}>{h}</Text>
          ))}
        </View>

        {/* Product rows */}
        {products.map(p => {
          const variants = p.variants || [];
          return variants.map((v, i) => (
            <View key={`${p._id}-${i}`} style={styles.row}>
              <Text style={styles.cell}>{p.name}</Text>
              <Text style={styles.cell}>{p.specs?.size || '—'}</Text>
              <Text style={styles.cell}>{v.ply || '—'}</Text>
              <Text style={styles.cell}>
                {(v.tierPrice != null ? v.tierPrice : v.price) != null
                  ? `৳ ${(v.tierPrice != null ? v.tierPrice : v.price).toLocaleString()}`
                  : '—'}
              </Text>
            </View>
          ));
        })}
      </Page>
    </Document>
  );
}
