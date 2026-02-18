import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AdminShortcut = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") {
        e.preventDefault();
        navigate("/admin");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return null;
};

// Anti-inspection measures
if (typeof window !== 'undefined') {
  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  
  // Detect and discourage DevTools
  document.addEventListener('keydown', (e) => {
    // Block F12
    if (e.key === 'F12') e.preventDefault();
    // Block Ctrl+Shift+I / Cmd+Opt+I (Inspector)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') e.preventDefault();
    // Block Ctrl+Shift+J / Cmd+Opt+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') e.preventDefault();
    // Block Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') e.preventDefault();
  });
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AdminShortcut />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
