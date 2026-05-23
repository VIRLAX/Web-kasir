import { Link, useLocation } from "wouter";
import { ShoppingCart, Package, BarChart3, ClipboardList, FileText, Layers } from "lucide-react";

const navItems = [
  { href: "/", label: "Kasir", icon: ShoppingCart },
  { href: "/produk", label: "Produk", icon: Package },
  { href: "/stok", label: "Stok", icon: Layers },
  { href: "/transaksi", label: "Transaksi", icon: ClipboardList },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/laporan", label: "Laporan", icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-wide text-foreground">Kasir Warung</span>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href} asChild>
                <button
                  data-testid={`nav-${label.toLowerCase()}`}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground">v1.0.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Bottom nav - mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50 flex">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href} asChild>
                <button
                  data-testid={`nav-mobile-${label.toLowerCase()}`}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px]">{label}</span>
                </button>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
