import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  Coins,
  Target,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Wallet,
  Calculator,
  CreditCard,
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/carteira', label: 'Carteira', icon: Briefcase },
  { path: '/caixa', label: 'Caixa', icon: Wallet },
  { path: '/movimentacoes', label: 'Movimentacoes', icon: ArrowLeftRight },
  { path: '/proventos', label: 'Proventos', icon: Coins },
  { path: '/metas', label: 'Metas', icon: Target },
  { path: '/financeiro', label: 'Financeiro', icon: Calculator },
  { path: '/contas-a-pagar', label: 'Contas a Pagar', icon: CreditCard },
  { path: '/agente-aporte', label: 'Agente de Aporte', icon: TrendingUp },
  { path: '/cadastros', label: 'Cadastros', icon: Settings },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-md">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Controle Patrimonial</span>
          </div>
          
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            
            <Button
              variant="ghost"
              className="justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </nav>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-md">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm">Controle Patrimonial</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-40 bg-background">
          <nav className="flex flex-col p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              className="justify-start gap-3 mt-4 text-muted-foreground hover:text-foreground"
              onClick={() => { signOut(); setMobileMenuOpen(false); }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
