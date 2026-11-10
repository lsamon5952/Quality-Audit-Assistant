import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collectionGroup, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Review, RoleCategory, RiskPriority, FailureMode } from '../types';
import { ProcessRiskSheetView } from './ProcessRiskSheetView';
import { Modal } from '../components/Modal';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Flame,
  ArrowLeft,
  Filter,
  Eye,
  FileText,
  Search,
  MessageSquare,
} from 'lucide-react';

interface EnrichedFailureMode extends FailureMode {
  reviewId: string;
  roleCategory: RoleCategory;
  employeeName: string;
  department: string;
  date: string;
  reviewObj: Review;
}

interface RiskRegisterPageProps {
  onBack: () => void;
}

export const RiskRegisterPage: React.FC<RiskRegisterPageProps> = ({ onBack }) => {
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected review for modal inspection
  const [inspectedReview, setInspectedReview] = useState<Review | null>(null);
  const [inspectedInteractions, setInspectedInteractions] = useState<any[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) return;

    let unsubscribe: (() => void) | null = null;
    try {
      // Collection-group query for all reviews across all employees (Section 8.2)
      const q = query(collectionGroup(db, 'reviews'));
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: Review[] = [];
          snap.forEach((d) => list.push(d.data() as Review));
          setReviews(list);
          setLoading(false);
        },
        (err) => {
          console.error('Error in collection-group reviews snapshot:', err);
          handleFirestoreError(err, OperationType.GET, 'reviews');
          setLoading(false);
        }
      );
    } catch (e) {
      console.error('Collection group query error:', e);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAdmin]);

  // When a review is clicked for inspection, load its interactions
  const handleOpenReview = async (rev: Review) => {
    setInspectedReview(rev);
    setLoadingInteractions(true);
    setInspectedInteractions([]);

    try {
      // Admin query to get interactions for this review
      const interactionsQ = query(collectionGroup(db, 'interactions'));
      const unsub = onSnapshot(
        interactionsQ,
        (snap) => {
          const turns: any[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.reviewId === rev.reviewId) {
              turns.push(data);
            }
          });
          turns.sort((a, b) => {
            const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
            const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
            return tA - tB;
          });
          setInspectedInteractions(turns);
          setLoadingInteractions(false);
          unsub();
        },
        (err) => {
          console.warn('Interactions query warning:', err);
          setLoadingInteractions(false);
        }
      );
    } catch (e) {
      setLoadingInteractions(false);
    }
  };

  const completedReviews = reviews.filter((r) => r.status === 'completed');

  // Compute 4 Top Metric Numbers (Requirement 3a)
  const uniquePeople = new Set(reviews.map((r) => r.userId)).size;
  const completedCount = completedReviews.length;

  // Flatten failure modes from every completed review
  const allFailureModes: EnrichedFailureMode[] = [];
  for (const rev of completedReviews) {
    if (rev.riskSheet?.failureModes) {
      const roleCat = rev.profileSnapshot?.roleCategory || 'Teaching Faculty';
      const name = rev.profileSnapshot?.displayName || 'Employee';
      const dept = rev.profileSnapshot?.department || 'Department';
      const dateStr = rev.completedAt?.toDate
        ? rev.completedAt.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Recent';

      for (const fm of rev.riskSheet.failureModes) {
        allFailureModes.push({
          ...fm,
          reviewId: rev.reviewId,
          roleCategory: roleCat,
          employeeName: name,
          department: dept,
          date: dateStr,
          reviewObj: rev,
        });
      }
    }
  }

  // Sort by RPN highest first
  allFailureModes.sort((a, b) => b.rpn - a.rpn);

  const failureModesCount = allFailureModes.length;
  const highPriorityCount = allFailureModes.filter((fm) => fm.priority === 'High').length;

  // Compute "Risk by Role Category" (Requirement 3c)
  const categories: RoleCategory[] = ['Teaching Faculty', 'Academic Leadership', 'Office Staff'];
  const categoryStats = categories.map((cat) => {
    const matching = allFailureModes.filter((fm) => fm.roleCategory === cat);
    const count = matching.length;
    const avgRpn = count > 0 ? Math.round((matching.reduce((acc, m) => acc + m.rpn, 0) / count) * 10) / 10 : 0;
    const highestRpn = count > 0 ? Math.max(...matching.map((m) => m.rpn)) : 0;
    return { category: cat, count, avgRpn, highestRpn };
  });

  // Filtered failure modes
  const filteredFailureModes = allFailureModes.filter((fm) => {
    if (roleFilter !== 'All' && fm.roleCategory !== roleFilter) return false;
    if (priorityFilter !== 'All' && fm.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        fm.failureMode.toLowerCase().includes(q) ||
        fm.processStep.toLowerCase().includes(q) ||
        fm.relatedCode.toLowerCase().includes(q) ||
        fm.cause.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
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
              FMEA College Risk Register
            </h1>
          </div>
          <p className="text-xs text-stone-700 mt-1 ml-7">
            Consolidated institutional Failure Mode and Effects Analysis ranked by Risk Priority Number (RPN).
          </p>
        </div>
      </div>

      {/* Requirement 3a: Four Numbers at the Top */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">People Interviewed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#166534] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900 font-heading">
            {uniquePeople}
          </p>
          <span className="text-[11px] text-stone-600">Across academic & support offices</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Completed Reviews</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#166534] flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900 font-heading">
            {completedCount}
          </p>
          <span className="text-[11px] text-stone-600">{reviews.length - completedCount} in progress</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Failure Modes</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#EA580C] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900 font-heading">
            {failureModesCount}
          </p>
          <span className="text-[11px] text-stone-600">FMEA records mapped</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">High-Priority Risks</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-red-600 font-heading">
            {highPriorityCount}
          </p>
          <span className="text-[11px] text-red-700">RPN ≥ 150 or S ≥ 9</span>
        </div>
      </div>

      {/* Requirement 3c: Risk by Role Category */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div>
          <h2 className="font-heading font-bold text-base text-stone-900">
            Risk by Role Category
          </h2>
          <p className="text-xs text-stone-700">
            Failure mode distribution, average severity-occurrence-detection index, and maximum risk exposure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categoryStats.map((stat) => (
            <div
              key={stat.category}
              className="p-4 rounded-2xl bg-[#F6F8F6] border border-stone-200/80 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs text-stone-900">{stat.category}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-700">
                  {stat.count} failure mode{stat.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[11px] text-stone-600 block">Average RPN</span>
                  <span className="font-extrabold text-lg text-stone-900 font-heading">{stat.avgRpn}</span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-600 block">Highest RPN</span>
                  <span className={`font-extrabold text-lg font-heading ${stat.highestRpn >= 150 ? 'text-red-600' : 'text-[#166534]'}`}>
                    {stat.highestRpn}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requirement 3b: The FMEA Risk Register */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-lg text-stone-900">
              Institutional FMEA Risk Register
            </h2>
            <p className="text-xs text-stone-700">
              Every failure mode from every completed review, sorted by RPN (highest first). Click any row to inspect the source review.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search failure, code..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-[#166534] outline-hidden bg-white w-40"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-stone-500 ml-1.5" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent font-medium text-stone-700 outline-hidden pr-2 cursor-pointer text-xs"
              >
                <option value="All">All Roles</option>
                <option value="Teaching Faculty">Teaching Faculty</option>
                <option value="Academic Leadership">Academic Leadership</option>
                <option value="Office Staff">Office Staff</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent font-medium text-stone-700 outline-hidden pr-2 cursor-pointer text-xs"
              >
                <option value="All">All Priorities</option>
                <option value="High">High Only</option>
                <option value="Medium">Medium Only</option>
                <option value="Low">Low Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Register Table */}
        {loading ? (
          <div className="p-12 text-center text-stone-600 text-xs">
            Loading college risk register...
          </div>
        ) : filteredFailureModes.length === 0 ? (
          <div className="p-12 text-center text-stone-600 text-xs bg-stone-50 rounded-2xl border border-stone-200">
            No failure modes match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#166534] text-white font-heading">
                  <th className="py-3 px-3 font-semibold">Process</th>
                  <th className="py-3 px-4 font-semibold">Failure Mode & Effect</th>
                  <th className="py-3 px-3 font-semibold">Root Cause</th>
                  <th className="py-3 px-2 font-semibold text-center" title="Severity">S</th>
                  <th className="py-3 px-2 font-semibold text-center" title="Occurrence">O</th>
                  <th className="py-3 px-2 font-semibold text-center" title="Detection">D</th>
                  <th className="py-3 px-3 font-semibold text-center">RPN</th>
                  <th className="py-3 px-3 font-semibold">Priority</th>
                  <th className="py-3 px-3 font-semibold">Code</th>
                  <th className="py-3 px-3 font-semibold">Role Category</th>
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-2 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {filteredFailureModes.map((fm, idx) => (
                  <tr
                    key={idx}
                    onClick={() => handleOpenReview(fm.reviewObj)}
                    className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 align-top font-medium text-stone-800">
                      <span className="truncate block max-w-[100px] bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">
                        {fm.processStep}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top max-w-xs space-y-1">
                      <strong className="text-stone-900 block font-semibold group-hover:text-[#166534] transition-colors">
                        {fm.failureMode}
                      </strong>
                      <p className="text-stone-700 text-[11px] leading-tight line-clamp-2">
                        <span className="text-stone-600">Effect:</span> {fm.effect}
                      </p>
                    </td>
                    <td className="py-3 px-3 align-top text-stone-700 text-[11px] max-w-[150px]">
                      <span className="line-clamp-2">{fm.cause}</span>
                    </td>
                    <td className="py-3 px-2 align-top text-center font-bold text-stone-900">
                      {fm.severity}
                    </td>
                    <td className="py-3 px-2 align-top text-center font-bold text-stone-900">
                      {fm.occurrence}
                    </td>
                    <td className="py-3 px-2 align-top text-center font-bold text-stone-900">
                      {fm.detection}
                    </td>
                    <td className="py-3 px-3 align-top text-center">
                      <span className="font-extrabold text-sm text-[#166534] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        {fm.rpn}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          fm.priority === 'High'
                            ? 'bg-red-100 text-red-800'
                            : fm.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {fm.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <span className="font-mono text-[10px] font-semibold bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded">
                        {fm.relatedCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top text-[11px] text-stone-700">
                      {fm.roleCategory}
                    </td>
                    <td className="py-3 px-3 align-top text-[11px] text-stone-600">
                      {fm.date}
                    </td>
                    <td className="py-3 px-2 align-top text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReview(fm.reviewObj);
                        }}
                        className="p-1 rounded-lg text-stone-400 group-hover:text-[#166534] transition-colors"
                        title="View complete review"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Requirement 3d: All Reviews Table */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div>
          <h2 className="font-heading font-bold text-lg text-stone-900">
            All Reviews Record
          </h2>
          <p className="text-xs text-stone-700">
            Full inventory of completed and ongoing audit reviews across departments.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-heading">
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Role Category</th>
                <th className="py-3 px-4 font-semibold">Position</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {reviews.map((rev) => {
                const isCompleted = rev.status === 'completed';
                const createdDate = rev.createdAt?.toDate
                  ? rev.createdAt.toDate().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A';

                return (
                  <tr key={rev.reviewId} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      {rev.profileSnapshot?.displayName || 'Anonymous Colleague'}
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      {rev.profileSnapshot?.roleCategory || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      {rev.profileSnapshot?.position || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {createdDate}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-100 text-[#166534]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isCompleted ? 'Completed' : `Step ${rev.step || 1}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenReview(rev)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 hover:bg-[#166534] hover:text-white rounded-lg text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Inspect Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Inspector Modal (Process Risk Sheet + Dialogue Transcript) */}
      <Modal
        isOpen={Boolean(inspectedReview)}
        onClose={() => setInspectedReview(null)}
        title={`Review Audit: ${inspectedReview?.profileSnapshot?.displayName || 'Employee'}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          {inspectedReview?.riskSheet ? (
            <div>
              <h3 className="font-heading font-bold text-base text-stone-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#166534]" />
                Process Risk Sheet
              </h3>
              <ProcessRiskSheetView
                riskSheet={inspectedReview.riskSheet}
                employeeName={inspectedReview.profileSnapshot?.displayName}
                department={inspectedReview.profileSnapshot?.department}
                position={inspectedReview.profileSnapshot?.position}
                roleCategory={inspectedReview.profileSnapshot?.roleCategory}
              />
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
              This review is still in progress (Step {inspectedReview?.step || 1}) and has not been scored yet.
            </div>
          )}

          {/* Transcript Section */}
          <div className="border-t border-stone-200 pt-5 space-y-3">
            <h3 className="font-heading font-bold text-base text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#EA580C]" />
              Dialogue Transcript
            </h3>

            {loadingInteractions ? (
              <div className="p-6 text-center text-xs text-stone-600">
                Loading interaction transcript...
              </div>
            ) : inspectedInteractions.length === 0 ? (
              <div className="p-4 bg-stone-50 rounded-xl text-xs text-stone-600 text-center">
                No interaction logs recorded.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                {inspectedInteractions.map((turn, tIdx) => (
                  <div
                    key={tIdx}
                    className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                      turn.role === 'assistant'
                        ? 'bg-emerald-50/80 border border-emerald-100 text-stone-800'
                        : 'bg-white border border-stone-200 border-r-4 border-r-[#166534] text-stone-900'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-semibold text-stone-600 mb-1">
                      <span>{turn.role === 'assistant' ? 'Audit Assistant' : inspectedReview?.profileSnapshot?.displayName || 'Employee'}</span>
                      {turn.step && <span>Step {turn.step}</span>}
                    </div>
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-100">
            <button
              onClick={() => setInspectedReview(null)}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
