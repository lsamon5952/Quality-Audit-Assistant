import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { HomePage } from './pages/HomePage';
import { ReviewChatPage } from './pages/ReviewChatPage';
import { MyReviewsPage } from './pages/MyReviewsPage';
import { BaselinePage } from './pages/BaselinePage';
import { RiskRegisterPage } from './pages/RiskRegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfileModal } from './pages/ProfileModal';

function MainApp() {
  const { user, profile, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'review' | 'my-reviews' | 'baseline' | 'register' | 'reports'>('home');
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8F6] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#166534] text-white flex items-center justify-center font-heading font-extrabold text-xl shadow-md animate-pulse mb-4">
          UM
        </div>
        <p className="text-sm font-semibold text-stone-700">
          Loading Quality Audit Assistant...
        </p>
      </div>
    );
  }

  // Unauthenticated user -> Landing Page
  if (!user) {
    return <LandingPage />;
  }

  const handleStartNewReview = () => {
    // If profile is missing, require profile completion first
    if (!profile) {
      setIsProfileModalOpen(true);
      return;
    }

    // Generate compliant reviewId: alphanumeric, dashes, underscores, max 128
    const newId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setActiveReviewId(newId);
    setCurrentView('review');
  };

  const handleResumeReview = (reviewId: string) => {
    setActiveReviewId(reviewId);
    setCurrentView('review');
  };

  return (
    <div className="min-h-screen bg-[#F6F8F6] flex flex-col text-stone-900 font-sans">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view as any);
          if (view !== 'review') setActiveReviewId(null);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onNavigate={(view) => setCurrentView(view as any)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onStartNewReview={handleStartNewReview}
          />
        )}

        {currentView === 'review' && activeReviewId && (
          <ReviewChatPage
            reviewId={activeReviewId}
            onBack={() => {
              setCurrentView('home');
              setActiveReviewId(null);
            }}
          />
        )}

        {currentView === 'my-reviews' && (
          <MyReviewsPage
            onStartNewReview={handleStartNewReview}
            onResumeReview={handleResumeReview}
            onBack={() => setCurrentView('home')}
          />
        )}

        {currentView === 'baseline' && (
          <BaselinePage onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'register' && (
          <RiskRegisterPage onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'reports' && (
          <ReportsPage onBack={() => setCurrentView('home')} />
        )}
      </main>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
