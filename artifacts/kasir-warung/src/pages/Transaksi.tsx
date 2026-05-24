import { useState, useMemo, useCallback } from "react";
import { Search, ClipboardList, Printer, Eye, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Transaction, getTransactions, getSettings, deleteTransaction, clearAllTransactions } from "@/lib/storage";
import { formatRupiah, formatDate, isSameDay } from "@/lib/calculations";

function ReceiptModal({ transaction, storeName, onClose }: { transaction: Transaction; storeName: string; onClose: () => void }) {
  const handlePrint = () => window.print();
  const d = new Date(transaction.timestamp);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Detail Transaksi
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="w-3.5 h-3.5" /> Cetak
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="font-mono text-sm space-y-3 print:text-black print:bg-white" data-testid="receipt-content">
          <div className="text-center border-b border-border pb-3">
            <p className="font-bold text-base">{storeName}</p>
            <p className="text-xs text-muted-foreground">{transaction.id}</p>
            <p className="text-xs text-muted-foreground">{d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="space-y-1.5">
            {transaction.items.map((item, i) => {
              const lineTotal = item.price * item.qty - item.discount;
              return (
                <div key={i} className="space-y-0.5">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.qty} x {formatRupiah(item.price)}{item.discount > 0 ? ` - disc ${formatRupiah(item.discount)}` : ''}</span>
                    <span className="text-foreground">{formatRupiah(lineTotal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>
            {transaction.discountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-destructive">-{formatRupiah(transaction.discountTotal)}</span>
              </div>
            )}
            {transaction.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak ({Math.round(transaction.taxRate * 100)}%)</span>
                <span>{formatRupiah(transaction.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-border pt-1.5">
              <span>TOTAL</span>
              <span className="text-primary">{formatRupiah(transaction.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bayar</span>
              <span>{formatRupiah(transaction.paid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kembalian</span>
              <span className="font-semibold">{formatRupiah(transaction.change)}</span>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border">Terima kasih atas kunjungan Anda!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>Hapus</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Transaksi() {
  const settings = useMemo(() => getSettings(), []);
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    [...getTransactions()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  );
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const today = new Date();
  const todayRevenue = useMemo(() => transactions.filter(t => isSameDay(t.timestamp, today)).reduce((s, t) => s + t.total, 0), [transactions]);
  const todayCount = useMemo(() => transactions.filter(t => isSameDay(t.timestamp, today)).length, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.id.toLowerCase().includes(q));
    }
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      list = list.filter(t => isSameDay(t.timestamp, filterDate));
    }
    return list;
  }, [transactions, search, dateFilter]);

  const clearFilters = useCallback(() => { setSearch(""); setDateFilter(""); }, []);

  const handleDeleteOne = useCallback((id: string) => {
    const updated = deleteTransaction(id);
    setTransactions([...updated].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setConfirmDelete(null);
    if (selectedTrx?.id === id) setSelectedTrx(null);
  }, [selectedTrx]);

  const handleClearAll = useCallback(() => {
    clearAllTransactions();
    setTransactions([]);
    setConfirmClearAll(false);
    setSelectedTrx(null);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Transaksi</h1>
          <p className="text-sm text-muted-foreground">{transactions.length} total transaksi</p>
        </div>
        {transactions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 shrink-0"
            onClick={() => setConfirmClearAll(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Semua
          </Button>
        )}
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">{formatRupiah(todayRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Pendapatan Hari Ini</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{todayCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Transaksi Hari Ini</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search-transaction" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ID transaksi..." className="pl-9" />
        </div>
        <Input data-testid="input-filter-date" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full sm:w-44" />
        {(search || dateFilter) && (
          <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">Reset</Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">Tidak ada transaksi</p>
          <p className="text-sm text-muted-foreground mt-1">Mulai berjualan di halaman Kasir</p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Waktu</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Item</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} data-testid={`row-transaction-${t.id}`} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs">{t.id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(t.timestamp)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{t.items.length} item</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{formatRupiah(t.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedTrx(t)} data-testid={`button-view-${t.id}`} className="h-8 w-8">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(t.id)}
                          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTrx && (
        <ReceiptModal transaction={selectedTrx} storeName={settings.storeName} onClose={() => setSelectedTrx(null)} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Hapus Transaksi"
          message={`Hapus transaksi ${confirmDelete}? Data ini tidak dapat dikembalikan.`}
          onConfirm={() => handleDeleteOne(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmClearAll && (
        <ConfirmDialog
          title="Hapus Semua Transaksi"
          message="Semua riwayat transaksi akan dihapus permanen. Pastikan sudah melakukan ekspor data terlebih dahulu."
          onConfirm={handleClearAll}
          onCancel={() => setConfirmClearAll(false)}
        />
      )}
    </div>
  );
}
