import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import NoticeTicker from "./components/NoticeTicker.jsx";
import About from "./components/About.jsx";
import PrincipalDesk from "./components/PrincipalDesk.jsx";
import Teachers from "./components/Teachers.jsx";
import Gallery from "./components/Gallery.jsx";
import NoticeBoard from "./components/NoticeBoard.jsx";
import Contact from "./components/Contact.jsx";
import Footer from "./components/Footer.jsx";
import AdminLogin from "./admin/Login.jsx";
import AdminDashboard from "./admin/Dashboard.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";

/**
 * Tiny hash router:
 *   #/admin   -> Admin panel (login + dashboard)
 *   otherwise -> Public website
 */
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

function PublicSite() {
  return (
    <div className="relative min-h-screen bg-[#f6f9fd]">
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <NoticeTicker />
        <About />
        <PrincipalDesk />
        <Teachers />
        <Gallery />
        <NoticeBoard />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const hash = useHashRoute();
  const isAdmin = hash.startsWith("#/admin");

  return (
    <AppProvider>
      <Toaster position="top-right" toastOptions={{
        style: {
          borderRadius: "12px",
          background: "#0c3c66",
          color: "#fff",
          fontSize: "14px",
        },
      }} />
      {isAdmin ? <AdminDashboard /> : <PublicSite />}
    </AppProvider>
  );
}
