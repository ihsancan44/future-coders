import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ReelsDock from "../components/reels/ReelsDock";
import { ReelsProvider } from "../context/ReelsContext";

export default function MainLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <ReelsProvider>
      <div className="app">
        <Navbar />
        <main className="app__main">
          <Outlet />
        </main>
        <Footer />
        <ReelsDock />
      </div>
    </ReelsProvider>
  );
}
