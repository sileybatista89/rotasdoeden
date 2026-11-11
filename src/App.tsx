import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CookieConsent } from "@/components/CookieConsent";
import { AttributionTracker } from "@/components/AttributionTracker";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import Index from "./pages/Index.tsx";

// As restantes páginas são carregadas a pedido. Sem isto, todas as rotas (administração, legal,
// mensagens, área de guia, pacotes) entram no bundle inicial e a primeira visita paga o custo todo.
const CheckoutReturnPage = lazy(() => import("./pages/CheckoutReturnPage.tsx"));
const FlightsPage = lazy(() => import("./pages/FlightsPage.tsx"));
const GuidesPage = lazy(() => import("./pages/GuidesPage.tsx"));
const GuideProfilePage = lazy(() => import("./pages/GuideProfilePage.tsx"));
const BookingPage = lazy(() => import("./pages/BookingPage.tsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.tsx"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent.tsx"));
const KycPage = lazy(() => import("./pages/KycPage.tsx"));
const MessagesPage = lazy(() => import("./pages/MessagesPage.tsx"));
const ConversationPage = lazy(() => import("./pages/ConversationPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const TermosPage = lazy(() => import("./pages/legal/TermosPage.tsx"));
const PrivacidadePage = lazy(() => import("./pages/legal/PrivacidadePage.tsx"));
const ReservasPage = lazy(() => import("./pages/legal/ReservasPage.tsx"));
const AntifraudePage = lazy(() => import("./pages/legal/AntifraudePage.tsx"));
const GuiasLegalPage = lazy(() => import("./pages/legal/GuiasPage.tsx"));
const ComunidadePage = lazy(() => import("./pages/legal/ComunidadePage.tsx"));
const ParceriasPage = lazy(() => import("./pages/legal/ParceriasPage.tsx"));
const SejaParceiroPage = lazy(() => import("./pages/SejaParceiroPage.tsx"));
const GuiaParceiroPage = lazy(() => import("./pages/GuiaParceiroPage.tsx"));
const MyServicesPage = lazy(() => import("./pages/MyServicesPage.tsx"));
const ServiceFormPage = lazy(() => import("./pages/ServiceFormPage.tsx"));
const ExperiencesPage = lazy(() => import("./pages/ExperiencesPage.tsx"));
const ExperienceDetailPage = lazy(() => import("./pages/ExperienceDetailPage.tsx"));
const MyBookingsPage = lazy(() => import("./pages/MyBookingsPage.tsx"));
const SobreSaoTomePage = lazy(() => import("./pages/SobreSaoTomePage.tsx"));
const ParceirosPage = lazy(() => import("./pages/ParceirosPage.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));
const PropostaPage = lazy(() => import("./pages/PropostaPage.tsx"));
const PackageBuilderPage = lazy(() => import("./pages/PackageBuilderPage.tsx"));
const ProfessionalProfilePage = lazy(() => import("./pages/ProfessionalProfilePage.tsx"));
const VerificationRequestPage = lazy(() => import("./pages/VerificationRequestPage.tsx"));
const SupportConversationPage = lazy(() => import("./pages/SupportConversationPage.tsx"));
import { ScrollToTop } from "@/components/ScrollToTop";
import { ChatLauncher } from "@/components/conversion/ChatLauncher";

const queryClient = new QueryClient();
const AdminPage = lazy(() => import("./pages/AdminPage.tsx"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
        <AuthProvider>
          <PaymentTestModeBanner />
          <ScrollToTop />
          <AttributionTracker />
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/voos" element={<FlightsPage />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guides/:id" element={<GuideProfilePage />} />
            <Route path="/experiences" element={<ExperiencesPage />} />
            <Route path="/experiences/:id" element={<ExperienceDetailPage />} />
            <Route path="/seja-parceiro" element={<SejaParceiroPage />} />
            <Route path="/guia-parceiro" element={<GuiaParceiroPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/sobre-sao-tome" element={<SobreSaoTomePage />} />
            <Route path="/parceiros" element={<ParceirosPage />} />
            <Route path="/proposta" element={<PropostaPage />} />
            <Route path="/pacotes/rotas-essencial" element={<PackageBuilderPage key="rotas-essencial" slug="rotas-essencial" />} />
            <Route path="/pacotes/rotas-explorar" element={<PackageBuilderPage key="rotas-explorar" slug="rotas-explorar" />} />
            <Route path="/pacotes/rotas-imersao" element={<PackageBuilderPage key="rotas-imersao" slug="rotas-imersao" />} />
            <Route path="/pacotes/rotas-a-medida" element={<PackageBuilderPage key="rotas-a-medida" slug="rotas-a-medida" />} />
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
            <Route path="/perfil-profissional" element={
              <ProtectedRoute requireRole="guide"><ProfessionalProfilePage /></ProtectedRoute>
            } />
            <Route path="/verificacao" element={
              <ProtectedRoute requireRole="guide"><VerificationRequestPage /></ProtectedRoute>
            } />
            <Route path="/my-bookings" element={
              <ProtectedRoute><MyBookingsPage /></ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/messages/:conversationId" element={
              <ProtectedRoute><ConversationPage /></ProtectedRoute>
            } />
            <Route path="/support/:conversationId" element={
              <ProtectedRoute><SupportConversationPage /></ProtectedRoute>
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
          </Suspense>
          <ChatLauncher />
          <CookieConsent />
        </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
