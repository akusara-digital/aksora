"use client";

import React from "react";
import { ListNumbers } from "@phosphor-icons/react";
import { formatStepScenario, handleStepKeyDown } from "@/lib/test-step-utils";
import type { TestCase } from "@/components/test-management/test-case-table";

interface MetadataBarProps {
  testCase: TestCase;
  editing: boolean;
  status: string;
  priority: string;
  typeCase: string;
  deviceType: string;
  subModule: string;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onTypeCaseChange: (typeCase: string) => void;
  onDeviceTypeChange: (deviceType: string) => void;
  onSubModuleChange: (subModule: string) => void;
}

export function TestCaseMetadataBar({
  testCase,
  editing,
  status,
  priority,
  typeCase,
  deviceType,
  subModule,
  onStatusChange,
  onPriorityChange,
  onTypeCaseChange,
  onDeviceTypeChange,
  onSubModuleChange,
}: MetadataBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          STATUS
        </span>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="Pending">NOT YET STARTED</option>
          <option value="Passed">PASSED</option>
          <option value="Failed">FAILED</option>
          <option value="Blocked">BLOCKED</option>
        </select>
      </div>

      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          DEVICE TYPE
        </span>
        {editing ? (
          <select
            value={deviceType}
            onChange={(e) => onDeviceTypeChange(e.target.value)}
            className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none cursor-pointer"
          >
            <option value="Desktop Web">Desktop Web</option>
            <option value="Mobile Web">Mobile Web</option>
            <option value="Android">Android</option>
            <option value="iOS">iOS</option>
          </select>
        ) : (
          <span className="inline-flex items-center h-8 text-xs font-semibold text-rose-800">
            {testCase.deviceType || "Desktop Web"}
          </span>
        )}
      </div>

      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          CASE TYPE
        </span>
        {editing ? (
          <select
            value={typeCase}
            onChange={(e) => onTypeCaseChange(e.target.value)}
            className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none cursor-pointer"
          >
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
          </select>
        ) : (
          <span className="inline-flex items-center h-8 text-xs font-semibold text-emerald-700">
            {testCase.typeCase || "Positive"}
          </span>
        )}
      </div>

      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          SUB MODULE
        </span>
        {editing ? (
          <input
            type="text"
            value={subModule}
            onChange={(e) => onSubModuleChange(e.target.value)}
            placeholder="e.g. Access Control"
            className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none"
          />
        ) : (
          <span className="inline-flex items-center h-8 text-xs font-semibold text-amber-800 truncate">
            {testCase.subModule || testCase.category || "-"}
          </span>
        )}
      </div>

      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          PRIORITY
        </span>
        {editing ? (
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none cursor-pointer"
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
          PIC TESTER
        </span>
        <span className="inline-flex items-center h-8 text-xs font-medium text-slate-700 truncate">
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
  const handleFormat = () => {
    if (!testStep.trim()) return;
    onTestStepChange(formatStepScenario(testStep));
  };

  return (
    <>
      {/* Pre-conditions */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          PRE-CONDITION
        </h3>
        {editing ? (
          <textarea
            rows={2}
            value={preCondition}
            onChange={(e) => onPreConditionChange(e.target.value)}
            className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500 bg-white leading-relaxed"
            placeholder="e.g. Browser in unauthenticated (guest) incognito session on Landing page"
          />
        ) : (
          <div className="rounded-lg bg-amber-50/60 border border-amber-200/80 p-3 text-xs text-amber-950 leading-relaxed">
            {testCase.preCondition || "None specified."}
          </div>
        )}
      </div>

      {/* Step Scenario */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            STEP SCENARIO
          </h3>
          {editing && (
            <button
              type="button"
              onClick={handleFormat}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              title="Auto-format each line into numbered steps: 1. 2. 3."
            >
              <ListNumbers size={13} weight="bold" />
              Format 1. 2. 3.
            </button>
          )}
        </div>
        {editing ? (
          <textarea
            rows={6}
            value={testStep}
            onChange={(e) => onTestStepChange(e.target.value)}
            onKeyDown={(e) => handleStepKeyDown(e, testStep, onTestStepChange)}
            className="w-full text-xs rounded border border-slate-200 p-3 outline-none focus:border-blue-500 font-sans bg-white leading-relaxed"
            placeholder={"1. Open browser in incognito mode (unauthenticated).\n2. Navigate to Landing page.\n3. Locate promotional Hero Banner..."}
          />
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-800 leading-relaxed font-sans space-y-1">
            {testCase.testStep ? (
              testCase.testStep.split(/\r?\n/).map((line, idx) => (
                <p key={idx} className="leading-relaxed">
                  {line}
                </p>
              ))
            ) : (
              <span className="text-slate-400 italic">No steps provided.</span>
            )}
          </div>
        )}
      </div>

      {/* Expected Result */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          EXPECTED RESULT
        </h3>
        {editing ? (
          <textarea
            rows={3}
            value={expectedResult}
            onChange={(e) => onExpectedResultChange(e.target.value)}
            className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500 bg-white leading-relaxed"
            placeholder="Expected outcome..."
          />
        ) : (
          <div className="rounded-lg bg-emerald-50/60 border border-emerald-200/80 p-3 text-xs text-emerald-950 leading-relaxed whitespace-pre-line">
            {testCase.expectedResult || "Expected outcome not documented."}
          </div>
        )}
      </div>

      {/* Actual Result */}
      {(testCase.actualResult || editing) && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            ACTUAL RESULT
          </h3>
          {editing ? (
            <textarea
              rows={2}
              value={actualResult}
              onChange={(e) => onActualResultChange(e.target.value)}
              className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500 bg-white leading-relaxed"
              placeholder="Actual outcome observed during execution..."
            />
          ) : (
            <div className="rounded-lg bg-rose-50/60 border border-rose-200/80 p-3 text-xs text-rose-950 leading-relaxed whitespace-pre-line">
              {testCase.actualResult}
            </div>
          )}
        </div>
      )}
    </>
  );
}
