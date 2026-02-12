import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-14 md:pt-16 pb-8 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
