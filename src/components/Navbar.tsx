import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, LogOut, ArrowLeft, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenProfile }) => {
  const { user, profile, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-4">
          {currentView !== 'home' && (
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534] hover:text-emerald-800 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-emerald-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </button>
          )}

          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#166534] flex items-center justify-center text-white font-heading font-bold text-lg shadow-sm group-hover:bg-emerald-800 transition-colors">
              UM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-base text-stone-900 leading-tight">
                  Quality Audit Assistant
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-orange-100 text-[#EA580C]">
                    <ShieldCheck className="w-3 h-3" />
                    Super Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-700 leading-tight">UM Tagum College • TQM Audit</p>
            </div>
          </div>
        </div>

        {/* User Menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer border border-transparent hover:border-stone-200"
              aria-label="User menu"
            >
              {profile?.photoURL || user.photoURL ? (
                <img
                  src={profile?.photoURL || user.photoURL || ''}
                  alt={profile?.displayName || user.displayName || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#166534]/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#166534] flex items-center justify-center font-bold text-sm">
                  {(profile?.displayName || user.displayName || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-stone-800 leading-tight">
                  {profile?.displayName || user.displayName || 'Employee'}
                </p>
                <p className="text-[11px] text-stone-600 leading-tight">
                  {profile?.roleCategory || 'Profile Setup'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-stone-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="text-xs font-semibold text-stone-900 truncate">
                      {profile?.displayName || user.displayName || 'Employee'}
                    </p>
                    <p className="text-[11px] text-stone-600 truncate">{profile?.position || profile?.department || 'Employee'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-emerald-50 hover:text-[#166534] transition-colors cursor-pointer text-left"
                  >
                    <User className="w-4 h-4 text-stone-400" />
                    My Profile
                  </button>

                  <div className="border-t border-stone-100 my-1" />

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
