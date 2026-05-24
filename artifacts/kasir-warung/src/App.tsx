import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Kasir from "@/pages/Kasir";
import Produk from "@/pages/Produk";
import Stok from "@/pages/Stok";
import Transaksi from "@/pages/Transaksi";
import Dashboard from "@/pages/Dashboard";
import Laporan from "@/pages/Laporan";
import NotFound from "@/pages/not-found";
import { isAuthenticated } from "@/lib/auth";

const queryClient = new QueryClient();

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <Layout onLogout={onLogout}>
      <Switch>
        <Route path="/" component={Kasir} />
        <Route path="/produk" component={Produk} />
        <Route path="/stok" component={Stok} />
        <Route path="/transaksi" component={Transaksi} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/laporan" component={Laporan} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [authed, setAuthed] = useState(() => isAuthenticated());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          {authed ? (
            <Router onLogout={() => setAuthed(false)} />
          ) : (
            <Login onLogin={() => setAuthed(true)} />
          )}
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
