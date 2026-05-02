import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CookieConsent } from "@/components/CookieConsent";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import CheckoutReturnPage from "./pages/CheckoutReturnPage.tsx";
import Index from "./pages/Index.tsx";
import GuidesPage from "./pages/GuidesPage.tsx";
import GuideProfilePage from "./pages/GuideProfilePage.tsx";
import BookingPage from "./pages/BookingPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import KycPage from "./pages/KycPage.tsx";
import MessagesPage from "./pages/MessagesPage.tsx";
import ConversationPage from "./pages/ConversationPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import TermosPage from "./pages/legal/TermosPage.tsx";
import PrivacidadePage from "./pages/legal/PrivacidadePage.tsx";
import ReservasPage from "./pages/legal/ReservasPage.tsx";
import AntifraudePage from "./pages/legal/AntifraudePage.tsx";
import GuiasLegalPage from "./pages/legal/GuiasPage.tsx";
import ComunidadePage from "./pages/legal/ComunidadePage.tsx";
import ParceriasPage from "./pages/legal/ParceriasPage.tsx";
import SejaParceiroPage from "./pages/SejaParceiroPage.tsx";
import MyServicesPage from "./pages/MyServicesPage.tsx";
import ServiceFormPage from "./pages/ServiceFormPage.tsx";
import ExperiencesPage from "./pages/ExperiencesPage.tsx";
import ExperienceDetailPage from "./pages/ExperienceDetailPage.tsx";
import MyBookingsPage from "./pages/MyBookingsPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PaymentTestModeBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guides/:id" element={<GuideProfilePage />} />
            <Route path="/experiences" element={<ExperiencesPage />} />
            <Route path="/experiences/:id" element={<ExperienceDetailPage />} />
            <Route path="/seja-parceiro" element={<SejaParceiroPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/book/:serviceId" element={
              <ProtectedRoute><BookingPage /></ProtectedRoute>
            } />
            <Route path="/checkout/return" element={
              <ProtectedRoute><CheckoutReturnPage /></ProtectedRoute>
            } />
            <Route path="/kyc" element={
              <ProtectedRoute requireRole="guide"><KycPage /></ProtectedRoute>
            } />
            <Route path="/my-services" element={
              <ProtectedRoute requireRole="guide"><MyServicesPage /></ProtectedRoute>
            } />
            <Route path="/my-services/new" element={
              <ProtectedRoute requireRole="guide"><ServiceFormPage /></ProtectedRoute>
            } />
            <Route path="/my-services/:id/edit" element={
              <ProtectedRoute requireRole="guide"><ServiceFormPage /></ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/messages/:conversationId" element={
              <ProtectedRoute><ConversationPage /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requireRole="admin"><AdminPage /></ProtectedRoute>
            } />
            <Route path="/legal/termos" element={<TermosPage />} />
            <Route path="/legal/privacidade" element={<PrivacidadePage />} />
            <Route path="/legal/reservas" element={<ReservasPage />} />
            <Route path="/legal/antifraude" element={<AntifraudePage />} />
            <Route path="/legal/guias" element={<GuiasLegalPage />} />
            <Route path="/legal/comunidade" element={<ComunidadePage />} />
            <Route path="/legal/parcerias" element={<ParceriasPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
