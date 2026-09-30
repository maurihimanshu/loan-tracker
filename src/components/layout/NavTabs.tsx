import React from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActiveTab } from '../../app/selectors';
import { setActiveTab, NavigationTab } from '../../features/ui/uiSlice';
import {
  LayoutDashboard,
  Building,
  CreditCard,
  Zap,
  TrendingUp,
  Table,
  Settings,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const NavTabs: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);

  const tabs: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'loans', label: 'Loans', icon: <Building className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'partPayments', label: 'Part Payments', icon: <Zap className="w-4 h-4" /> },
    { id: 'scenarios', label: 'Scenarios', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <Table className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <nav className="border-b border-border bg-card/60 backdrop-blur-xs">
      <div className="flex overflow-x-auto no-scrollbar px-4 sm:px-6">
        <div className="flex space-x-1 sm:space-x-2 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => dispatch(setActiveTab(tab.id))}
                className={cn(
                  'flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer select-none',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

