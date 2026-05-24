import { useState, useMemo } from "react";
import { FileText, FileJson, FileSpreadsheet, CalendarDays, TrendingUp, ShoppingBag, ReceiptText, BarChart3 } from "lucide-react";
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
    return `${start.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold leading-none ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground pt-0.5">{sub}</p>}
    </div>
  );
}

export default function Laporan() {
  const settings = useMemo(() => getSettings(), []);
  const transactions = useMemo(() => getTransactions(), []);
  const [period, setPeriod] = useState<PeriodType>("harian");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const referenceDate = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);

  const filtered = useMemo((): Transaction[] => {
    if (period === "harian") return transactions.filter(t => isSameDay(t.timestamp, referenceDate));
    if (period === "mingguan") return transactions.filter(t => isSameWeek(t.timestamp, referenceDate));
    return transactions.filter(t => isSameMonth(t.timestamp, referenceDate));
  }, [transactions, period, referenceDate]);

  const periodLabel = useMemo(() => getPeriodLabel(period, referenceDate), [period, referenceDate]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [filtered]
  );

  const totalRevenue = filtered.reduce((s, t) => s + t.total, 0);
  const totalDiscount = filtered.reduce((s, t) => s + t.discountTotal, 0);
  const totalTax = filtered.reduce((s, t) => s + t.tax, 0);
  const avgTrx = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filtered.forEach(t => t.items.forEach(item => {
      if (!map[item.productId]) map[item.productId] = { name: item.name, qty: 0, revenue: 0 };
      map[item.productId].qty += item.qty;
      map[item.productId].revenue += item.price * item.qty - item.discount;
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Laporan</h1>
        <p className="text-sm text-muted-foreground">Analitik & ekspor data penjualan</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
        {(["harian", "mingguan", "bulanan"] as PeriodType[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            data-testid={`tab-period-${p}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-2.5">
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          data-testid="input-report-date"
          className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-sm text-muted-foreground truncate">{periodLabel}</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Total Pendapatan" value={formatRupiah(totalRevenue)} accent />
        <StatCard icon={ReceiptText} label="Jumlah Transaksi" value={String(filtered.length)} sub={`rata-rata ${formatRupiah(avgTrx)}`} />
        <StatCard icon={ShoppingBag} label="Total Item Terjual" value={String(filtered.reduce((s, t) => s + t.items.reduce((q, i) => q + i.qty, 0), 0))} />
        <StatCard icon={BarChart3} label="Diskon Diberikan" value={totalDiscount > 0 ? formatRupiah(totalDiscount) : "-"} sub={totalTax > 0 ? `pajak ${formatRupiah(totalTax)}` : undefined} />
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Produk Terlaris</p>
          </div>
          <div className="divide-y divide-border">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{p.qty} unit</span>
                <span className="text-xs font-semibold text-primary shrink-0 ml-2">{formatRupiah(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <p className="text-sm font-semibold text-foreground mb-1">Ekspor Laporan</p>
        <p className="text-xs text-muted-foreground mb-3">{periodLabel}</p>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada data untuk diekspor pada periode ini.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportTXT(sorted, periodLabel, settings.storeName)} className="gap-2" data-testid="button-export-txt">
              <FileText className="w-3.5 h-3.5" /> TXT
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportJSON(sorted, periodLabel, settings.storeName)} className="gap-2" data-testid="button-export-json">
              <FileJson className="w-3.5 h-3.5" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV(sorted, periodLabel)} className="gap-2" data-testid="button-export-csv">
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </Button>
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Rincian Transaksi</p>
          <p className="text-xs text-muted-foreground">{sorted.length} transaksi</p>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <ReceiptText className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada transaksi pada periode ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Waktu</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Item</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Diskon</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Pajak</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => (
                  <tr key={t.id} data-testid={`row-report-${t.id}`} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-foreground">{formatDate(t.timestamp)}</p>
                      <p className="text-xs text-muted-foreground/60">{t.id}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {t.items.reduce((s, i) => s + i.qty, 0)} unit
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs">
                      {t.discountTotal > 0
                        ? <span className="text-destructive">-{formatRupiah(t.discountTotal)}</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {t.tax > 0 ? formatRupiah(t.tax) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-primary">{formatRupiah(t.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/30">
                  <td className="px-4 py-3 text-xs font-bold text-foreground">
                    Total {sorted.length} transaksi
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    {filtered.reduce((s, t) => s + t.items.reduce((q, i) => q + i.qty, 0), 0)} unit
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-destructive">
                    {totalDiscount > 0 ? `-${formatRupiah(totalDiscount)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    {totalTax > 0 ? formatRupiah(totalTax) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-primary">{formatRupiah(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
