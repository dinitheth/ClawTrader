import { ReactNode } from "react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background arena-grid relative">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-arena pointer-events-none" />
      
      {/* Animated corner accents */}
      <div className="fixed top-0 left-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-64 h-64 bg-secondary/5 blur-[100px] pointer-events-none" />
      
      <Header />
      
      <main className="relative pt-20 pb-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
