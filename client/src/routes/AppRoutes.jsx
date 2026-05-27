import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Loader from "../components/common/Loader.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";

const Login = lazy(() => import("../pages/auth/Login.jsx"));
const Register = lazy(() => import("../pages/auth/Register.jsx"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword.jsx"));
const Home = lazy(() => import("../pages/public/Home.jsx"));
const NotFound = lazy(() => import("../pages/public/NotFound.jsx"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard.jsx"));
const Users = lazy(() => import("../pages/admin/Users.jsx"));
const Agents = lazy(() => import("../pages/admin/Agents.jsx"));
const Customers = lazy(() => import("../pages/admin/Customers.jsx"));
const Tickets = lazy(() => import("../pages/admin/Tickets.jsx"));
const AdminTicketDetails = lazy(() => import("../pages/admin/AdminTicketDetails.jsx"));
const Chats = lazy(() => import("../pages/admin/Chats.jsx"));
const Analytics = lazy(() => import("../pages/admin/Analytics.jsx"));
const AISettings = lazy(() => import("../pages/admin/AISettings.jsx"));
const Security = lazy(() => import("../pages/admin/Security.jsx"));
const ActivityLogs = lazy(() => import("../pages/admin/ActivityLogs.jsx"));
const Integrations = lazy(() => import("../pages/admin/Integrations.jsx"));
const AgentDashboard = lazy(() => import("../pages/agent/AgentDashboard.jsx"));
const AgentTickets = lazy(() => import("../pages/agent/AgentTickets.jsx"));
const AgentTicketDetails = lazy(() => import("../pages/agent/AgentTicketDetails.jsx"));
const AgentLiveChats = lazy(() => import("../pages/agent/AgentLiveChats.jsx"));
const AgentChatDetails = lazy(() => import("../pages/agent/AgentChatDetails.jsx"));
const AgentPerformance = lazy(() => import("../pages/agent/AgentPerformance.jsx"));
const CustomerDashboard = lazy(() => import("../pages/customer/CustomerDashboard.jsx"));
const CustomerTickets = lazy(() => import("../pages/customer/CustomerTickets.jsx"));
const CreateTicket = lazy(() => import("../pages/customer/CreateTicket.jsx"));
const CustomerTicketDetails = lazy(() => import("../pages/customer/CustomerTicketDetails.jsx"));
const CustomerLiveChat = lazy(() => import("../pages/customer/CustomerLiveChat.jsx"));
const CustomerProfile = lazy(() => import("../pages/customer/CustomerProfile.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route element={<RoleRoute roles={["ADMIN"]} />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/agents" element={<Agents />} />
              <Route path="/admin/customers" element={<Customers />} />
              <Route path="/admin/tickets" element={<Tickets />} />
              <Route path="/admin/tickets/:id" element={<AdminTicketDetails />} />
              <Route path="/admin/chats" element={<Chats />} />
              <Route path="/admin/analytics" element={<Analytics />} />
              <Route path="/admin/ai-settings" element={<AISettings />} />
              <Route path="/admin/security" element={<Security />} />
              <Route path="/admin/activity-logs" element={<ActivityLogs />} />
              <Route path="/admin/integrations" element={<Integrations />} />
            </Route>
            <Route element={<RoleRoute roles={["AGENT"]} />}>
              <Route path="/agent" element={<Navigate to="/agent/dashboard" replace />} />
              <Route path="/agent/dashboard" element={<AgentDashboard />} />
              <Route path="/agent/tickets" element={<AgentTickets />} />
              <Route path="/agent/tickets/:id" element={<AgentTicketDetails />} />
              <Route path="/agent/live-chats" element={<AgentLiveChats />} />
              <Route path="/agent/chat/:id" element={<AgentChatDetails />} />
              <Route path="/agent/performance" element={<AgentPerformance />} />
            </Route>
            <Route element={<RoleRoute roles={["CUSTOMER"]} />}>
              <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
              <Route path="/customer/dashboard" element={<CustomerDashboard />} />
              <Route path="/customer/tickets" element={<CustomerTickets />} />
              <Route path="/customer/tickets/create" element={<CreateTicket />} />
              <Route path="/customer/tickets/:id" element={<CustomerTicketDetails />} />
              <Route path="/customer/live-chat" element={<CustomerLiveChat />} />
              <Route path="/customer/profile" element={<CustomerProfile />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
