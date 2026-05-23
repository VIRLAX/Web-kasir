import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, ShoppingCart, Package, AlertTriangle } from "lucide-react";
import { getTransactions, getProducts } from "@/lib/storage";
import { formatRupiah, isSameDay } from "@/lib/calculations";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const products = useMemo(() => getProducts(), []);
  const transactions = useMemo(() => getTransactions(), []);
  const today = new Date();

  const todayRevenue = useMemo(() =>
    transactions.filter(t => isSameDay(t.timestamp, today)).reduce((s, t) => s + t.total, 0)
  , [transactions]);

  const todayCount = useMemo(() =>
    transactions.filter(t => isSameDay(t.timestamp, today)).length
  , [transactions]);

  const lowStockCount = useMemo(() =>
    products.filter(p => p.stock <= p.stockThreshold).length
  , [products]);

  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      const revenue = transactions
        .filter(t => isSameDay(t.timestamp, d))
        .reduce((s, t) => s + t.total, 0);
      days.push({ label, revenue });
    }
    return days;
  }, [transactions]);

  const topProducts = useMemo(() => {
    const countMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    transactions.forEach(t => {
      t.items.forEach(item => {
        if (!countMap[item.productId]) {
          countMap[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        countMap[item.productId].qty += item.qty;
        countMap[item.productId].revenue += item.price * item.qty;
      });
    });
    return Object.values(countMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [transactions]);

  const stockChartData = useMemo(() =>
    [...products].sort((a, b) => a.stock - b.stock).slice(0, 10).map(p => ({
      label: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      stock: p.stock,
      threshold: p.stockThreshold,
    }))
  , [products]);

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
  , [transactions]);

  const kpis = [
    {
      label: "Pendapatan Hari Ini",
      value: formatRupiah(todayRevenue),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Transaksi Hari Ini",
      value: String(todayCount),
      icon: ShoppingCart,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      label: "Total Produk",
      value: String(products.length),
      icon: Package,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      label: "Stok Kritis",
      value: String(lowStockCount),
      icon: AlertTriangle,
      color: lowStockCount > 0 ? "text-destructive" : "text-chart-5",
      bg: lowStockCount > 0 ? "bg-destructive/10" : "bg-chart-5/10",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ringkasan performa toko</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mt-3">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales chart */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Penjualan 7 Hari Terakhir</h2>
          {last7Days.every(d => d.revenue === 0) ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Belum ada data penjualan</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last7Days} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 15% 17%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(215 15% 55%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)} width={40} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="revenue" fill="hsl(172 90% 42%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Produk Terlaris</h2>
          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Belum ada data transaksi</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const maxQty = topProducts[0].qty || 1;
                const pct = Math.round((p.qty / maxQty) * 100);
                return (
                  <div key={p.name} data-testid={`top-product-${i}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
                        <span className="text-sm text-foreground truncate">{p.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{p.qty} unit</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock chart */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Stok Produk (10 Terendah)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stockChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 15% 17%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }} axisLine={false} tickLine={false} width={88} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'hsl(225 15% 11%)', border: '1px solid hsl(225 15% 17%)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="stock" fill="hsl(262 80% 65%)" radius={[0, 4, 4, 0]} name="Stok" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent transactions */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Transaksi Terakhir</h2>
          {recentTransactions.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Belum ada transaksi</div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map(t => {
                const d = new Date(t.timestamp);
                const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{t.id}</p>
                      <p className="text-xs text-muted-foreground">{date} {time} · {t.items.length} item</p>
                    </div>
                    <p className="text-sm font-semibold text-primary ml-4 flex-shrink-0">{formatRupiah(t.total)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
