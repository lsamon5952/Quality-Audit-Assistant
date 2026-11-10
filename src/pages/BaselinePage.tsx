import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { BaselineDoc, BaselineSettings } from '../types';
import {
  BookOpen,
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  PlusCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const MAX_TOTAL_CHARS = 800000;
const MAX_FILE_BYTES = 200 * 1024; // 200 KB per file

export function cleanDocumentTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle.replace(/^#+\s*/, '').trim();
}

const SAMPLE_BASELINE_DOCS: BaselineDoc[] = [
  {
    id: 'tl-standards-2026',
    title: 'Teaching & Learning Quality Standards (TL Codes)',
    text: `# Teaching & Learning Quality Standards (TL Codes)
## 1. Syllabus & Curriculum
- **TL-1.1**: Course syllabi must be aligned with Outcomes-Based Education (OBE) frameworks and uploaded to the LMS prior to the first day of classes.
- **TL-1.2**: Periodic syllabus updates reflecting industry-aligned competencies and student feedback.

## 2. Assessment & Feedback
- **TL-2.1**: Major examinations must follow the approved Table of Specifications (TOS) vetted by the Program Head.
- **TL-2.3**: Formative assessment feedback and graded rubrics must be returned to students within 7 working days.

## 3. Grade Submission & Compliance
- **TL-3.2**: Midterm and Final grade sheets must be locked and verified in the Student Information System within 72 hours of the final examination period.
- **TL-3.3**: Incomplete (INC) grade tracking and 1-year removal compliance monitoring.

## 4. Student Support & Mentorship
- **TL-4.1**: Documented student consultation hours (minimum 5 hours weekly) with log sheets submitted monthly.
- **TL-4.2**: Early academic intervention and referral to Guidance Office for students with failing preliminary marks.`,
    sizeChars: 1100,
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'al-standards-2026',
    title: 'Academic Leadership & Governance Standards (AL Codes)',
    text: `# Academic Leadership & Governance Standards (AL Codes)
## 1. Curriculum & Program Review
- **AL-1.1**: Annual stakeholder consultative meeting with alumni and industry advisory councils.
- **AL-1.2**: Systematic 3-year curriculum revision cycle conforming to CHED Policies, Standards, and Guidelines (PSGs).

## 2. Faculty Management
- **AL-2.1**: Equitable faculty loading allocation strictly conforming to specialization and tenure guidelines.
- **AL-2.2**: Peer teaching observation conducted at least once per term for all probationary and permanent instructors.

## 3. Research, Development & Extension
- **AL-3.4**: Departmental target of at least 1 Scopus/WoS indexed research publication per academic year.
- **AL-3.5**: Community extension initiatives targeting sustainable development goals in Davao del Norte.

## 4. Accreditation & TQM Audit
- **AL-4.1**: Maintenance of program PACUCOA Level III/IV accreditation compliance folders.
- **AL-4.2**: Semi-annual internal quality audit (IQA) non-conformance closure within 30 calendar days.`,
    sizeChars: 1120,
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'os-cw-standards-2026',
    title: 'Office Staff & College-Wide Operational Standards (OS & CW Codes)',
    text: `# Office Staff & College-Wide Operational Standards (OS & CW Codes)
## 1. Office Staff Service Standards (OS Codes)
- **OS-1.1**: Official Transcript of Records (TOR) and Certification turnaround time capped at 3 working days upon clearance.
- **OS-2.4**: Enrollment clearance queue times maintained below 15 minutes per transaction through digital verification.
- **OS-3.2**: Preventative maintenance and air-conditioning servicing for classrooms and laboratories logged bi-monthly.
- **OS-4.1**: Prompt ICT equipment troubleshooting with 4-hour SLA for instructional classroom projectors and terminals.

## 2. College-Wide Institutional Standards (CW Codes)
- **CW-1.0**: Institutional Code of Ethics, data privacy compliance, and non-disclosure of student personal records.
- **CW-2.1**: ISO 9001:2015 Quality Management System continuous audit readiness and document version control.
- **CW-3.0**: Semi-annual stakeholder satisfaction survey evaluation with minimum 85% satisfaction benchmark across offices.`,
    sizeChars: 1150,
    uploadedAt: new Date().toISOString(),
  },
];

interface BaselinePageProps {
  onBack: () => void;
}

export const BaselinePage: React.FC<BaselinePageProps> = ({ onBack }) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState<BaselineDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [viewingDoc, setViewingDoc] = useState<BaselineDoc | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Paste form
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');

  // Load baseline document on mount
  useEffect(() => {
    let active = true;
    const fetchBaseline = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'baseline'));
        if (snap.exists() && active) {
          const data = snap.data() as BaselineSettings;
          setDocuments(Array.isArray(data.documents) ? data.documents : []);
        } else if (active) {
          setDocuments([]);
        }
      } catch (err) {
        console.error('Error fetching baseline settings:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchBaseline();
    return () => {
      active = false;
    };
  }, []);

  const totalChars = documents.reduce((sum, d) => sum + (d.sizeChars || 0), 0);
  const percentUsed = Math.min(100, Math.round((totalChars / MAX_TOTAL_CHARS) * 100));

  const saveDocumentsToFirestore = async (newDocs: BaselineDoc[]) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'baseline'), {
        documents: newDocs,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setDocuments(newDocs);
      showToast('Baseline documents successfully updated!', 'success');
    } catch (err: any) {
      console.error('Error updating baseline:', err);
      handleFirestoreError(err, OperationType.WRITE, 'settings/baseline');
      showToast('Failed to save baseline settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Section 8.6: Baseline file upload (.md or .txt only, 200 KB per file, 800,000 chars total)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'md' && extension !== 'txt') {
      showToast('Invalid file format. Only .md and .txt files are permitted.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      showToast(`File exceeds limit. Maximum allowed size is 200 KB (received ${(file.size / 1024).toFixed(1)} KB).`, 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = (event.target?.result as string) || '';
      const textLength = text.length;

      if (totalChars + textLength > MAX_TOTAL_CHARS) {
        showToast(`Adding this file would exceed the 800,000 character limit (${(totalChars + textLength).toLocaleString()} chars).`, 'error');
        return;
      }

      // Title: first "# " heading line (stripped of markdown markers), or filename if none
      let title = file.name;
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
          title = cleanDocumentTitle(trimmed);
          break;
        }
      }
      if (!title) title = file.name;

      const newDoc: BaselineDoc = {
        id: crypto.randomUUID(),
        title,
        text,
        sizeChars: textLength,
        uploadedAt: new Date().toISOString(),
      };

      await saveDocumentsToFirestore([...documents, newDoc]);
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) {
      showToast('Please enter document content.', 'error');
      return;
    }

    const textLength = pasteText.length;
    if (totalChars + textLength > MAX_TOTAL_CHARS) {
      showToast(`Document exceeds the 800,000 character limit.`, 'error');
      return;
    }

    let title = cleanDocumentTitle(pasteTitle.trim());
    if (!title) {
      const lines = pasteText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
          title = cleanDocumentTitle(trimmed);
          break;
        }
      }
      if (!title) title = 'Pasted Quality Standard';
    }

    const newDoc: BaselineDoc = {
      id: crypto.randomUUID(),
      title,
      text: pasteText,
      sizeChars: textLength,
      uploadedAt: new Date().toISOString(),
    };

    await saveDocumentsToFirestore([...documents, newDoc]);
    setShowPasteModal(false);
    setPasteTitle('');
    setPasteText('');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDocId) return;
    const filtered = documents.filter((d) => d.id !== deletingDocId);
    await saveDocumentsToFirestore(filtered);
    setDeletingDocId(null);
  };

  const handleSeedSampleBaseline = async () => {
    await saveDocumentsToFirestore(SAMPLE_BASELINE_DOCS);
  };

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
              College Quality Baseline
            </h1>
          </div>
          <p className="text-xs text-stone-700 mt-1 ml-7">
            Manage institutional quality requirements and requirement codes (TL, AL, OS, CW) used by the Audit Assistant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {documents.length === 0 && (
            <button
              onClick={handleSeedSampleBaseline}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-100 text-[#EA580C] hover:bg-orange-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Seed UM Tagum Standards
            </button>
          )}

          <button
            onClick={() => setShowPasteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Paste Text
          </button>

          <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer">
            <UploadCloud className="w-4 h-4" />
            <span>Upload .md / .txt</span>
            <input
              type="file"
              accept=".md,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={saving}
            />
          </label>
        </div>
      </div>

      {/* Storage & Limits Bar (Requirement 2 & Section 8.6) */}
      <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-800">
            Total Characters Stored: {totalChars.toLocaleString()} / {MAX_TOTAL_CHARS.toLocaleString()} chars
          </span>
          <span className="font-mono text-stone-600">
            {percentUsed}% capacity used ({documents.length} document{documents.length === 1 ? '' : 's'})
          </span>
        </div>
        <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percentUsed > 90 ? 'bg-red-500' : percentUsed > 70 ? 'bg-amber-500' : 'bg-[#166534]'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
        <p className="text-[11px] text-stone-600">
          Constraints: Maximum 200 KB per file. Single document storage in <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-[10px]">settings/baseline</code>. Title auto-extracted from first <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-[10px]"># </code> heading.
        </p>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="p-12 text-center text-stone-600 text-sm">
          Loading baseline documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#166534] flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h2 className="font-heading font-bold text-base text-stone-900">
            No Quality Baseline Uploaded
          </h2>
          <p className="text-xs text-stone-700 max-w-sm mx-auto leading-relaxed">
            Without baseline standards, the Audit Assistant conducts general process audits without citing requirement codes.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSeedSampleBaseline}
              className="px-4 py-2 bg-orange-100 text-[#EA580C] hover:bg-orange-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Pre-load UM Tagum TQM Standards
            </button>
            <button
              onClick={() => setShowPasteModal(true)}
              className="px-4 py-2 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Paste Requirements
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {documents.map((docItem) => (
            <div
              key={docItem.id}
              className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#166534] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-stone-900">
                    {cleanDocumentTitle(docItem.title)}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-stone-600 mt-0.5">
                    <span>{docItem.sizeChars.toLocaleString()} characters</span>
                    <span>•</span>
                    <span>
                      Uploaded {new Date(docItem.uploadedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setViewingDoc(docItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  onClick={() => setDeletingDocId(docItem.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Document In-App Modal */}
      <Modal
        isOpen={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        title={cleanDocumentTitle(viewingDoc?.title || 'Baseline Document')}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-600 border-b border-stone-100 pb-2">
            <span>Size: {viewingDoc?.sizeChars.toLocaleString()} characters</span>
            <span>Uploaded: {viewingDoc && new Date(viewingDoc.uploadedAt).toLocaleString()}</span>
          </div>
          <pre className="p-4 bg-stone-50 rounded-xl font-mono text-xs text-stone-800 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed border border-stone-200">
            {viewingDoc?.text}
          </pre>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setViewingDoc(null)}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Document In-App Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingDocId)}
        onClose={() => setDeletingDocId(null)}
        title={`Delete Document: ${cleanDocumentTitle(documents.find((d) => d.id === deletingDocId)?.title || 'Baseline Document')}`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-700 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Are you sure you want to delete "{cleanDocumentTitle(documents.find((d) => d.id === deletingDocId)?.title || 'this document')}"? The Audit Assistant will no longer reference its codes during process reviews.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              onClick={() => setDeletingDocId(null)}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Deleting...' : 'Delete Document'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Paste Document In-App Modal */}
      <Modal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        title="Paste Quality Baseline Text"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handlePasteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Document Title (Optional - defaults to first # heading)
            </label>
            <input
              type="text"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="# Institutional Code of Ethics"
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-[#166534] focus:border-[#166534] outline-hidden bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Quality Standards Content (.md or text) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={10}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="# Standard Title&#10;- TL-3.2: Grade submission deadline...&#10;- OS-1.1: Records turnaround..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-[#166534] focus:border-[#166534] outline-hidden bg-white resize-y leading-relaxed"
            />
            <div className="flex justify-between text-[11px] text-stone-600 mt-1">
              <span>Include requirement codes like TL-X.X, AL-X.X, OS-X.X, CW-X.X.</span>
              <span>{pasteText.length.toLocaleString()} characters</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !pasteText.trim()}
              className="px-5 py-2 rounded-xl bg-[#166534] hover:bg-emerald-800 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
