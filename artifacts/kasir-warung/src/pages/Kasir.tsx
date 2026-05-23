import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, Minus, Trash2, ShoppingCart, Scan, Star, Search, X, CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Product, CartItem, Transaction, getProducts, setProducts, getTransactions, setTransactions, getSettings } from "@/lib/storage";
import { calculateTotals, formatRupiah, generateTransactionId } from "@/lib/calculations";

const DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

// Parse "k" shorthand: "50k" → 50000, "2.5k" → 2500, "20000" → 20000
function parseKAmount(val: string): number {
  const s = val.trim().toLowerCase();
  if (!s || s === "0") return 0;
  if (s.endsWith("k")) {
    const n = parseFloat(s.slice(0, -1));
    return isNaN(n) ? 0 : Math.round(n * 1000);
  }
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function ReceiptModal({ transaction, storeName, onClose }: { transaction: Transaction; storeName: string; onClose: () => void }) {
  const d = new Date(transaction.timestamp);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" /> Transaksi Berhasil
          </DialogTitle>
        </DialogHeader>
        <div className="font-mono text-sm space-y-3">
          <div className="text-center border-b border-border pb-3">
            <p className="font-bold">{storeName}</p>
            <p className="text-xs text-muted-foreground">{transaction.id}</p>
            <p className="text-xs text-muted-foreground">
              {d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}{" "}
              {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="space-y-1.5">
            {transaction.items.map((item, i) => {
              const lineTotal = item.price * item.qty - item.discount;
              return (
                <div key={i}>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.qty} x {formatRupiah(item.price)}{item.discount > 0 ? ` (disc ${formatRupiah(item.discount)})` : ""}</span>
                    <span className="text-foreground">{formatRupiah(lineTotal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border pt-3 space-y-1">
            {transaction.discountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-destructive">-{formatRupiah(transaction.discountTotal)}</span>
              </div>
            )}
            {transaction.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak</span>
                <span>{formatRupiah(transaction.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>TOTAL</span>
              <span className="text-primary">{formatRupiah(transaction.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bayar</span>
              <span>{formatRupiah(transaction.paid)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Kembalian</span>
              <span className="text-green-400">{formatRupiah(transaction.change)}</span>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground border-t border-border pt-2">Terima kasih!</p>
        </div>
        <Button onClick={onClose} className="w-full mt-2" data-testid="button-close-receipt">Tutup</Button>
      </DialogContent>
    </Dialog>
  );
}

export default function Kasir() {
  const { toast } = useToast();
  const settings = useMemo(() => getSettings(), []);
  const [products, setProductsState] = useState<Product[]>(() => getProducts());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("semua");
  const [cashInput, setCashInput] = useState("");
  const [receiptTrx, setReceiptTrx] = useState<Transaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const cashRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return ["semua", ...cats.sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter !== "semua") list = list.filter(p => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
    }
    return list;
  }, [products, categoryFilter, search]);

  const favorites = useMemo(() => products.filter(p => p.isFavorite), [products]);

  const totals = useMemo(() => calculateTotals(cart, settings), [cart, settings]);

  const cashAmount = useMemo(() => parseKAmount(cashInput), [cashInput]);

  const change = useMemo(() => Math.max(0, cashAmount - totals.total), [cashAmount, totals.total]);
  const canCheckout = cart.length > 0 && cashAmount >= totals.total && totals.total > 0 && !isProcessing;

  // Auto focus barcode on mount
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          (e.target as HTMLInputElement).blur?.();
          handleClearCart();
        }
        return;
      }
      if (e.key === "Enter" && canCheckout) handleCheckout();
      if (e.key === "Escape") handleClearCart();
      if (e.key === "F2") { e.preventDefault(); barcodeRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canCheckout, cart]);

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      toast({ title: `Stok ${product.name} habis`, variant: "destructive" });
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        const currentQty = existing.qty;
        if (currentQty >= product.stock) {
          toast({ title: `Stok tidak cukup (maks: ${product.stock})`, variant: "destructive" });
          return prev;
        }
        return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1, discount: 0 }];
    });
  }, [toast]);

  const handleBarcodeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const val = barcodeInput.trim();
    if (!val) return;
    const product = products.find(p => p.barcode === val);
    if (!product) {
      toast({ title: `Barcode tidak ditemukan: ${val}`, variant: "destructive" });
    } else {
      addToCart(product);
    }
    setBarcodeInput("");
  }, [barcodeInput, products, addToCart, toast]);

  // Called when camera scanner finds a barcode
  const handleCameraScan = useCallback((barcode: string) => {
    setScannerOpen(false);
    const product = products.find(p => p.barcode === barcode);
    if (!product) {
      toast({ title: `Barcode tidak ditemukan: ${barcode}`, variant: "destructive" });
    } else {
      addToCart(product);
      toast({ title: `✓ ${product.name} ditambahkan` });
    }
  }, [products, addToCart, toast]);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.productId !== productId);
      const product = products.find(p => p.id === productId);
      if (product && newQty > product.stock) {
        toast({ title: `Stok tidak cukup (maks: ${product.stock})`, variant: "destructive" });
        return prev;
      }
      return prev.map(i => i.productId === productId ? { ...i, qty: newQty } : i);
    });
  }, [products, toast]);

  const updateDiscount = useCallback((productId: string, discountStr: string) => {
    const disc = Math.max(0, parseInt(discountStr.replace(/\D/g, ""), 10) || 0);
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, discount: disc } : i));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
    setCashInput("");
    setBarcodeInput("");
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, []);

  const handleCheckout = useCallback(() => {
    if (!canCheckout) return;
    setIsProcessing(true);

    try {
      const transactions = getTransactions();
      const todayTrxCount = transactions.filter(t => {
        const d = new Date(t.timestamp);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      }).length;

      const id = generateTransactionId(todayTrxCount);
      const now = new Date().toISOString();

      const newTrx: Transaction = {
        id,
        items: cart,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        tax: totals.tax,
        taxRate: settings.taxRate,
        total: totals.total,
        paid: cashAmount,
        change,
        timestamp: now,
      };

      // Reduce stock
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(c => c.productId === p.id);
        if (!cartItem) return p;
        return { ...p, stock: p.stock - cartItem.qty, updatedAt: now };
      });

      setTransactions([...transactions, newTrx]);
      setProducts(updatedProducts);
      setProductsState(updatedProducts);

      setReceiptTrx(newTrx);
      setCart([]);
      setCashInput("");
      setBarcodeInput("");
    } catch (err) {
      toast({ title: "Terjadi kesalahan saat checkout", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [canCheckout, cart, totals, cashAmount, change, products, settings, toast]);

  const handleReceiptClose = useCallback(() => {
    setReceiptTrx(null);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, []);

  // Whether cashInput uses "k" and shows a converted hint
  const cashHint = useMemo(() => {
    const s = cashInput.trim().toLowerCase();
    if (s.endsWith("k") && cashAmount > 0) return formatRupiah(cashAmount);
    return null;
  }, [cashInput, cashAmount]);

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Left panel — product browser */}
      <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-border min-h-0">
        {/* Barcode input */}
        <div className="p-3 border-b border-border bg-card/50 flex-shrink-0">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                data-testid="input-barcode"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Ketik / scan barcode..."
                className="pl-9 font-mono text-sm bg-background"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setScannerOpen(true)}
              data-testid="button-camera-scan"
              title="Scan dengan kamera"
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button type="submit" variant="outline" size="icon" data-testid="button-barcode-submit">
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Search + category filter */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-kasir"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                data-testid={`filter-cat-${cat}`}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {cat === "semua" ? "Semua" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Favorites row */}
        {favorites.length > 0 && !search && categoryFilter === "semua" && (
          <div className="px-3 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Star className="w-3 h-3" /> Favorit
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {favorites.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  data-testid={`btn-favorite-${p.id}`}
                  className="flex-shrink-0 bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-lg px-3 py-2 text-left transition-colors"
                >
                  <p className="text-xs font-medium text-primary whitespace-nowrap">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatRupiah(p.price)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="w-8 h-8 mb-2" />
              <p className="text-sm">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  data-testid={`btn-product-${p.id}`}
                  disabled={p.stock === 0}
                  className={`bg-card border rounded-xl p-3 text-left transition-all hover:border-primary/40 hover:bg-card/80 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${p.stock <= p.stockThreshold && p.stock > 0 ? "border-yellow-500/40" : "border-card-border"}`}
                >
                  <p className="font-medium text-sm text-foreground leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-xs text-primary font-semibold mt-1">{formatRupiah(p.price)}</p>
                  <p className={`text-xs mt-0.5 ${p.stock === 0 ? "text-destructive" : p.stock <= p.stockThreshold ? "text-yellow-400" : "text-muted-foreground"}`}>
                    Stok: {p.stock}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — cart */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col flex-shrink-0 bg-card/30 max-h-[50vh] md:max-h-full overflow-hidden">
        {/* Cart header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Keranjang</span>
            {cart.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{cart.reduce((s, i) => s + i.qty, 0)}</span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={handleClearCart} data-testid="button-clear-cart" className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" /> Kosongkan
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs mt-1 opacity-70">Scan barcode atau pilih produk</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => {
                const lineTotal = item.price * item.qty - item.discount;
                return (
                  <div key={item.productId} data-testid={`cart-item-${item.productId}`} className="bg-card border border-card-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground leading-tight flex-1 min-w-0">{item.name}</p>
                      <button onClick={() => removeFromCart(item.productId)} data-testid={`btn-remove-${item.productId}`} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatRupiah(item.price)}/item</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.productId, -1)} data-testid={`btn-minus-${item.productId}`} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold" data-testid={`qty-${item.productId}`}>{item.qty}</span>
                        <button onClick={() => updateQty(item.productId, 1)} data-testid={`btn-plus-${item.productId}`} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{formatRupiah(lineTotal)}</span>
                    </div>
                    <div className="mt-2">
                      <Input
                        type="number"
                        min="0"
                        value={item.discount || ""}
                        onChange={e => updateDiscount(item.productId, e.target.value)}
                        placeholder="Diskon item (Rp)"
                        data-testid={`input-discount-${item.productId}`}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment panel */}
        <div className="flex-shrink-0 border-t border-border bg-card p-4 space-y-3">
          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRupiah(totals.subtotal)}</span>
            </div>
            {totals.discountTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-destructive">-{formatRupiah(totals.discountTotal)}</span>
              </div>
            )}
            {settings.taxEnabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pajak ({Math.round(settings.taxRate * 100)}%)</span>
                <span>{formatRupiah(totals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-border pt-1.5">
              <span>TOTAL</span>
              <span className="text-primary" data-testid="text-total">{formatRupiah(totals.total)}</span>
            </div>
          </div>

          {/* Cash input with "k" support */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground">Uang Diterima</p>
              <p className="text-xs text-muted-foreground">contoh: <span className="text-primary font-mono">50k</span> = Rp 50.000</p>
            </div>
            <Input
              ref={cashRef}
              type="text"
              inputMode="decimal"
              value={cashInput}
              onChange={e => setCashInput(e.target.value)}
              placeholder="0 atau 50k"
              data-testid="input-cash"
              className="text-base font-semibold"
              autoComplete="off"
            />
            {/* Show converted amount when "k" is used */}
            {cashHint && (
              <p className="text-xs text-primary mt-1 font-medium">= {cashHint}</p>
            )}
            {/* Denomination buttons */}
            <div className="flex flex-wrap gap-1 mt-2">
              {DENOMINATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setCashInput(String(cashAmount + d))}
                  data-testid={`btn-denom-${d}`}
                  className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/70 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  +{d >= 1000 ? `${d / 1000}k` : d}
                </button>
              ))}
              {totals.total > 0 && (
                <button
                  onClick={() => setCashInput(String(totals.total))}
                  data-testid="btn-exact"
                  className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 rounded-md text-primary transition-colors"
                >
                  Pas
                </button>
              )}
            </div>
          </div>

          {/* Change */}
          {cashAmount > 0 && totals.total > 0 && (
            <div className={`flex justify-between text-sm font-semibold rounded-lg p-2 ${cashAmount >= totals.total ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
              <span>{cashAmount >= totals.total ? "Kembalian" : "Kurang"}</span>
              <span data-testid="text-change">{formatRupiah(Math.abs(cashAmount - totals.total))}</span>
            </div>
          )}

          {/* Checkout button */}
          <Button
            onClick={handleCheckout}
            disabled={!canCheckout}
            data-testid="button-checkout"
            className="w-full h-12 text-base font-bold"
          >
            {isProcessing ? "Memproses..." : "BAYAR"}
          </Button>
        </div>
      </div>

      {/* Camera Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onScan={handleCameraScan}
        onClose={() => setScannerOpen(false)}
        title="Scan Barcode Produk"
      />

      {receiptTrx && (
        <ReceiptModal
          transaction={receiptTrx}
          storeName={settings.storeName}
          onClose={handleReceiptClose}
        />
      )}
    </div>
  );
}
