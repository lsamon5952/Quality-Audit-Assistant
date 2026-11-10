import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { ProcessRiskSheetView } from './ProcessRiskSheetView';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Review, Interaction, ProcessRiskSheet } from '../types';
import {
  Send,
  ClipboardList,
  User,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ReviewChatPageProps {
  reviewId: string;
  onBack: () => void;
}

const STEPS = [
  { num: 1, title: 'Customers & Outputs' },
  { num: 2, title: 'Process Steps' },
  { num: 3, title: 'Suppliers & Inputs' },
  { num: 4, title: 'What Can Go Wrong' },
  { num: 5, title: 'Improvements' },
];

export const ReviewChatPage: React.FC<ReviewChatPageProps> = ({ reviewId, onBack }) => {
  const { user, profile, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [review, setReview] = useState<Review | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isWaitingReply, setIsWaitingReply] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [lastClientMessageId, setLastClientMessageId] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Finish & Score confirmation modal
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const firstName = (profile?.displayName || user?.displayName || 'Colleague').split(' ')[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Listen to review document and interactions
  useEffect(() => {
    if (!user || !reviewId) return;

    let unsubscribeReview: (() => void) | null = null;
    let unsubscribeInteractions: (() => void) | null = null;

    try {
      const reviewDocRef = doc(db, 'users', user.uid, 'reviews', reviewId);
      unsubscribeReview = onSnapshot(
        reviewDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Review;
            setReview(data);
            if (data.step && data.step > currentStep) {
              setCurrentStep(data.step);
            }
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/reviews/${reviewId}`)
      );

      const interactionsRef = collection(db, 'users', user.uid, 'interactions');
      const q = query(interactionsRef, where('reviewId', '==', reviewId));
      unsubscribeInteractions = onSnapshot(
        q,
        (snap) => {
          const list: Interaction[] = [];
          snap.forEach((d) => list.push(d.data() as Interaction));
          // Sort chronologically
          list.sort((a, b) => {
            const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
            const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
            return tA - tB;
          });
          setInteractions(list);

          // Update step tracker (only moves forward)
          let maxStep = 1;
          for (const item of list) {
            if (item.step && item.step > maxStep) maxStep = item.step;
          }
          setCurrentStep((prev) => Math.max(prev, maxStep));
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/interactions`)
      );
    } catch (e) {
      console.error('Error attaching review listeners:', e);
    }

    return () => {
      if (unsubscribeReview) unsubscribeReview();
      if (unsubscribeInteractions) unsubscribeInteractions();
    };
  }, [user, reviewId]);

  // 2. Initialize first fixed message if new review has no interactions
  useEffect(() => {
    if (!user || !profile || interactions.length > 0 || review?.status === 'completed') return;

    const seedInitialGreeting = async () => {
      try {
        const firstMessageId = 'welcome-' + reviewId;
        const interactionDocRef = doc(db, 'users', user.uid, 'interactions', firstMessageId);

        const initialContent = `Hello ${firstName}! Welcome to the UM Tagum College Process Review for our Total Quality Management audit. We will go through five quick steps: 1 Customers & Outputs, 2 Process Steps, 3 Suppliers & Inputs, 4 What Can Go Wrong, and 5 Improvements.

To begin, who depends on the work you do, and what do they expect from you?`;

        await setDoc(interactionDocRef, {
          interactionId: firstMessageId,
          reviewId,
          userId: user.uid,
          clientMessageId: 'init-greeting',
          role: 'assistant',
          content: initialContent,
          step: 1,
          timestamp: serverTimestamp(),
        });

        // Ensure review document exists
        const reviewDocRef = doc(db, 'users', user.uid, 'reviews', reviewId);
        await setDoc(
          reviewDocRef,
          {
            reviewId,
            userId: user.uid,
            status: 'in_progress',
            step: 1,
            profileSnapshot: {
              department: profile.department,
              roleCategory: profile.roleCategory,
              position: profile.position,
              jobFunction: profile.jobFunction,
              yearsInRole: profile.yearsInRole,
              displayName: profile.displayName || user.displayName || 'Employee',
            },
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Initial greeting seeding notice:', err);
      }
    };

    seedInitialGreeting();
  }, [user, profile, interactions.length, reviewId, review?.status, firstName]);

  useEffect(() => {
    scrollToBottom();
  }, [interactions, isWaitingReply]);

  // Seconds counter while waiting for reply
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isWaitingReply) {
      setSecondsElapsed(0);
      timer = setInterval(() => {
        setSecondsElapsed((sec) => sec + 1);
      }, 1000);
    } else {
      setSecondsElapsed(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWaitingReply]);

  // Safe Markdown renderer (DOMPurify + protocol sanitizer)
  const renderMarkdown = (text: string) => {
    try {
      const rawHtml = marked.parse(text, { async: false }) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'br'],
        ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      });
      return { __html: cleanHtml };
    } catch {
      return { __html: text };
    }
  };

  // Section 8.4: Sending & Reliable Saving Protocol
  const handleSendMessage = async (textToSend?: string, existingClientId?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || !user || isWaitingReply) return;

    if (message.length > 2000) {
      showToast('Message must be 2,000 characters or fewer.', 'error');
      return;
    }

    // Reuse existing clientMessageId if retrying, otherwise create a new UUID
    const clientMessageId = existingClientId || crypto.randomUUID();
    setLastClientMessageId(clientMessageId);
    setLastFailedMessage(message);

    // Section 8.4: Send clears the input at once
    setInputText('');

    // Check offline state immediately
    if (!navigator.onLine) {
      setInputText(message);
      showToast('You are currently offline. Message not sent.', 'error', () =>
        handleSendMessage(message, clientMessageId)
      );
      return;
    }

    const docId = `user-${clientMessageId}`;
    const userInteractionRef = doc(db, 'users', user.uid, 'interactions', docId);

    // Save user message to Firestore with 15s timeout
    try {
      const savePromise = setDoc(userInteractionRef, {
        interactionId: docId,
        reviewId,
        userId: user.uid,
        clientMessageId,
        role: 'user',
        content: message,
        step: currentStep,
        timestamp: serverTimestamp(),
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Save timeout after 15s')), 15000)
      );

      await Promise.race([savePromise, timeoutPromise]);
    } catch (saveErr: any) {
      console.error('Firestore save failed:', saveErr);
      // Section 8.4: Put text back in input and show Retry Save toast
      setInputText(message);
      showToast('Failed to save message. Please click Retry.', 'error', () =>
        handleSendMessage(message, clientMessageId)
      );
      return;
    }

    // Once saved to Firestore, call server POST /api/review/chat
    setIsWaitingReply(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Authentication token unavailable');

      const response = await fetch('/api/review/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewId,
          clientMessageId,
          message,
        }),
      });

      if (response.status === 502 || response.status === 504) {
        showToast('The assistant is busy. Click Retry.', 'error', () =>
          handleSendMessage(message, clientMessageId),
          'Retry'
        );
        return;
      }

      if (!response.ok) {
        let errJson: any;
        try {
          errJson = await response.json();
        } catch {
          errJson = { error: 'Non-JSON server response' };
        }
        throw new Error(errJson.error || `Server error (${response.status})`);
      }

      const data = await response.json();
      const assistantDocId = `asst-${crypto.randomUUID()}`;
      const assistantInteractionRef = doc(db, 'users', user.uid, 'interactions', assistantDocId);

      const nextStep = Math.max(currentStep, data.step || currentStep);
      setCurrentStep(nextStep);

      // Save Audit Assistant reply to Firestore
      await setDoc(assistantInteractionRef, {
        interactionId: assistantDocId,
        reviewId,
        userId: user.uid,
        clientMessageId: `reply-${clientMessageId}`,
        role: 'assistant',
        content: data.reply,
        step: nextStep,
        modelUsed: data.modelUsed,
        timestamp: serverTimestamp(),
      });

      // Update review step
      const reviewDocRef = doc(db, 'users', user.uid, 'reviews', reviewId);
      await setDoc(reviewDocRef, { step: nextStep }, { merge: true });

      setLastFailedMessage(null);
    } catch (apiErr: any) {
      console.error('API call failed:', apiErr);
      showToast(
        apiErr.message || 'The assistant is busy. Click Retry.',
        'error',
        () => handleSendMessage(message, clientMessageId),
        'Retry'
      );
    } finally {
      setIsWaitingReply(false);
    }
  };

  // Section 8.3 & Finish & Score
  const handleFinishAndScore = async () => {
    if (!user || isScoring) return;
    setIsScoring(true);

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Authentication token unavailable');

      const response = await fetch('/api/review/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewId }),
      });

      if (!response.ok) {
        let errJson: any;
        try {
          errJson = await response.json();
        } catch {
          errJson = { error: 'Scoring request failed' };
        }
        throw new Error(errJson.error || `Server error (${response.status})`);
      }

      const riskSheet: ProcessRiskSheet = await response.json();

      // Browser saves it on the review and marks the review completed (Section 8.2)
      const reviewDocRef = doc(db, 'users', user.uid, 'reviews', reviewId);
      await setDoc(
        reviewDocRef,
        {
          status: 'completed',
          riskSheet,
          completedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setShowFinishModal(false);
      showToast('Process Risk Sheet successfully generated and saved!', 'success');
    } catch (err: any) {
      console.error('Scoring error:', err);
      showToast(err.message || 'Failed to generate Process Risk Sheet. Please retry.', 'error');
    } finally {
      setIsScoring(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F6F8F6]">
      {/* Top Header & Step Tracker */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 shrink-0 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
              title="Return to reviews"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-bold text-base text-stone-900">
                  Process Review Session
                </h1>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  review?.status === 'completed'
                    ? 'bg-emerald-100 text-[#166534]'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {review?.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
              </div>
              <p className="text-[11px] text-stone-700 truncate max-w-xs sm:max-w-md">
                {profile?.department || 'Department'} • {profile?.roleCategory || 'Role'} • ID: {reviewId}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {review?.status !== 'completed' && (
              <button
                onClick={() => setShowFinishModal(true)}
                disabled={interactions.length < 3 || isWaitingReply}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#166534] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={interactions.length < 3 ? 'Exchange at least 2 answers before scoring' : 'Generate Process Risk Sheet'}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Finish & Score
              </button>
            )}
          </div>
        </div>

        {/* 5-Step Tracker with Numbered Circles (Requirement 4) */}
        <div className="max-w-5xl mx-auto mt-3 pt-3 border-t border-stone-100 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[580px] px-2">
            {STEPS.map((s, idx) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;

              return (
                <React.Fragment key={s.num}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-heading font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-[#166534] text-white ring-4 ring-emerald-100 shadow-xs'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {isPast ? <CheckCircle className="w-4 h-4" /> : s.num}
                    </div>
                    <span
                      className={`text-xs whitespace-nowrap ${
                        isActive
                          ? 'font-bold text-stone-900'
                          : isPast
                          ? 'font-medium text-emerald-800'
                          : 'text-stone-600'
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                        currentStep > s.num ? 'bg-[#166534]' : 'bg-stone-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {review?.status === 'completed' && review.riskSheet ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <ProcessRiskSheetView
            riskSheet={review.riskSheet}
            employeeName={review.profileSnapshot?.displayName}
            department={review.profileSnapshot?.department}
            position={review.profileSnapshot?.position}
            roleCategory={review.profileSnapshot?.roleCategory}
          />
        </div>
      ) : (
        /* Chat View fills window height; message list scrolls, input pinned */
        <div className="flex-1 flex flex-col min-h-0 max-w-5xl mx-auto w-full">
          {/* Scrollable Message List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {interactions.map((msg) => {
              const isAssistant = msg.role === 'assistant';

              return (
                <div
                  key={msg.interactionId}
                  className={`w-full rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${
                    isAssistant
                      ? 'bg-emerald-50/90 border border-emerald-100 text-stone-900'
                      : 'bg-white border border-stone-200/90 border-r-4 border-r-[#166534] text-stone-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-stone-100/60">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          isAssistant
                            ? 'bg-[#166534] text-white shadow-xs'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {isAssistant ? <ClipboardList className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-heading font-semibold text-xs text-stone-800">
                        {isAssistant ? 'Audit Assistant' : firstName}
                      </span>
                      {msg.step && (
                        <span className="text-[10px] font-semibold text-stone-700 bg-white/70 px-2 py-0.5 rounded-full border border-stone-200">
                          Step {msg.step}
                        </span>
                      )}
                    </div>

                    {msg.modelUsed && (
                      <span className="text-[10px] font-mono text-stone-600">
                        {msg.modelUsed}
                      </span>
                    )}
                  </div>

                  <div
                    className="prose prose-sm max-w-none text-stone-800 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                  />
                </div>
              );
            })}

            {/* Waiting State Counter (Section 8.5) */}
            {isWaitingReply && (
              <div className="w-full rounded-2xl p-4 bg-emerald-50/70 border border-emerald-200/60 flex items-center gap-3 animate-pulse">
                <Clock className="w-5 h-5 text-[#166534] animate-spin" />
                <div className="text-xs text-emerald-900">
                  <span className="font-semibold">The Audit Assistant is analyzing your response...</span>
                  <span className="ml-2 font-mono text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full text-[#166534]">
                    {secondsElapsed}s elapsed
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Input Form pinned at bottom */}
          <div className="p-4 bg-white border-t border-stone-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2 max-w-4xl mx-auto"
            >
              <div className="flex-1 relative">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your response in English, Filipino, Cebuano or Bisaya... (Press Enter to send)"
                  disabled={isWaitingReply}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 text-sm focus:ring-2 focus:ring-[#166534] focus:border-[#166534] outline-hidden resize-none bg-stone-50/50 focus:bg-white transition-all"
                />
                <span className="absolute right-3 bottom-2 text-[10px] text-stone-600">
                  {inputText.length}/2000
                </span>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isWaitingReply}
                className="h-11 px-5 rounded-2xl bg-[#166534] hover:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Finish & Score Confirmation Modal */}
      <Modal
        isOpen={showFinishModal}
        onClose={() => !isScoring && setShowFinishModal(false)}
        title="Complete Review & Generate Process Risk Sheet"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-700 leading-relaxed">
            Are you ready to conclude this process review? The Quality Audit Assistant will synthesize your interview dialogue into:
          </p>

          <ul className="text-xs text-stone-800 space-y-1.5 list-disc pl-5">
            <li>A 5-column <strong>SIPOC</strong> Workflow Diagram (Suppliers, Inputs, Process Steps, Outputs, Customers)</li>
            <li>An <strong>FMEA</strong> Risk Matrix with Severity (S), Occurrence (O), and Detection (D) ratings</li>
            <li>Server-authoritative <strong>Risk Priority Numbers (RPN)</strong> and priority badges</li>
            <li>Identified employee strengths and baseline requirement code mappings</li>
          </ul>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Once scored, this review will be marked completed and recorded in the college database.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              onClick={() => setShowFinishModal(false)}
              disabled={isScoring}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Continue Interview
            </button>
            <button
              onClick={handleFinishAndScore}
              disabled={isScoring}
              className="px-5 py-2 rounded-xl bg-[#166534] hover:bg-emerald-800 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isScoring ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Generating FMEA Sheet...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Confirm & Score
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
