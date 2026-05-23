import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Star, Package } from "lucide-react";
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
import { Product, getProducts, setProducts } from "@/lib/storage";
import { formatRupiah, generateBarcode } from "@/lib/calculations";

const CATEGORIES = ["Makanan", "Minuman", "Snack", "Rokok", "Sembako", "Lainnya"];

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  barcode: z.string().min(1, "Barcode wajib diisi"),
  price: z.coerce.number().int().min(0, "Harga tidak boleh negatif"),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  stockThreshold: z.coerce.number().int().min(0),
  imageUrl: z.string().optional(),
  isFavorite: z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock === 0) return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">Habis</Badge>;
  if (stock <= threshold) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Menipis</Badge>;
  return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">OK</Badge>;
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

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { name: "", barcode: "", price: 0, stock: 0, category: "Makanan", stockThreshold: 10, imageUrl: "", isFavorite: false } });

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
    form.reset({ name: "", barcode: generateBarcode(), price: 0, stock: 0, category: "Makanan", stockThreshold: 10, imageUrl: "", isFavorite: false });
    setDialogOpen(true);
  }, [form]);

  const openEdit = useCallback((p: Product) => {
    setEditingProduct(p);
    form.reset({ name: p.name, barcode: p.barcode, price: p.price, stock: p.stock, category: p.category, stockThreshold: p.stockThreshold, imageUrl: p.imageUrl ?? "", isFavorite: p.isFavorite });
    setDialogOpen(true);
  }, [form]);

  const onSubmit = useCallback((data: FormData) => {
    const now = new Date().toISOString();
    const updated = editingProduct
      ? products.map(p => p.id === editingProduct.id ? { ...p, ...data, updatedAt: now } : p)
      : [...products, { ...data, id: String(Date.now()), createdAt: now, updatedAt: now }];
    setProducts(updated);
    setProductsState(updated);
    setDialogOpen(false);
    toast({ title: editingProduct ? "Produk diperbarui" : "Produk ditambahkan" });
  }, [editingProduct, products, toast]);

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

  return (
    <div className="p-4 md:p-6 space-y-4">
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
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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

      {/* Table */}
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
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Produk</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Harga</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Stok</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} data-testid={`row-product-${p.id}`} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleFavorite(p.id)} data-testid={`button-favorite-${p.id}`} className="flex-shrink-0 text-muted-foreground hover:text-yellow-400 transition-colors">
                          <Star className={`w-3.5 h-3.5 ${p.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                        </button>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category} · {p.barcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{formatRupiah(p.price)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{p.stock}</td>
                    <td className="px-4 py-3 text-center"><StockBadge stock={p.stock} threshold={p.stockThreshold} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} data-testid={`button-edit-${p.id}`} className="h-8 w-8">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} data-testid={`button-delete-${p.id}`} className="h-8 w-8 text-destructive hover:text-destructive">
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
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Produk</FormLabel>
                  <FormControl><Input {...field} data-testid="input-product-name" placeholder="Indomie Goreng" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2">
                <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Barcode</FormLabel>
                    <FormControl><Input {...field} data-testid="input-product-barcode" placeholder="8968601000100" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => form.setValue("barcode", generateBarcode())} data-testid="button-generate-barcode">
                    Generate
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga (Rp)</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" data-testid="input-product-price" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stock" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" data-testid="input-product-stock" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-product-category"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stockThreshold" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. Stok</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" data-testid="input-product-threshold" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Gambar (opsional)</FormLabel>
                  <FormControl><Input {...field} data-testid="input-product-image" placeholder="https://..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit" data-testid="button-save-product">{editingProduct ? "Simpan" : "Tambahkan"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>Produk ini akan dihapus permanen. Yakin?</AlertDialogDescription>
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
