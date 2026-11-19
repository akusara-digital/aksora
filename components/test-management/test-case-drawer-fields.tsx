"use client";

import type { TestCase } from "@/components/test-management/test-case-table";

interface MetadataBarProps {
  testCase: TestCase;
  editing: boolean;
  status: string;
  priority: string;
  typeCase: string;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onTypeCaseChange: (typeCase: string) => void;
}

export function TestCaseMetadataBar({
  testCase,
  editing,
  status,
  priority,
  typeCase,
  onStatusChange,
  onPriorityChange,
  onTypeCaseChange,
}: MetadataBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Status
        </span>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none focus:border-blue-500"
        >
          <option value="Pending">Pending</option>
          <option value="Passed">Passed</option>
          <option value="Failed">Failed</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>

      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Priority
        </span>
        {editing ? (
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none"
          >
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        ) : (
          <span className="inline-flex items-center h-8 text-xs font-semibold text-slate-700">
            {testCase.priority || "Medium"}
          </span>
        )}
      </div>

      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Type
        </span>
        {editing ? (
          <select
            value={typeCase}
            onChange={(e) => onTypeCaseChange(e.target.value)}
            className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none"
          >
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
          </select>
        ) : (
          <span className="inline-flex items-center h-8 text-xs font-semibold text-teal-700">
            {testCase.typeCase || "Positive"}
          </span>
        )}
      </div>

      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Assignee
        </span>
        <span className="inline-flex items-center h-8 text-xs font-medium text-slate-600 truncate">
          {testCase.assignee || "Unassigned"}
        </span>
      </div>
    </div>
  );
}

interface DetailFieldsProps {
  testCase: TestCase;
  editing: boolean;
  preCondition: string;
  testStep: string;
  expectedResult: string;
  actualResult: string;
  onPreConditionChange: (val: string) => void;
  onTestStepChange: (val: string) => void;
  onExpectedResultChange: (val: string) => void;
  onActualResultChange: (val: string) => void;
}

export function TestCaseDetailFields({
  testCase,
  editing,
  preCondition,
  testStep,
  expectedResult,
  actualResult,
  onPreConditionChange,
  onTestStepChange,
  onExpectedResultChange,
  onActualResultChange,
}: DetailFieldsProps) {
  return (
    <>
      {/* Pre-conditions */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Pre-Condition
        </h3>
        {editing ? (
          <textarea
            rows={2}
            value={preCondition}
            onChange={(e) => onPreConditionChange(e.target.value)}
            className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500 bg-white"
            placeholder="Prerequisites needed before executing..."
          />
        ) : (
          <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3 text-xs text-amber-900 leading-relaxed">
            {testCase.preCondition || "None specified."}
          </div>
        )}
      </div>

      {/* Test Steps */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Test Steps
        </h3>
        {editing ? (
          <textarea
            rows={4}
            value={testStep}
            onChange={(e) => onTestStepChange(e.target.value)}
            className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500 font-mono bg-white"
            placeholder="1. Step one&#10;2. Step two..."
          />
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans">
            {testCase.testStep || "No steps provided."}
          </div>
        )}
      </div>

      {/* Expected Result */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Expected Result
        </h3>
        {editing ? (
          <textarea
            rows={3}
            value={expectedResult}
            onChange={(e) => onExpectedResultChange(e.target.value)}
            className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500 bg-white"
            placeholder="Expected outcome..."
          />
        ) : (
          <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3 text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
            {testCase.expectedResult || "Expected outcome not documented."}
          </div>
        )}
      </div>

      {/* Actual Result (if any) */}
      {(testCase.actualResult || editing) && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Actual Result
          </h3>
          {editing ? (
            <textarea
              rows={2}
              value={actualResult}
              onChange={(e) => onActualResultChange(e.target.value)}
              className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500 bg-white"
              placeholder="Actual outcome observed during execution..."
            />
          ) : (
            <div className="rounded-lg bg-rose-50/60 border border-rose-100 p-3 text-xs text-rose-900 leading-relaxed whitespace-pre-line">
              {testCase.actualResult}
            </div>
          )}
        </div>
      )}
    </>
  );
}
