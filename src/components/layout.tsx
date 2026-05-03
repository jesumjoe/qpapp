import * as React from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, BrainCircuit, BarChart3, Settings, Moon, Sun, Search, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  
  return (
    <motion.div
      key={location}
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
      transition={{ 
        duration: 0.6, 
        ease: [0.4, 0, 0.2, 1] // Cinematic ease
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: BookOpen, label: "Subjects", href: "#" }, // Placeholder for specific subjects if needed
    { icon: BrainCircuit, label: "Daily Review", href: "/daily-review" },
    { icon: BarChart3, label: "Performance", href: "/performance" },
  ];

  return (
    <SidebarProvider>
      <div className="relative min-h-screen w-full flex bg-background/50 overflow-hidden noise-bg">
        {/* Aurora Background */}
        <div className="aurora-bg" />
        
        <Sidebar variant="floating" collapsible="icon" className="border-none bg-transparent">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                <Sparkles size={18} />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight group-data-[collapsible=icon]:hidden">Binder</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.href}
                    tooltip={item.label}
                    className={cn(
                      "transition-all duration-300",
                      location === item.href ? "bg-primary/10 text-primary" : "hover:bg-primary/5"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon size={20} />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  tooltip="Toggle Theme"
                >
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                  <span className="group-data-[collapsible=icon]:hidden">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-transparent border-none">
          <header className="flex h-16 shrink-0 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border group-data-[collapsible=icon]:hidden" />
              <div className="relative hidden sm:block group-data-[collapsible=icon]:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                  placeholder="Quick search..." 
                  className="bg-muted/30 border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-48 lg:w-64 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings size={20} />
              </Button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px]">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10">
            <AnimatePresence mode="wait">
              <PageTransition>
                {children}
              </PageTransition>
            </AnimatePresence>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
