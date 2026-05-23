import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Kasir from "@/pages/Kasir";
import Produk from "@/pages/Produk";
import Stok from "@/pages/Stok";
import Transaksi from "@/pages/Transaksi";
import Dashboard from "@/pages/Dashboard";
import Laporan from "@/pages/Laporan";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
