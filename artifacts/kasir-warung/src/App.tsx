import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
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
import { isAuthenticated, logout } from "@/lib/auth";

const queryClient = new QueryClient();

type LogoutReason = "expired" | "logout" | undefined;

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
  const [logoutReason, setLogoutReason] = useState<LogoutReason>(() =>
    !isAuthenticated() && localStorage.getItem("kasir_auth_session") === null ? undefined : "expired"
  );

  const handleLogout = () => {
    logout();
    setLogoutReason("logout");
    setAuthed(false);
  };

  const handleLogin = () => {
    setLogoutReason(undefined);
    setAuthed(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter hook={useHashLocation}>
          {authed ? (
            <Router onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} reason={logoutReason} />
          )}
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
