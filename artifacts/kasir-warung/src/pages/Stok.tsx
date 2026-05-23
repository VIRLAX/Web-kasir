import { useState, useMemo, useCallback } from "react";
import { AlertTriangle, PackagePlus, History, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Product, RestockLog, getProducts, setProducts, getRestockLogs, setRestockLogs } from "@/lib/storage";
import { formatRupiah, formatDate } from "@/lib/calculations";

type FilterType = "semua" | "low" | "out";

function StockBar({ stock, threshold }: { stock: number; threshold: number }) {
  const max = Math.max(stock, threshold * 2, 10);
  const pct = Math.min(100, Math.round((stock / max) * 100));
  const color = stock === 0 ? "bg-destructive" : stock <= threshold ? "bg-yellow-500" : "bg-primary";
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden w-20">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Stok() {
  const { toast } = useToast();
  const [products, setProductsState] = useState<Product[]>(() => getProducts());
  const [logs, setLogsState] = useState<RestockLog[]>(() => getRestockLogs());
  const [filter, setFilter] = useState<FilterType>("semua");
  const [restockDialog, setRestockDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [restockQty, setRestockQty] = useState("");
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");

  const criticalProducts = useMemo(() => products.filter(p => p.stock <= p.stockThreshold), [products]);
  const outProducts = useMemo(() => products.filter(p => p.stock === 0), [products]);

  const filtered = useMemo(() => {
    if (filter === "low") return products.filter(p => p.stock > 0 && p.stock <= p.stockThreshold);
    if (filter === "out") return products.filter(p => p.stock === 0);
    return [...products].sort((a, b) => a.stock - b.stock);
  }, [products, filter]);

  const handleRestock = useCallback(() => {
    const qty = parseInt(restockQty, 10);
    if (!selectedProductId || isNaN(qty) || qty <= 0) {
      toast({ title: "Input tidak valid", variant: "destructive" });
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const now = new Date().toISOString();
    const updatedProducts = products.map(p =>
      p.id === selectedProductId ? { ...p, stock: p.stock + qty, updatedAt: now } : p
    );
    const newLog: RestockLog = {
      id: String(Date.now()),
      productId: selectedProductId,
      productName: product.name,
      qty,
      timestamp: now,
    };
    const updatedLogs = [newLog, ...logs];

    setProducts(updatedProducts);
    setProductsState(updatedProducts);
    setRestockLogs(updatedLogs);
    setLogsState(updatedLogs);
    setRestockDialog(false);
    setRestockQty("");
    toast({ title: `Restock ${product.name}: +${qty}` });
  }, [selectedProductId, restockQty, products, logs, toast]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Stok</h1>
          <p className="text-sm text-muted-foreground">Monitoring & restock barang</p>
        </div>
        <Button onClick={() => { setSelectedProductId(""); setRestockQty(""); setRestockDialog(true); }} className="gap-2" data-testid="button-restock">
          <PackagePlus className="w-4 h-4" /> Restock
        </Button>
      </div>

      {/* Alert cards */}
      {(outProducts.length > 0 || criticalProducts.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {outProducts.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">{outProducts.length} Produk Habis</p>
                <p className="text-xs text-muted-foreground mt-0.5">{outProducts.map(p => p.name).join(", ")}</p>
              </div>
            </div>
          )}
          {criticalProducts.filter(p => p.stock > 0).length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-400">{criticalProducts.filter(p => p.stock > 0).length} Stok Menipis</p>
                <p className="text-xs text-muted-foreground mt-0.5">{criticalProducts.filter(p => p.stock > 0).map(p => p.name).join(", ")}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab("stock")} data-testid="tab-stock" className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === "stock" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <Layers className="w-3.5 h-3.5" /> Stok
        </button>
        <button onClick={() => setActiveTab("history")} data-testid="tab-history" className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <History className="w-3.5 h-3.5" /> Riwayat Restock
        </button>
      </div>

      {activeTab === "stock" && (
        <>
          <div className="flex gap-2">
            {(["semua", "low", "out"] as FilterType[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} data-testid={`filter-${f}`} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {f === "semua" ? "Semua" : f === "low" ? "Menipis" : "Habis"}
              </button>
            ))}
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-foreground font-medium">Tidak ada produk</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Produk</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Harga</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Stok</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Min.</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Level</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} data-testid={`row-stock-${p.id}`} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">{formatRupiah(p.price)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${p.stock === 0 ? "text-destructive" : p.stock <= p.stockThreshold ? "text-yellow-400" : "text-primary"}`}>{p.stock}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p.stockThreshold}</td>
                        <td className="px-4 py-3"><StockBar stock={p.stock} threshold={p.stockThreshold} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedProductId(p.id); setRestockQty(""); setRestockDialog(true); }} data-testid={`button-restock-${p.id}`} className="h-7 text-xs gap-1">
                            <PackagePlus className="w-3 h-3" /> Restock
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-foreground font-medium">Belum ada riwayat restock</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Produk</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} data-testid={`row-restock-${log.id}`} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="px-4 py-3 font-medium text-foreground">{log.productName}</td>
                      <td className="px-4 py-3 text-right text-primary font-semibold">+{log.qty}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">{formatDate(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Restock Dialog */}
      <Dialog open={restockDialog} onOpenChange={setRestockDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Restock Stok</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Produk</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger data-testid="select-restock-product"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (stok: {p.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Jumlah Tambah</label>
              <Input type="number" min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="0" data-testid="input-restock-qty" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockDialog(false)}>Batal</Button>
            <Button onClick={handleRestock} data-testid="button-confirm-restock">Tambah Stok</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
