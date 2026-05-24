import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, Minus, Trash2, ShoppingCart, Scan, Star, Search, X, CheckCircle, Camera, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Product, CartItem, Transaction, getProducts, setProducts, getTransactions, setTransactions, getSettings } from "@/lib/storage";
import { calculateTotals, formatRupiah, generateTransactionId } from "@/lib/calculations";

const DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

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
  const cashAmount = useMemo(() => {
    const s = cashInput.trim().toLowerCase();
    if (!s) return 0;
    const kMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*k$/);
    if (kMatch) return Math.round(parseFloat(kMatch[1].replace(",", ".")) * 1000);
    const plain = parseFloat(s.replace(/[^0-9.,]/g, "").replace(",", "."));
    return isNaN(plain) ? 0 : Math.round(plain);
  }, [cashInput]);
  const change = useMemo(() => Math.max(0, cashAmount - totals.total), [cashAmount, totals.total]);
  const canCheckout = cart.length > 0 && cashAmount >= totals.total && totals.total > 0 && !isProcessing;

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") {
        if (e.key === "Escape") { (e.target as HTMLInputElement).blur?.(); handleClearCart(); }
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
        if (existing.qty >= product.stock) {
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
        id, items: cart,
        subtotal: totals.subtotal, discountTotal: totals.discountTotal,
        tax: totals.tax, taxRate: settings.taxRate,
        total: totals.total, paid: cashAmount, change,
        timestamp: now,
      };

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
    } catch {
      toast({ title: "Terjadi kesalahan saat checkout", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [canCheckout, cart, totals, cashAmount, change, products, settings, toast]);

  const handleReceiptClose = useCallback(() => {
    setReceiptTrx(null);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* ── Left panel: product browser ── */}
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
            <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)} data-testid="button-camera-scan" title="Scan dengan kamera">
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
            <Input data-testid="input-search-kasir" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk..." className="pl-9 text-sm" />
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
                  disabled={p.stock === 0}
                  className="flex-shrink-0 bg-primary/10 border border-primary/20 hover:bg-primary/20 disabled:opacity-40 rounded-lg px-3 py-2 text-left transition-colors"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.productId === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    data-testid={`btn-product-${p.id}`}
                    disabled={p.stock === 0}
                    className={`relative bg-card border rounded-xl p-3 text-left transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                      inCart
                        ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
                        : p.stock <= p.stockThreshold && p.stock > 0
                          ? "border-yellow-500/40 hover:border-yellow-400/60"
                          : "border-card-border hover:border-primary/30 hover:bg-card/80"
                    }`}
                  >
                    {/* Product image */}
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-2 border border-border" />
                    ) : (
                      <div className="w-full aspect-square rounded-lg mb-2 bg-secondary/50 flex items-center justify-center border border-border">
                        <Package className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <p className="font-medium text-sm text-foreground leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-xs text-primary font-semibold mt-1">{formatRupiah(p.price)}</p>
                    <p className={`text-xs mt-0.5 ${p.stock === 0 ? "text-destructive" : p.stock <= p.stockThreshold ? "text-yellow-400" : "text-muted-foreground"}`}>
                      Stok: {p.stock}
                    </p>
                    {/* In-cart badge */}
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {inCart.qty}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: cart ── */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col flex-shrink-0 bg-card/30 max-h-[55vh] md:max-h-full overflow-hidden">

        {/* Cart header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Keranjang</span>
            {cart.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
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
                  <div key={item.productId} data-testid={`cart-item-${item.productId}`} className="bg-card border border-card-border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatRupiah(item.price)} / item</p>
                      </div>
                      <button onClick={() => removeFromCart(item.productId)} data-testid={`btn-remove-${item.productId}`} className="text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0 p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.productId, -1)} data-testid={`btn-minus-${item.productId}`} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 active:scale-95 transition-all">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold" data-testid={`qty-${item.productId}`}>{item.qty}</span>
                        <button onClick={() => updateQty(item.productId, 1)} data-testid={`btn-plus-${item.productId}`} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 active:scale-95 transition-all">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-foreground">{formatRupiah(lineTotal)}</span>
                    </div>
                    {/* Discount input */}
                    <div className="mt-2">
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
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

        {/* ── Payment panel ── */}
        <div className="flex-shrink-0 border-t border-border bg-card p-4 space-y-3">
          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground">{formatRupiah(totals.subtotal)}</span>
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
                <span className="text-foreground">{formatRupiah(totals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-1 border-t border-border mt-1">
              <span>TOTAL</span>
              <span className="text-primary" data-testid="text-total">{formatRupiah(totals.total)}</span>
            </div>
          </div>

          {/* Uang Diterima — text input, supports "2k" = 2000, "50k" = 50000 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Uang Diterima</p>
            <div className="relative">
              <Input
                type="text"
                value={cashInput}
                onChange={e => setCashInput(e.target.value)}
                placeholder='cth: 50000 atau 50k'
                data-testid="input-cash"
                className="text-base font-semibold pr-10"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {cashInput && (
                <button
                  type="button"
                  onClick={() => setCashInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Live conversion display */}
            {cashInput && cashAmount > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span className="font-semibold text-foreground">{formatRupiah(cashAmount)}</span>
              </div>
            )}
            {/* Quick amount buttons */}
            <div className="flex flex-wrap gap-1 mt-2">
              {DENOMINATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setCashInput(String(cashAmount + d))}
                  data-testid={`btn-denom-${d}`}
                  className="text-xs px-2.5 py-1 bg-secondary hover:bg-secondary/70 active:scale-95 rounded-md text-muted-foreground hover:text-foreground transition-all"
                >
                  +{d >= 1000 ? `${d / 1000}k` : d}
                </button>
              ))}
              {totals.total > 0 && (
                <button
                  onClick={() => setCashInput(String(totals.total))}
                  data-testid="btn-exact"
                  className="text-xs px-2.5 py-1 bg-primary/15 hover:bg-primary/25 active:scale-95 rounded-md text-primary font-medium transition-all"
                >
                  Pas
                </button>
              )}
              {cashInput && (
                <button
                  onClick={() => setCashInput("")}
                  className="text-xs px-2.5 py-1 bg-destructive/10 hover:bg-destructive/20 active:scale-95 rounded-md text-destructive transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Change indicator */}
          {cashAmount > 0 && totals.total > 0 && (
            <div className={`flex justify-between items-center text-sm font-semibold rounded-xl px-3 py-2.5 ${
              cashAmount >= totals.total
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              <span>{cashAmount >= totals.total ? "Kembalian" : "Kurang"}</span>
              <span data-testid="text-change" className="font-bold">{formatRupiah(Math.abs(cashAmount - totals.total))}</span>
            </div>
          )}

          {/* Checkout */}
          <Button
            onClick={handleCheckout}
            disabled={!canCheckout}
            data-testid="button-checkout"
            className="w-full h-12 text-base font-bold rounded-xl"
          >
            {isProcessing ? "Memproses..." : "BAYAR"}
          </Button>
        </div>
      </div>

      <BarcodeScanner open={scannerOpen} onScan={handleCameraScan} onClose={() => setScannerOpen(false)} title="Scan Barcode Produk" />

      {receiptTrx && (
        <ReceiptModal transaction={receiptTrx} storeName={settings.storeName} onClose={handleReceiptClose} />
      )}
    </div>
  );
}
