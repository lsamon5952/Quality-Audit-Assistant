import React from 'react';
import { ProcessRiskSheet, RiskPriority } from '../types';
import { ShieldAlert, Award, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProcessRiskSheetViewProps {
  riskSheet: ProcessRiskSheet;
  employeeName?: string;
  department?: string;
  position?: string;
  roleCategory?: string;
}

export const ProcessRiskSheetView: React.FC<ProcessRiskSheetViewProps> = ({
  riskSheet,
  employeeName,
  department,
  position,
  roleCategory,
}) => {
  const getPriorityBadge = (priority: RiskPriority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" /> High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Low
          </span>
        );
    }
  };

  const maxSipocRows = Math.max(
    riskSheet.sipoc?.suppliers?.length || 0,
    riskSheet.sipoc?.inputs?.length || 0,
    riskSheet.sipoc?.processSteps?.length || 0,
    riskSheet.sipoc?.outputs?.length || 0,
    riskSheet.sipoc?.customers?.length || 0,
    1
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#166534] text-xs font-bold uppercase tracking-wide mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Process Risk Sheet
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
            {employeeName ? `${employeeName}'s Workflow Assessment` : 'Process Audit Risk Sheet'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-700 mt-1">
            {department} • {position} • <span className="font-semibold text-[#166534]">{roleCategory}</span>
          </p>
        </div>

        {riskSheet.completedAt && (
          <div className="text-left md:text-right">
            <span className="text-xs text-stone-700 block">Assessment Completed</span>
            <span className="text-xs font-semibold text-stone-700">
              {new Date(riskSheet.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {riskSheet.modelUsed && (
              <span className="text-[11px] font-mono text-stone-600 block mt-0.5">
                Model: {riskSheet.modelUsed}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Summary Card */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base">
          <FileText className="w-5 h-5 text-[#166534]" />
          Executive Workflow Summary
        </div>
        <p className="text-sm text-stone-700 leading-relaxed">
          {riskSheet.summary || 'Process audit recorded successfully.'}
        </p>

        {riskSheet.overallObservation && (
          <div className="mt-3 p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl text-xs text-emerald-900 leading-relaxed">
            <strong className="font-semibold">Baseline Observation:</strong> {riskSheet.overallObservation}
          </div>
        )}
      </div>

      {/* (a) SIPOC Table (5 Columns) */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-stone-900">
            SIPOC Workflow Diagram
          </h3>
          <p className="text-xs text-stone-700">
            Suppliers, Inputs, Process Steps, Outputs, and Customers identified during the interview.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#166534] text-white">
                <th className="py-3 px-4 font-heading font-semibold border-r border-emerald-800 w-1/5">
                  1. Suppliers
                </th>
                <th className="py-3 px-4 font-heading font-semibold border-r border-emerald-800 w-1/5">
                  2. Inputs
                </th>
                <th className="py-3 px-4 font-heading font-semibold border-r border-emerald-800 w-1/5">
                  3. Process Steps
                </th>
                <th className="py-3 px-4 font-heading font-semibold border-r border-emerald-800 w-1/5">
                  4. Outputs
                </th>
                <th className="py-3 px-4 font-heading font-semibold w-1/5">
                  5. Customers
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {Array.from({ length: maxSipocRows }).map((_, index) => (
                <tr key={index} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3 px-4 border-r border-stone-100 text-stone-700 align-top">
                    {riskSheet.sipoc?.suppliers?.[index] ? (
                      <span className="inline-block bg-stone-100 px-2 py-1 rounded-lg">
                        {riskSheet.sipoc.suppliers[index]}
                      </span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-r border-stone-100 text-stone-700 align-top">
                    {riskSheet.sipoc?.inputs?.[index] ? (
                      <span className="inline-block bg-stone-100 px-2 py-1 rounded-lg">
                        {riskSheet.sipoc.inputs[index]}
                      </span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-r border-stone-100 font-medium text-stone-900 align-top">
                    {riskSheet.sipoc?.processSteps?.[index] ? (
                      <div className="flex items-start gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-[#166534] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span>{riskSheet.sipoc.processSteps[index]}</span>
                      </div>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-r border-stone-100 text-stone-700 align-top">
                    {riskSheet.sipoc?.outputs?.[index] ? (
                      <span className="inline-block bg-stone-100 px-2 py-1 rounded-lg">
                        {riskSheet.sipoc.outputs[index]}
                      </span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-700 align-top">
                    {riskSheet.sipoc?.customers?.[index] ? (
                      <span className="inline-block bg-emerald-50 text-[#166534] font-medium px-2 py-1 rounded-lg">
                        {riskSheet.sipoc.customers[index]}
                      </span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* (b) FMEA Risk Register Table */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#EA580C]" />
              FMEA Failure Modes & Effects Analysis
            </h3>
            <p className="text-xs text-stone-700">
              Ranked by Risk Priority Number (RPN = Severity × Occurrence × Detection).
            </p>
          </div>
          <div className="text-xs text-stone-700 font-mono bg-stone-100 px-3 py-1.5 rounded-xl">
            Formula: RPN = S (1-10) × O (1-10) × D (1-10)
          </div>
        </div>

        {riskSheet.failureModes && riskSheet.failureModes.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-heading">
                  <th className="py-3 px-3 font-semibold">Step</th>
                  <th className="py-3 px-4 font-semibold">Failure Mode & Effect</th>
                  <th className="py-3 px-3 font-semibold">Root Cause</th>
                  <th className="py-3 px-2 font-semibold text-center" title="Severity (1-10)">S</th>
                  <th className="py-3 px-2 font-semibold text-center" title="Occurrence (1-10)">O</th>
                  <th className="py-3 px-2 font-semibold text-center" title="Detection (1-10)">D</th>
                  <th className="py-3 px-3 font-semibold text-center">RPN</th>
                  <th className="py-3 px-3 font-semibold">Priority</th>
                  <th className="py-3 px-3 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {riskSheet.failureModes.map((fm, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-3 align-top font-medium text-stone-800">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 block text-center truncate max-w-[100px]">
                        {fm.processStep}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top space-y-1">
                      <strong className="text-stone-900 block font-semibold">{fm.failureMode}</strong>
                      <p className="text-stone-700 text-[11px] leading-tight">
                        <span className="text-stone-600">Effect:</span> {fm.effect}
                      </p>
                      {fm.employeeQuote && (
                        <p className="text-[11px] italic text-stone-600 bg-stone-50 p-1.5 rounded-lg border-l-2 border-[#166534]">
                          "{fm.employeeQuote}"
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top text-stone-700 text-[11px]">
                      {fm.cause}
                    </td>
                    <td className="py-3 px-2 align-top text-center" title={fm.severityReason}>
                      <span className="font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">
                        {fm.severity}
                      </span>
                      <span className="block text-[9px] text-stone-600 mt-0.5 max-w-[50px] truncate mx-auto">
                        {fm.severityReason}
                      </span>
                    </td>
                    <td className="py-3 px-2 align-top text-center" title={fm.occurrenceReason}>
                      <span className="font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">
                        {fm.occurrence}
                      </span>
                      <span className="block text-[9px] text-stone-600 mt-0.5 max-w-[50px] truncate mx-auto">
                        {fm.occurrenceReason}
                      </span>
                    </td>
                    <td className="py-3 px-2 align-top text-center" title={fm.detectionReason}>
                      <span className="font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">
                        {fm.detection}
                      </span>
                      <span className="block text-[9px] text-stone-600 mt-0.5 max-w-[50px] truncate mx-auto">
                        {fm.detectionReason}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top text-center">
                      <span className="font-extrabold text-sm text-[#166534]">
                        {fm.rpn}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      {getPriorityBadge(fm.priority)}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <span className={`inline-block font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                        fm.relatedCode !== 'None' ? 'bg-emerald-100 text-[#166534]' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {fm.relatedCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top text-[11px] text-stone-700 leading-snug">
                      {fm.recommendedAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-700 text-xs">
            No distinct failure modes identified in this review.
          </div>
        )}
      </div>

      {/* (c) Named Strengths */}
      {riskSheet.strengths && riskSheet.strengths.length > 0 && (
        <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base">
            <Award className="w-5 h-5 text-amber-500" />
            What Works Well (Employee Strengths)
          </div>
          <p className="text-xs text-stone-700">
            Positive aspects identified directly from employee testimony:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {riskSheet.strengths.map((str, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{str}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
