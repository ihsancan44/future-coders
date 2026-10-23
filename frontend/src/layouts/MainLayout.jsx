import { Suspense, useEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ReelsDock from "../components/reels/ReelsDock";
import { ReelsProvider } from "../context/ReelsContext";
import { Loading } from "../components/Status";

export default function MainLayout() {
  const location = useLocation();
  const navigationType = useNavigationType();
  // Her yeni geçişte (aynı sayfanın bağlantısına basmak ve ders değiştirmek dahil) sayfa başa döner.
  // Geri/ileri tuşunda tarayıcı kaydırmayı kendisi geri getirir; Reels'in açılması da sayfayı kaydırmaz.
  useEffect(() => {
    if (navigationType === "POP" || location.state?.reels) return;
    window.scrollTo(0, 0);
  }, [location.key, navigationType, location.state]);
  return (
    <ReelsProvider>
      <div className="app">
        <Navbar />
        <main className="app__main">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
        <ReelsDock />
      </div>
    </ReelsProvider>
  );
}
