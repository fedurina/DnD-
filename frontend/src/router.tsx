import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import AuthLayout from "@/components/AuthLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import ProfilePage from "@/pages/ProfilePage";
import CharactersPage from "@/pages/CharactersPage";
import CharacterWizardPage from "@/pages/CharacterWizardPage";
import CharacterDetailPage from "@/pages/CharacterDetailPage";
import CampaignsPage from "@/pages/CampaignsPage";
import CampaignCreatePage from "@/pages/CampaignCreatePage";
import CampaignDetailPage from "@/pages/CampaignDetailPage";
import ReferencesPage from "@/pages/ReferencesPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/characters", element: <CharactersPage /> },
          { path: "/characters/new", element: <CharacterWizardPage /> },
          { path: "/characters/:id", element: <CharacterDetailPage /> },
          { path: "/campaigns", element: <CampaignsPage /> },
          { path: "/campaigns/new", element: <CampaignCreatePage /> },
          { path: "/campaigns/:id", element: <CampaignDetailPage /> },
          { path: "/references", element: <ReferencesPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
