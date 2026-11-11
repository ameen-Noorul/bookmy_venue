import Navbar from './Navbar';

const Layout = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-background">
    <Navbar />
    <main className="flex-1">{children}</main>
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} BookMyVenue</span>
        <span>Halls, lawns and banquets across Kerala</span>
      </div>
    </footer>
  </div>
);

export default Layout;