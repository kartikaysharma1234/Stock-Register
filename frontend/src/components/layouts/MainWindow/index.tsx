import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppBar } from "./AppBar";
import { Footer } from "./Footer";
import { Main } from "./Main";
import { Sidebar } from "./Sidebar";

export const MainWindow = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-app-background md:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppBar onOpenSidebar={() => setSidebarOpen(true)} />
        <Main>
          <Outlet />
        </Main>
        <Footer />
      </div>
    </div>
  );
};
