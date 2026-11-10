import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ShieldCheck, CheckCircle2, Award, ClipboardList } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      showToast('Could not complete Google Sign-In. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8F6] flex flex-col justify-between">
      {/* Header */}
      <header className="w-full border-b border-stone-200/80 bg-white/70 backdrop-blur-xs py-4 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#166534] flex items-center justify-center text-white font-heading font-extrabold text-xl shadow-md">
              UM
            </div>
            <div>
              <span className="font-heading font-bold text-lg text-stone-900 block leading-tight">
                UM Tagum College
              </span>
              <span className="text-xs text-stone-700 block">Total Quality Management Audit</span>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-[#166534]">
            ISO 9001:2015 Aligned
          </span>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 sm:py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/90 text-[#EA580C] text-xs font-bold uppercase tracking-wide mb-6">
          <ShieldCheck className="w-4 h-4" />
          University Quality Assurance
        </div>

        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight max-w-2xl leading-tight">
          Quality Audit Assistant
        </h1>

        {/* The two required sentences */}
        <p className="mt-5 text-base sm:text-lg text-stone-700 max-w-2xl leading-relaxed">
          The Quality Audit Assistant conducts structured Total Quality Management (TQM) process reviews with UM Tagum College faculty and staff to map everyday workflows into comprehensive SIPOC diagrams. It systematically identifies operational vulnerabilities through Failure Mode and Effects Analysis (FMEA), ranking college-wide risks by Risk Priority Number.
        </p>

        {/* Sign In Button */}
        <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl font-heading font-semibold text-base shadow-lg shadow-emerald-900/10 hover:shadow-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>
          <span className="text-xs text-stone-600">
            Sign in with any institutional or personal Google account
          </span>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full max-w-4xl">
          <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#166534] flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h2 className="font-heading font-semibold text-stone-900 text-sm">SIPOC Workflow Mapping</h2>
            <p className="mt-1 text-xs text-stone-700 leading-relaxed">
              Suppliers, Inputs, Process Steps, Outputs, and Customers aligned to college baseline standards.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#EA580C] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="font-heading font-semibold text-stone-900 text-sm">FMEA Risk Scoring</h2>
            <p className="mt-1 text-xs text-stone-700 leading-relaxed">
              Server-authoritative calculation of Severity, Occurrence, Detection and Risk Priority Numbers (RPN).
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center mb-3">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="font-heading font-semibold text-stone-900 text-sm">College Risk Register</h2>
            <p className="mt-1 text-xs text-stone-700 leading-relaxed">
              Unified institutional view categorized across Teaching Faculty, Academic Leadership, and Office Staff.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-700">
        <p>© 2026 University of Mindanao Tagum College. Total Quality Management Office.</p>
      </footer>
    </div>
  );
};
