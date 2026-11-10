import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { collection, query, onSnapshot, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { RiskReport } from '../types';
import {
  FileBarChart,
  Download,
  Sparkles,
  Calendar,
  Clock,
  ArrowLeft,
  FileDown,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ReportsPageProps {
  onBack: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onBack }) => {
  const { user, isAdmin, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [savedReports, setSavedReports] = useState<RiskReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingTranscripts, setDownloadingTranscripts] = useState(false);

  // Active / generated report
  const [currentMarkdown, setCurrentMarkdown] = useState<string | null>(null);
  const [currentStats, setCurrentStats] = useState<any | null>(null);
  const [currentModelUsed, setCurrentModelUsed] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Listen to /riskReports (Admin only)
  useEffect(() => {
    if (!user || !isAdmin) return;

    let unsubscribe: (() => void) | null = null;
    try {
      const q = query(collection(db, 'riskReports'));
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: RiskReport[] = [];
          snap.forEach((d) => list.push(d.data() as RiskReport));
          list.sort((a, b) => {
            const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
            const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });
          setSavedReports(list);
          setLoadingReports(false);
        },
        (err) => {
          console.error('Error fetching risk reports:', err);
          handleFirestoreError(err, OperationType.GET, 'riskReports');
          setLoadingReports(false);
        }
      );
    } catch (e) {
      console.error('Error attaching riskReports listener:', e);
      setLoadingReports(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAdmin]);

  // Generate Consolidated Report via server POST /api/admin/report
  const handleGenerateReport = async () => {
    if (!user || generating) return;
    setGenerating(true);
    setCurrentMarkdown(null);
    setCurrentStats(null);
    setIsSaved(false);

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Token unavailable');

      const response = await fetch('/api/admin/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        let errJson: any;
        try {
          errJson = await response.json();
        } catch {
          errJson = { error: 'Report generation failed' };
        }
        throw new Error(errJson.error || `Server error (${response.status})`);
      }

      const data = await response.json();
      setCurrentMarkdown(data.markdown);
      setCurrentStats(data.stats);
      setCurrentModelUsed(data.modelUsed);
      showToast('Consolidated Report generated successfully!', 'success');
    } catch (err: any) {
      console.error('Report error:', err);
      showToast(err.message || 'Failed to generate report.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Save generated report to /riskReports in Firestore
  const handleSaveToFirestore = async () => {
    if (!user || !currentMarkdown || !currentStats) return;

    try {
      const reportId = `report-${crypto.randomUUID()}`;
      const reportRef = doc(db, 'riskReports', reportId);

      await setDoc(reportRef, {
        id: reportId,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        markdown: currentMarkdown,
        stats: currentStats,
      });

      setIsSaved(true);
      showToast('Report saved to archive!', 'success');
    } catch (err: any) {
      console.error('Save report error:', err);
      handleFirestoreError(err, OperationType.WRITE, 'riskReports');
      showToast('Failed to save report.', 'error');
    }
  };

  // Download markdown helper
  const downloadMarkdownFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all transcripts as .md via GET /api/admin/transcripts
  const handleDownloadTranscripts = async () => {
    setDownloadingTranscripts(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Token unavailable');

      const response = await fetch('/api/admin/transcripts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export transcripts from server.');
      }

      const data = await response.json();
      const filename = `UM-Tagum-Quality-Audit-Transcripts-${new Date().toISOString().split('T')[0]}.md`;
      downloadMarkdownFile(filename, data.markdown);
      showToast('Consolidated transcripts exported successfully!', 'success');
    } catch (err: any) {
      console.error('Transcripts export error:', err);
      showToast(err.message || 'Failed to export transcripts.', 'error');
    } finally {
      setDownloadingTranscripts(false);
    }
  };

  const renderMarkdown = (text: string) => {
    try {
      const rawHtml = marked.parse(text, { async: false }) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr'],
        ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      });
      return { __html: cleanHtml };
    } catch {
      return { __html: text };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
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
              Institutional Quality Reports
            </h1>
          </div>
          <p className="text-xs text-stone-700 mt-1 ml-7">
            Consolidated TQM audit reports synthesized with server-computed metrics and exportable evaluation transcripts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Download transcripts (.md) button (Requirement 4) */}
          <button
            onClick={handleDownloadTranscripts}
            disabled={downloadingTranscripts}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 text-[#166534]" />
            <span>{downloadingTranscripts ? 'Exporting...' : 'Download transcripts (.md)'}</span>
          </button>

          {/* Generate Consolidated Report button (Requirement 4) */}
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {generating ? (
              <>
                <Clock className="w-4 h-4 animate-spin text-white" />
                <span>Computing Metrics & Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate Consolidated Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Report Viewer */}
      {currentMarkdown && (
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-stone-200 shadow-md space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#166534] mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Generated Report
              </span>
              <h2 className="font-heading font-bold text-lg text-stone-900">
                Consolidated Process Risk Report
              </h2>
              {currentModelUsed && (
                <span className="text-[11px] font-mono text-stone-600 block">
                  AI Model: {currentModelUsed}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToFirestore}
                disabled={isSaved}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-emerald-50 text-[#166534] border border-emerald-200'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {isSaved ? 'Saved to Archive' : 'Save to /riskReports'}
              </button>

              <button
                onClick={() => {
                  const filename = `UM-Tagum-Risk-Report-${new Date().toISOString().split('T')[0]}.md`;
                  downloadMarkdownFile(filename, currentMarkdown);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Report (.md)
              </button>
            </div>
          </div>

          <div
            className="prose prose-sm sm:prose max-w-none text-stone-800 leading-relaxed font-sans"
            dangerouslySetInnerHTML={renderMarkdown(currentMarkdown)}
          />
        </div>
      )}

      {/* Saved Reports Archive (Requirement 4) */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div>
          <h2 className="font-heading font-bold text-lg text-stone-900 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-[#166534]" />
            Saved Reports Archive
          </h2>
          <p className="text-xs text-stone-700">
            Historical consolidated reports saved by the administrator at /riskReports.
          </p>
        </div>

        {loadingReports ? (
          <div className="p-8 text-center text-xs text-stone-600">
            Loading archived reports...
          </div>
        ) : savedReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-600 bg-stone-50 rounded-2xl border border-stone-200">
            No saved reports archived yet. Click "Generate Consolidated Report" above to synthesize an audit report.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {savedReports.map((rep) => {
              const dateStr = rep.createdAt?.toDate
                ? rep.createdAt.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Archived';

              return (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#166534]" />
                      <span className="font-heading font-semibold text-xs text-stone-900">
                        Report from {dateStr}
                      </span>
                    </div>
                    {rep.stats && (
                      <p className="text-[11px] text-stone-600">
                        {rep.stats.peopleCount} People • {rep.stats.reviewsCount} Completed Reviews • {rep.stats.failureModesCount} Failure Modes • {rep.stats.highPriorityCount} High Priority
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentMarkdown(rep.markdown);
                        setCurrentStats(rep.stats);
                        setIsSaved(true);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-stone-200 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 transition-colors cursor-pointer"
                    >
                      View Report
                    </button>
                    <button
                      onClick={() => {
                        const filename = `UM-Tagum-Risk-Report-${rep.id}.md`;
                        downloadMarkdownFile(filename, rep.markdown);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download (.md)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
