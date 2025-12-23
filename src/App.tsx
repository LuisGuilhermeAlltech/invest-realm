import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Carteira from "@/pages/Carteira";
import Caixa from "@/pages/Caixa";
import Movimentacoes from "@/pages/Movimentacoes";
import Proventos from "@/pages/Proventos";
import Metas from "@/pages/Metas";
import Cadastros from "@/pages/Cadastros";
import FinanceiroMensal from "@/pages/FinanceiroMensal";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-muted-foreground">Carregando...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-muted-foreground">Carregando...</div></div>;
  
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/carteira" element={<ProtectedRoute><Carteira /></ProtectedRoute>} />
      <Route path="/caixa" element={<ProtectedRoute><Caixa /></ProtectedRoute>} />
      <Route path="/movimentacoes" element={<ProtectedRoute><Movimentacoes /></ProtectedRoute>} />
      <Route path="/proventos" element={<ProtectedRoute><Proventos /></ProtectedRoute>} />
      <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><FinanceiroMensal /></ProtectedRoute>} />
      <Route path="/cadastros" element={<ProtectedRoute><Cadastros /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
