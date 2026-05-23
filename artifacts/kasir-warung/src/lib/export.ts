import { Transaction } from "./storage";
import { formatRupiah, formatDate, formatDateOnly } from "./calculations";

export const exportTXT = (transactions: Transaction[], periodLabel: string, storeName: string): void => {
  const line = (char: string, len = 44) => char.repeat(len);
  const center = (text: string, len = 44) => {
    const pad = Math.max(0, Math.floor((len - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    const dateKey = formatDateOnly(t.timestamp);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(t);
  });

  const totalRevenue = transactions.reduce((s, t) => s + t.total, 0);
  const totalTransactions = transactions.length;

  let txt = '';
  txt += line('=') + '\n';
  txt += center(storeName) + '\n';
  txt += center('LAPORAN PENJUALAN') + '\n';
  txt += center(periodLabel) + '\n';
  txt += line('=') + '\n\n';

  txt += `RINGKASAN\n`;
  txt += line('-') + '\n';
  txt += `Total Transaksi : ${totalTransactions}\n`;
  txt += `Total Pendapatan: ${formatRupiah(totalRevenue)}\n`;
  if (totalTransactions > 0) {
    txt += `Rata-rata/Trx   : ${formatRupiah(Math.round(totalRevenue / totalTransactions))}\n`;
  }
  txt += '\n';

  Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, txs]) => {
    const dayTotal = txs.reduce((s, t) => s + t.total, 0);
    txt += line('=') + '\n';
    txt += `Tanggal: ${date} | ${txs.length} Transaksi | ${formatRupiah(dayTotal)}\n`;
    txt += line('=') + '\n';

    txs.forEach(t => {
      txt += `\n${t.id} - ${formatDate(t.timestamp)}\n`;
      txt += line('-') + '\n';
      t.items.forEach(item => {
        const lineTotal = item.price * item.qty - item.discount;
        txt += `  ${item.name}\n`;
        txt += `    ${item.qty} x ${formatRupiah(item.price)}`;
        if (item.discount > 0) txt += ` (Diskon: ${formatRupiah(item.discount)})`;
        txt += ` = ${formatRupiah(lineTotal)}\n`;
      });
      txt += line('-') + '\n';
      txt += `  Subtotal  : ${formatRupiah(t.subtotal)}\n`;
      if (t.discountTotal > 0) txt += `  Diskon    : -${formatRupiah(t.discountTotal)}\n`;
      if (t.tax > 0) txt += `  Pajak     : ${formatRupiah(t.tax)}\n`;
      txt += `  TOTAL     : ${formatRupiah(t.total)}\n`;
      txt += `  Bayar     : ${formatRupiah(t.paid)}\n`;
      txt += `  Kembalian : ${formatRupiah(t.change)}\n`;
    });

    txt += '\n';
  });

  txt += line('=') + '\n';
  txt += `Dicetak: ${formatDate(new Date().toISOString())}\n`;
  txt += line('=') + '\n';

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `laporan-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.txt`);
};

export const exportJSON = (transactions: Transaction[], periodLabel: string, storeName: string): void => {
  const totalRevenue = transactions.reduce((s, t) => s + t.total, 0);
  const data = {
    exportedAt: new Date().toISOString(),
    storeName,
    period: periodLabel,
    summary: {
      totalTransactions: transactions.length,
      totalRevenue,
      averagePerTransaction: transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0,
    },
    transactions,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `laporan-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.json`);
};

export const exportCSV = (transactions: Transaction[], periodLabel: string): void => {
  const rows: string[] = [];
  rows.push('ID Transaksi,Tanggal,Nama Produk,Barcode,Qty,Harga,Diskon Item,Subtotal Item,Total Transaksi,Pajak,Bayar,Kembalian');

  transactions.forEach(t => {
    t.items.forEach(item => {
      const lineTotal = item.price * item.qty - item.discount;
      rows.push([
        t.id,
        formatDate(t.timestamp),
        `"${item.name}"`,
        '',
        item.qty,
        item.price,
        item.discount,
        lineTotal,
        t.total,
        t.tax,
        t.paid,
        t.change,
      ].join(','));
    });
  });

  const csv = rows.join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `laporan-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`);
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
