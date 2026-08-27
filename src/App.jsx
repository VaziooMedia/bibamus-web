import React, { useState } from "react";
import { LoginScreen } from "./components/LoginScreen.jsx";
import { Layout } from "./components/Layout.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { VenuesScreen } from "./components/VenuesScreen.jsx";
import { DrinksScreen } from "./components/DrinksScreen.jsx";
import { BreweriesScreen, BrandsScreen } from "./components/BreweriesAndBrandsScreens.jsx";
import { ComingSoon } from "./components/ComingSoon.jsx";
import { DataBaseOverviewScreen } from "./components/DataBaseOverviewScreen.jsx";

const SUPABASE_PROJECT_URL = "https://supabase.com/dashboard/project/rkmmrzkqzqpntgiguajz";

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("bibamus-admin-unlocked") === "true");
  const [screen, setScreen] = useState("dashboard");

  if (!unlocked) {
    return (
      <LoginScreen
        onUnlock={() => {
          sessionStorage.setItem("bibamus-admin-unlocked", "true");
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <Layout current={screen} onNavigate={setScreen}>
      {screen === "dashboard" && <Dashboard />}
      {screen === "database" && <DataBaseOverviewScreen onNavigate={setScreen} supabaseUrl={SUPABASE_PROJECT_URL} />}
      {screen === "venues" && <VenuesScreen />}
      {screen === "drinks" && <DrinksScreen />}
      {screen === "breweries" && <BreweriesScreen />}
      {screen === "brands" && <BrandsScreen />}
      {screen === "chat" && <ComingSoon title="Chat" />}
      {screen === "stats" && <ComingSoon title="Statistiques" />}
      {screen === "finances" && <ComingSoon title="Finances" />}
      {screen === "notifications" && <ComingSoon title="Notifications" />}
      {screen === "admins" && <ComingSoon title="Administrateurs" />}
      {screen === "settings" && <ComingSoon title="Paramètres" />}
    </Layout>
  );
}
