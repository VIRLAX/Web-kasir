# Kasir Warung

Aplikasi web kasir modern untuk warung/minimarket Indonesia — POS system offline-first dengan semua fitur yang dibutuhkan toko nyata.

## Run & Operate

- `pnpm --filter @workspace/kasir-warung run dev` — jalankan aplikasi kasir (port 26005)
- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port 8080)
- `pnpm run typecheck` — typecheck seluruh package
- `pnpm run build` — typecheck + build semua package

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4
- Routing: Wouter
- Charts: Recharts
- Forms: React Hook Form + Zod
- UI: Shadcn/ui components
- State: React state + localStorage (offline-first, no backend needed)
- DB: PostgreSQL + Drizzle ORM (untuk API server, tidak dipakai oleh kasir)

## Where things live

- `artifacts/kasir-warung/src/pages/Kasir.tsx` — halaman utama POS/kasir
- `artifacts/kasir-warung/src/pages/Produk.tsx` — manajemen produk CRUD
- `artifacts/kasir-warung/src/pages/Stok.tsx` — monitoring & restock stok
- `artifacts/kasir-warung/src/pages/Transaksi.tsx` — riwayat transaksi
- `artifacts/kasir-warung/src/pages/Dashboard.tsx` — analytics & KPI
- `artifacts/kasir-warung/src/pages/Laporan.tsx` — laporan & ekspor
- `artifacts/kasir-warung/src/lib/storage.ts` — localStorage helpers & data types
- `artifacts/kasir-warung/src/lib/calculations.ts` — kalkulasi harga, format Rupiah
- `artifacts/kasir-warung/src/lib/export.ts` — ekspor TXT / JSON / CSV

## Architecture decisions

- **Offline-first localStorage**: Semua data disimpan di browser (localStorage), tidak perlu backend/internet untuk operasional kasir
- **Kalkulasi integer**: Semua harga dalam Rupiah integer (tidak ada desimal) untuk mencegah floating-point error
- **Dark mode default**: Theme gelap selalu aktif, cocok untuk operasional seharian
- **Mobile-first**: Layout responsif, sidebar di desktop, bottom nav di mobile

## Product

Kasir Warung adalah POS system lengkap untuk warung/minimarket dengan fitur:
- **Kasir real-time**: Scan barcode, keranjang belanja, hitung kembalian otomatis
- **Manajemen produk**: CRUD lengkap dengan kategori, barcode, stok, favorit
- **Monitoring stok**: Alert stok menipis/habis, sistem restock, riwayat restock
- **Riwayat transaksi**: Cari & filter transaksi, cetak struk digital
- **Dashboard analytics**: KPI cards, grafik penjualan 7 hari, produk terlaris
- **Laporan**: Harian/mingguan/bulanan, ekspor TXT/JSON/CSV

## localStorage Keys

- `kasir_products` — Product[]
- `kasir_transactions` — Transaction[]
- `kasir_restock_logs` — RestockLog[]
- `kasir_settings` — { taxRate, storeName, taxEnabled }

## Gotchas

- Gunakan F2 untuk fokus ke input barcode di halaman kasir
- ENTER = checkout, ESC = kosongkan keranjang (keyboard shortcuts)
- Data hanya tersimpan di browser — backup rutin via ekspor JSON/CSV
- Hapus localStorage di browser developer tools untuk reset ke data awal

## User preferences

- Bahasa Indonesia untuk semua UI
- Format mata uang Rupiah (Rp)
- Dark mode selalu aktif
