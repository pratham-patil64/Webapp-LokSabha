import React from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  LogOut, Settings, User, Shield, Crown, 
  LayoutDashboard, FileText 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of the admin panel.",
    });
  };

  const navigationItems = [
    ...(user?.role === 'god' ? [{
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard
    }] : []),
    {
      label: 'Complaints',
      path: '/complaints',
      icon: FileText
    }
  ];

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                {user?.role === 'god' ? (
                  <Shield className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <Crown className="w-5 h-5 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="font-bold text-lg">Admin Panel</h1>
                <p className="text-xs text-muted-foreground capitalize">{user?.role} Access</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant={isActivePath(item.path) ? "default" : "ghost"}
                    onClick={() => navigate(item.path)}
                    className={`gap-2 ${
                      isActivePath(item.path) 
                        ? "bg-gradient-primary text-primary-foreground" 
                        : "hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {user?.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover border-border" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium capitalize">{user?.username}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground capitalize">
                    {user?.role} Administrator
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden border-b bg-card">
        <nav className="container mx-auto px-4 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActivePath(item.path) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={`gap-2 whitespace-nowrap ${
                    isActivePath(item.path) 
                      ? "bg-gradient-primary text-primary-foreground" 
                      : "hover:bg-accent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;