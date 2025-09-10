import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";
import ComplaintTable from "@/components/ComplaintTable";
import Layout from "@/components/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const GodOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user?.role === 'god' ? children : <Navigate to="/complaints" />;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={user?.role === 'god' ? '/dashboard' : '/complaints'} />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? (user?.role === 'god' ? '/dashboard' : '/complaints') : '/login'} />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <GodOnlyRoute>
            <Dashboard />
          </GodOnlyRoute>
        </ProtectedRoute>
      } />
      <Route path="/complaints" element={
        <ProtectedRoute>
          <ComplaintTable />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

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
