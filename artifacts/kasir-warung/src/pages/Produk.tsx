import { useState, useMemo, useCallback, useRef } from "react";
import { Plus, Search, Edit2, Trash2, Star, Package, Camera, ImagePlus, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Product, getProducts, setProducts } from "@/lib/storage";
import { formatRupiah, generateBarcode } from "@/lib/calculations";

const BASE_CATEGORIES = ["Makanan", "Minuman", "Snack", "Rokok", "Sembako"];
const CATEGORY_LAINNYA = "Lainnya";

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  barcode: z.string().min(1, "Barcode wajib diisi"),
  price: z.coerce.number().int().min(0, "Harga tidak boleh negatif"),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
  category: z.string().min(1, "Kategori wajib diisi"),
  stockThreshold: z.coerce.number().int().min(0),
  imageUrl: z.string().optional(),
  isFavorite: z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

function compressImage(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock === 0) return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">Habis</Badge>;
  if (stock <= threshold) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Menipis</Badge>;
  return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">OK</Badge>;
}

// Determine if a category is one of the base presets or a custom one
function isBaseCategory(cat: string): boolean {
  return BASE_CATEGORIES.includes(cat);
}

export default function Produk() {
  const { toast } = useToast();
  const [products, setProductsState] = useState<Product[]>(() => getProducts());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("semua");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");

  // For the "Lainnya" custom category input
  const [categorySelectVal, setCategorySelectVal] = useState("Makanan");
  const [customCategory, setCustomCategory] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", barcode: "", price: 0, stock: 0, category: "Makanan", stockThreshold: 10, imageUrl: "", isFavorite: false },
  });

  // All unique categories from existing products (for filter)
  const allCategories = useMemo(() => {
    const cats = new Set<string>(BASE_CATEGORIES);
    products.forEach(p => cats.add(p.category));
    return ["semua", ...Array.from(cats).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
    }
    if (categoryFilter !== "semua") list = list.filter(p => p.category === categoryFilter);
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price") return a.price - b.price;
      return a.stock - b.stock;
    });
  }, [products, search, categoryFilter, sortBy]);

  const openAdd = useCallback(() => {
    setEditingProduct(null);
    setImagePreview("");
    setCategorySelectVal("Makanan");
    setCustomCategory("");
    form.reset({ name: "", barcode: generateBarcode(), price: 0, stock: 0, category: "Makanan", stockThreshold: 10, imageUrl: "", isFavorite: false });
    setDialogOpen(true);
  }, [form]);

  const openEdit = useCallback((p: Product) => {
    setEditingProduct(p);
    setImagePreview(p.imageUrl ?? "");
    const isBase = isBaseCategory(p.category);
    setCategorySelectVal(isBase ? p.category : CATEGORY_LAINNYA);
    setCustomCategory(isBase ? "" : p.category);
    form.reset({ name: p.name, barcode: p.barcode, price: p.price, stock: p.stock, category: p.category, stockThreshold: p.stockThreshold, imageUrl: p.imageUrl ?? "", isFavorite: p.isFavorite });
    setDialogOpen(true);
  }, [form]);

  const handleCategorySelectChange = useCallback((val: string) => {
    setCategorySelectVal(val);
    if (val !== CATEGORY_LAINNYA) {
      setCustomCategory("");
      form.setValue("category", val, { shouldValidate: true });
    } else {
      // Will be set via customCategory input
      form.setValue("category", customCategory || "", { shouldValidate: false });
    }
  }, [form, customCategory]);

  const handleCustomCategoryChange = useCallback((val: string) => {
    setCustomCategory(val);
    form.setValue("category", val, { shouldValidate: true });
  }, [form]);

  const handleImageFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400);
      setImagePreview(compressed);
      form.setValue("imageUrl", compressed);
      toast({ title: "Foto berhasil ditambahkan" });
    } catch {
      toast({ title: "Gagal memproses foto", variant: "destructive" });
    }
  }, [form, toast]);

  const handleCameraInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageFile(e.target.files?.[0]);
    e.target.value = "";
  }, [handleImageFile]);

  const clearImage = useCallback(() => {
    setImagePreview("");
    form.setValue("imageUrl", "");
  }, [form]);

  const onSubmit = useCallback((data: FormData) => {
    // If "Lainnya" was selected but custom text is empty, reject
    if (categorySelectVal === CATEGORY_LAINNYA && !customCategory.trim()) {
      form.setError("category", { message: "Tulis nama kategori kustom" });
      return;
    }
    const now = new Date().toISOString();
    const updated = editingProduct
      ? products.map(p => p.id === editingProduct.id ? { ...p, ...data, updatedAt: now } : p)
      : [...products, { ...data, id: String(Date.now()), createdAt: now, updatedAt: now }];
    setProducts(updated);
    setProductsState(updated);
    setDialogOpen(false);
    toast({ title: editingProduct ? "Produk diperbarui" : "Produk ditambahkan" });
  }, [editingProduct, products, toast, categorySelectVal, customCategory, form]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    const updated = products.filter(p => p.id !== deleteId);
    setProducts(updated);
    setProductsState(updated);
    setDeleteId(null);
    toast({ title: "Produk dihapus" });
  }, [deleteId, products, toast]);

  const toggleFavorite = useCallback((id: string) => {
    const updated = products.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
    setProducts(updated);
    setProductsState(updated);
  }, [products]);

  const handleBarcodeScan = useCallback((barcode: string) => {
    form.setValue("barcode", barcode, { shouldValidate: true });
    setScannerOpen(false);
    toast({ title: `Barcode: ${barcode}` });
  }, [form, toast]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Produk</h1>
          <p className="text-sm text-muted-foreground">{products.length} produk terdaftar</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-product" className="gap-2">
          <Plus className="w-4 h-4" /> Tambah
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search-product" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau barcode..." className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-category-filter">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            {allCategories.map(c => (
              <SelectItem key={c} value={c}>{c === "semua" ? "Semua Kategori" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as "name" | "price" | "stock")}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nama</SelectItem>
            <SelectItem value="price">Harga</SelectItem>
            <SelectItem value="stock">Stok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">Tidak ada produk</p>
          <p className="text-sm text-muted-foreground mt-1">Tambahkan produk baru untuk memulai</p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Produk</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Harga</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Stok</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} data-testid={`row-product-${p.id}`} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <button onClick={() => toggleFavorite(p.id)} data-testid={`button-favorite-${p.id}`} className="flex-shrink-0 text-muted-foreground hover:text-yellow-400 transition-colors">
                          <Star className={`w-3.5 h-3.5 ${p.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                        </button>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-muted-foreground">{p.barcode}</span>
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                              <Tag className="w-2.5 h-2.5" />{p.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{formatRupiah(p.price)}</td>
                    <td className="px-4 py-3 text-right text-foreground font-medium">{p.stock}</td>
                    <td className="px-4 py-3 text-center"><StockBadge stock={p.stock} threshold={p.stockThreshold} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} data-testid={`button-edit-${p.id}`} className="h-8 w-8">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} data-testid={`button-delete-${p.id}`} className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10">
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Image upload */}
              <div>
                <p className="text-sm font-medium mb-2">Foto Produk</p>
                {imagePreview ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border bg-secondary">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    <button type="button" onClick={clearImage} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImagePlus className="w-8 h-8" />
                    <p className="text-xs">Belum ada foto</p>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" className="flex-1 gap-2 text-sm" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-4 h-4" /> Kamera
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 gap-2 text-sm" onClick={() => galleryInputRef.current?.click()}>
                    <ImagePlus className="w-4 h-4" /> Galeri
                  </Button>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraInput} />
                <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleCameraInput} />
              </div>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Produk</FormLabel>
                  <FormControl><Input {...field} data-testid="input-product-name" placeholder="Indomie Goreng" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="barcode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} data-testid="input-product-barcode" placeholder="8968601000100" className="font-mono flex-1" />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)} title="Scan barcode" data-testid="button-scan-barcode-camera">
                      <Camera className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => form.setValue("barcode", generateBarcode())} data-testid="button-generate-barcode">
                      Generate
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga (Rp)</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" inputMode="numeric" data-testid="input-product-price" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stock" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" inputMode="numeric" data-testid="input-product-stock" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category with custom input */}
                <FormField control={form.control} name="category" render={() => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select value={categorySelectVal} onValueChange={handleCategorySelectChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BASE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        <SelectItem value={CATEGORY_LAINNYA}>Lainnya (kustom)…</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Custom category input shown when "Lainnya" is selected */}
                    {categorySelectVal === CATEGORY_LAINNYA && (
                      <div className="mt-2">
                        <Input
                          value={customCategory}
                          onChange={e => handleCustomCategoryChange(e.target.value)}
                          placeholder="Tulis kategori, cth: Skincare, Jus, Kosmetik"
                          className="text-sm"
                          autoFocus
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stockThreshold" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. Stok</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" inputMode="numeric" data-testid="input-product-threshold" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter className="gap-2 flex-wrap pt-2">
                {editingProduct && (
                  <Button type="button" variant="destructive" onClick={() => { setDialogOpen(false); setDeleteId(editingProduct.id); }} data-testid="button-delete-from-edit" className="mr-auto">
                    <Trash2 className="w-4 h-4 mr-1" /> Hapus
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit" data-testid="button-save-product">{editingProduct ? "Simpan" : "Tambahkan"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <BarcodeScanner open={scannerOpen} onScan={handleBarcodeScan} onClose={() => setScannerOpen(false)} title="Scan Barcode Produk" />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Produk <span className="font-semibold text-foreground">{products.find(p => p.id === deleteId)?.name}</span> akan dihapus permanen. Yakin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="button-confirm-delete">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
