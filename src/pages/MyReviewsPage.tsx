import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Review } from '../types';
import { ProcessRiskSheetView } from './ProcessRiskSheetView';
import {
  FolderClock,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronRight,
  PlusCircle,
  FileText,
} from 'lucide-react';

interface MyReviewsPageProps {
  onStartNewReview: () => void;
  onResumeReview: (reviewId: string) => void;
  onBack: () => void;
}

export const MyReviewsPage: React.FC<MyReviewsPageProps> = ({
  onStartNewReview,
  onResumeReview,
  onBack,
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | null = null;
    try {
      const reviewsRef = collection(db, 'users', user.uid, 'reviews');
      const q = query(reviewsRef);
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: Review[] = [];
          snap.forEach((d) => list.push(d.data() as Review));
          // Sort chronologically (latest first)
          list.sort((a, b) => {
            const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
            const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });
          setReviews(list);
          setLoading(false);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}/reviews`);
          setLoading(false);
        }
      );
    } catch (e) {
      console.error('Error fetching user reviews:', e);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  if (selectedReview && selectedReview.riskSheet) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <button
          onClick={() => setSelectedReview(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:text-emerald-800 transition-colors py-1 px-3 rounded-lg hover:bg-emerald-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Reviews List
        </button>

        <ProcessRiskSheetView
          riskSheet={selectedReview.riskSheet}
          employeeName={selectedReview.profileSnapshot?.displayName}
          department={selectedReview.profileSnapshot?.department}
          position={selectedReview.profileSnapshot?.position}
          roleCategory={selectedReview.profileSnapshot?.roleCategory}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading text-2xl font-bold text-stone-900">
              My Process Reviews
            </h1>
          </div>
          <p className="text-xs text-stone-700 mt-1 ml-7">
            Your personal TQM audit history, interview transcripts, and Process Risk Sheets.
          </p>
        </div>

        <button
          onClick={onStartNewReview}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Start New Review
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-stone-600 text-sm">
          Loading your reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#166534] flex items-center justify-center mx-auto">
            <FolderClock className="w-7 h-7" />
          </div>
          <h2 className="font-heading font-bold text-base text-stone-900">
            No Process Reviews Yet
          </h2>
          <p className="text-xs text-stone-700 max-w-sm mx-auto leading-relaxed">
            You haven't participated in a quality audit review yet. Start your first session to map your daily tasks into SIPOC and assess operational risks.
          </p>
          <button
            onClick={onStartNewReview}
            className="px-5 py-2.5 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Start Process Review Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reviews.map((rev) => {
            const isCompleted = rev.status === 'completed';
            const createdDate = rev.createdAt?.toDate
              ? rev.createdAt.toDate().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent Session';

            return (
              <div
                key={rev.reviewId}
                className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-stone-900">
                      Review #{rev.reviewId.slice(0, 8)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-[#166534]'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isCompleted ? 'Completed' : `Step ${rev.step || 1} in Progress`}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700">
                    {rev.profileSnapshot?.department || 'Department'} • {rev.profileSnapshot?.roleCategory || 'Role'} • {createdDate}
                  </p>

                  {isCompleted && rev.riskSheet && (
                    <p className="text-xs text-stone-700 line-clamp-1 italic max-w-xl">
                      "{rev.riskSheet.summary}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCompleted && rev.riskSheet ? (
                    <button
                      onClick={() => setSelectedReview(rev)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Risk Sheet
                    </button>
                  ) : null}

                  <button
                    onClick={() => onResumeReview(rev.reviewId)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>{isCompleted ? 'View Chat Transcript' : 'Resume Review'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
