import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ClipboardCheck,
  FolderClock,
  UserCheck,
  BookOpen,
  AlertTriangle,
  FileBarChart,
  Copy,
  Check,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string) => void;
  onOpenProfile: () => void;
  onStartNewReview: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenProfile,
  onStartNewReview,
}) => {
  const { user, profile, isAdmin, adminSetupNeeded, refreshMe } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const firstName = (profile?.displayName || user?.displayName || 'Colleague').split(' ')[0];

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      showToast('Admin UID copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#166534] to-emerald-800 text-white p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Total Quality Management System
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
            Maayong Adlaw, {firstName}!
          </h1>
          <p className="mt-3 text-sm sm:text-base text-emerald-100 leading-relaxed">
            Welcome to the UM Tagum College Quality Audit Assistant. Complete your regular guided process review to benchmark operations against institutional standards, generate your SIPOC workflow, and prioritize FMEA failure modes.
          </p>

          {!profile && (
            <div className="mt-5 p-3.5 bg-amber-500/20 border border-amber-300/40 rounded-xl flex items-center justify-between text-xs text-amber-100">
              <span>Your employee profile is not set yet. Please complete your profile before starting a review.</span>
              <button
                onClick={onOpenProfile}
                className="ml-3 px-3 py-1 bg-white text-emerald-950 font-bold rounded-lg shrink-0 cursor-pointer hover:bg-emerald-50 transition-colors"
              >
                Set Profile
              </button>
            </div>
          )}
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-16 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Admin Setup Note Banner (Section 8.1) */}
      {adminSetupNeeded && user && (
        <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-amber-900 font-heading">
                Administrator Access Setup Required
              </h2>
              <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                Your authenticated Google email matches <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">{user.email}</code>. To activate your Super Administrator privileges in compliance with Section 8.1, create the following document in the Firebase Console:
              </p>

              <div className="mt-3 p-3.5 bg-white rounded-xl border border-amber-200 font-mono text-xs text-stone-800 space-y-1">
                <div><span className="text-stone-700">Collection:</span> <strong className="text-amber-900">admins</strong></div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-700">Document ID:</span>
                  <strong className="text-amber-900">{user.uid}</strong>
                  <button
                    onClick={handleCopyUid}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[11px] text-stone-700 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy UID'}
                  </button>
                </div>
                <div><span className="text-stone-700">Field:</span> <strong className="text-amber-900">role = "superadmin"</strong> (string)</div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={refreshMe}
                  className="px-4 py-2 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Check Admin Status Again
                </button>
                <span className="text-xs text-amber-700">
                  (No reload required after adding document in Firebase Console)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Large Rounded Navigation Tiles */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-stone-900 font-heading">
          Employee Quality Review
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Start a Process Review Tile */}
          <button
            onClick={onStartNewReview}
            className="group relative flex flex-col justify-between p-6 sm:p-8 bg-white hover:bg-emerald-50/50 rounded-3xl border-2 border-[#166534] shadow-md hover:shadow-xl transition-all text-left cursor-pointer overflow-hidden"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#166534] text-white flex items-center justify-center mb-6 shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-7 h-7" />
              </div>
              <h3 className="font-heading text-xl font-bold text-stone-900 group-hover:text-[#166534] transition-colors">
                Start a Process Review
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed">
                Begin a guided 5-step conversational audit with the Audit Assistant. Maps your task into SIPOC and scores FMEA failure modes.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-[#166534] group-hover:translate-x-1 transition-transform">
              Launch Review Session →
            </div>
          </button>

          {/* My Reviews Tile */}
          <button
            onClick={() => onNavigate('my-reviews')}
            className="group flex flex-col justify-between p-6 sm:p-8 bg-white hover:bg-stone-50 rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all text-left cursor-pointer"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#166534] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <FolderClock className="w-7 h-7" />
              </div>
              <h3 className="font-heading text-xl font-bold text-stone-900">
                My Reviews
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed">
                Access your past audit sessions, review dialogue transcripts, and inspect generated Process Risk Sheets.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-stone-700 group-hover:translate-x-1 transition-transform">
              View History →
            </div>
          </button>

          {/* My Profile Tile */}
          <button
            onClick={onOpenProfile}
            className="group flex flex-col justify-between p-6 sm:p-8 bg-white hover:bg-stone-50 rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all text-left cursor-pointer"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="font-heading text-xl font-bold text-stone-900">
                My Profile
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed">
                Update your department, role category (Teaching Faculty, Academic Leadership, Office Staff), and job function.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-stone-700 group-hover:translate-x-1 transition-transform">
              Edit Details →
            </div>
          </button>
        </div>
      </div>

      {/* Super Administrator Controls Section */}
      {isAdmin && (
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900 font-heading">
              Quality Assurance Management (Super Admin)
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#EA580C] text-[11px] font-bold uppercase tracking-wider">
              Admin Only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* College Baseline */}
            <button
              onClick={() => onNavigate('baseline')}
              className="group flex flex-col justify-between p-6 sm:p-8 bg-white hover:bg-emerald-50/30 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-all text-left cursor-pointer"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#166534] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-stone-900">
                  College Baseline
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Upload and manage institutional quality baseline documents (.md/.txt). Sets the TL, AL, OS, and CW codes for audits.
                </p>
              </div>
              <div className="mt-6 flex items-center text-xs font-bold text-[#166534] group-hover:translate-x-1 transition-transform">
                Manage Standards →
              </div>
            </button>

            {/* Risk Register */}
            <button
              onClick={() => onNavigate('register')}
              className="group flex flex-col justify-between p-6 sm:p-8 bg-white hover:bg-orange-50/30 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-all text-left cursor-pointer"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#EA580C] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-stone-900">
                  Risk Register
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Read-only college-wide register of all failure modes ranked by RPN. Filter by role category and priority; inspect reviews.
                </p>
              </div>
              <div className="mt-6 flex items-center text-xs font-bold text-[#EA580C] group-hover:translate-x-1 transition-transform">
                Inspect Registers →
              </div>
            </button>

            {/* Reports */}
            <button
              onClick={() => onNavigate('reports')}
              className="group flex flex-col justify-between p-6 sm:p-8 bg-white hover:bg-stone-50 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-all text-left cursor-pointer"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <FileBarChart className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-stone-900">
                  Reports
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Generate Consolidated Process Risk Reports with server statistics. Download report and full testing transcripts as Markdown.
                </p>
              </div>
              <div className="mt-6 flex items-center text-xs font-bold text-stone-700 group-hover:translate-x-1 transition-transform">
                Generate & Export →
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
