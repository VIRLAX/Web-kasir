import { useState, useMemo } from "react";
import { Download, FileText, FileJson, FileSpreadsheet, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Transaction, getTransactions, getSettings } from "@/lib/storage";
import { formatRupiah, formatDate, isSameDay, isSameWeek, isSameMonth } from "@/lib/calculations";
import { exportTXT, exportJSON, exportCSV } from "@/lib/export";

type PeriodType = "harian" | "mingguan" | "bulanan";

function getPeriodLabel(period: PeriodType, date: Date): string {
  if (period === "harian") return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  if (period === "mingguan") {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function Laporan() {
  const settings = useMemo(() => getSettings(), []);
  const transactions = useMemo(() => getTransactions(), []);
  const [period, setPeriod] = useState<PeriodType>("harian");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const referenceDate = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);

  const filtered = useMemo((): Transaction[] => {
    if (period === "harian") return transactions.filter(t => isSameDay(t.timestamp, referenceDate));
    if (period === "mingguan") return transactions.filter(t => isSameWeek(t.timestamp, referenceDate));
    return transactions.filter(t => isSameMonth(t.timestamp, referenceDate));
  }, [transactions, period, referenceDate]);

  const periodLabel = useMemo(() => getPeriodLabel(period, referenceDate), [period, referenceDate]);

  const totalRevenue = filtered.reduce((s, t) => s + t.total, 0);
  const avgTrx = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;

  const topProduct = useMemo(() => {
    const countMap: Record<string, { name: string; qty: number }> = {};
    filtered.forEach(t => t.items.forEach(item => {
      if (!countMap[item.productId]) countMap[item.productId] = { name: item.name, qty: 0 };
      countMap[item.productId].qty += item.qty;
    }));
    const sorted = Object.values(countMap).sort((a, b) => b.qty - a.qty);
    return sorted[0] ?? null;
  }, [filtered]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  , [filtered]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Laporan</h1>
        <p className="text-sm text-muted-foreground">Analitik & ekspor data penjualan</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
        {(["harian", "mingguan", "bulanan"] as PeriodType[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} data-testid={`tab-period-${p}`} className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          data-testid="input-report-date"
          className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-sm text-muted-foreground">{periodLabel}</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xl font-bold text-primary">{formatRupiah(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Pendapatan</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xl font-bold text-foreground">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Jumlah Transaksi</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xl font-bold text-foreground">{formatRupiah(avgTrx)}</p>
          <p className="text-xs text-muted-foreground mt-1">Rata-rata / Transaksi</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xl font-bold text-foreground truncate">{topProduct?.name ?? "-"}</p>
          <p className="text-xs text-muted-foreground mt-1">Produk Terlaris {topProduct ? `(${topProduct.qty} unit)` : ""}</p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <p className="text-sm font-semibold text-foreground mb-3">Ekspor Laporan</p>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada data untuk diekspor pada periode ini.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportTXT(sorted, periodLabel, settings.storeName)} className="gap-2 text-sm" data-testid="button-export-txt">
              <FileText className="w-4 h-4" /> Ekspor TXT
            </Button>
            <Button variant="outline" onClick={() => exportJSON(sorted, periodLabel, settings.storeName)} className="gap-2 text-sm" data-testid="button-export-json">
              <FileJson className="w-4 h-4" /> Ekspor JSON
            </Button>
            <Button variant="outline" onClick={() => exportCSV(sorted, periodLabel)} className="gap-2 text-sm" data-testid="button-export-csv">
              <FileSpreadsheet className="w-4 h-4" /> Ekspor CSV
            </Button>
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Daftar Transaksi</p>
          <p className="text-xs text-muted-foreground">{sorted.length} transaksi</p>
        </div>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Download className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada transaksi pada periode ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Waktu</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Item</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Diskon</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Pajak</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => (
                  <tr key={t.id} data-testid={`row-report-${t.id}`} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-4 py-2 text-xs font-medium text-foreground">{t.id}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(t.timestamp)}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">{t.items.length}</td>
                    <td className="px-4 py-2 text-right text-xs text-destructive">{t.discountTotal > 0 ? `-${formatRupiah(t.discountTotal)}` : "-"}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">{t.tax > 0 ? formatRupiah(t.tax) : "-"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-primary">{formatRupiah(t.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-secondary/30">
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-foreground">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{formatRupiah(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
