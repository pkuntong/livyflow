import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  CreditCard, 
  PiggyBank, 
  TrendingUp,
  Receipt,
  Settings,
  Menu
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Transactions",
    url: createPageUrl("Transactions"),
    icon: Receipt,
  },
  {
    title: "Budgets",
    url: createPageUrl("Budgets"),
    icon: PiggyBank,
  },
  {
    title: "Accounts",
    url: createPageUrl("Accounts"),
    icon: CreditCard,
  },
  {
    title: "Analytics",
    url: createPageUrl("Analytics"),
    icon: TrendingUp,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <style>
        {`
          :root {
            --mint-primary: #10B981;
            --mint-secondary: #059669;
            --mint-accent: #34D399;
            --navy-primary: #1E293B;
            --navy-secondary: #334155;
            --background: #F8FAFC;
            --surface: #FFFFFF;
            --text-primary: #0F172A;
            --text-secondary: #64748B;
            --border: #E2E8F0;
          }
        `}
      </style>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--background)' }}>
        <Sidebar className="border-r" style={{ borderColor: 'var(--border)' }}>
          <SidebarHeader className="border-b p-6" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, var(--mint-primary), var(--mint-secondary))',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                }}
              >
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                  LivyFlow
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Personal Finance
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`
                          hover:bg-mint-50 hover:text-mint-700 transition-all duration-300 rounded-xl p-3 mb-1
                          ${location.pathname === item.url ? 'bg-mint-50 text-mint-700 shadow-sm' : ''}
                        `}
                        style={{
                          backgroundColor: location.pathname === item.url ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                          color: location.pathname === item.url ? 'var(--mint-primary)' : 'var(--text-secondary)'
                        }}
                      >
                        <Link to={item.url} className="flex items-center gap-3 w-full">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: 'var(--navy-primary)' }}
              >
                U
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  Your Account
                </p>
                <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                  Manage your finances
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b px-6 py-4 md:hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                LivyFlow
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}