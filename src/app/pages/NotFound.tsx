import { Link } from "react-router";
import { Home, ArrowLeft } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FB] via-white to-[#F7F9FB]">
      <Navbar />
      <div className="flex items-center justify-center p-4 pt-24">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-[#1A5F3D] to-[#3FAF7D] bg-clip-text text-transparent mb-4">
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
          <p className="text-xl text-gray-600 mb-8">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all"
          >
            <Home className="w-5 h-5 mr-2" />
            Go to Homepage
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-[#1A5F3D] text-[#1A5F3D] rounded-xl font-semibold hover:bg-[#1A5F3D] hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink to="/calculator/sip" label="SIP Calculator" />
          <QuickLink to="/planner" label="Financial Planner" />
          <QuickLink to="/services" label="Our Services" />
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-[#1A5F3D] transition-all text-gray-700 hover:text-[#1A5F3D]"
    >
      {label}
    </Link>
  );
}