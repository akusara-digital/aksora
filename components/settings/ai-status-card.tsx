"use client";

import { Robot } from "@phosphor-icons/react";
import {
  CONFIGURABLE_PROVIDERS,
  AI_PROVIDER_LABELS,
  type SupportedProvider,
} from "@/lib/ai-types";
import { CustomSelect } from "@/components/ui/custom-select";
import { AIProviderIcon } from "./ai-provider-icon";
import type { ProviderCardState } from "./ai-provider-card";

interface AIStatusCardProps {
  isConfigured: boolean;
  activeProvider: string;
  activeModel: string;
  providerStates: Record<string, ProviderCardState>;
  onSetActive: (provider: string) => void;
  onModelChange: (provider: string, model: string) => void;
}

export function AIStatusCard({
  isConfigured,
  activeProvider,
  activeModel,
  providerStates,
  onSetActive,
  onModelChange,
}: AIStatusCardProps) {
  const configuredProviders = CONFIGURABLE_PROVIDERS.filter(
    (p) => providerStates[p]?.status === "connected" || providerStates[p]?.status === "saved",
  );

  const activeProviderLabel =
    AI_PROVIDER_LABELS[activeProvider as SupportedProvider]?.label || activeProvider;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Icon & Status text */}
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
              isConfigured
                ? "bg-slate-50 border border-slate-200"
                : "bg-slate-100 text-slate-400 border border-slate-200"
            }`}
          >
            {isConfigured ? (
              <AIProviderIcon provider={activeProvider} size="md" className="border-0 bg-transparent p-0 scale-125" />
            ) : (
              <Robot size={22} weight="bold" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">AI Engine</h2>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Not Configured
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              {isConfigured ? (
                <>
                  Powered by <strong className="font-semibold text-slate-800">{activeProviderLabel}</strong>
                  {activeModel && (
                    <>
                      {" · "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700">
                        {activeModel}
                      </code>
                    </>
                  )}
                </>
              ) : (
                "Select a provider below, enter your API key or endpoint, and click Use as Active."
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Active Switcher (if configured) */}
        {configuredProviders.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <CustomSelect
              value={activeProvider}
              onChange={onSetActive}
              options={configuredProviders.map((p) => ({
                value: p,
                label: AI_PROVIDER_LABELS[p]?.label || p,
              }))}
              aria-label="Active AI Provider"
              className="h-8.5 w-auto min-w-[140px]"
            />

            {providerStates[activeProvider]?.models?.length > 0 && (
              <CustomSelect
                value={activeModel}
                onChange={(val) => onModelChange(activeProvider, val)}
                options={providerStates[activeProvider].models}
                searchable
                searchPlaceholder="Search models..."
                placeholder="Select a model..."
                aria-label="Active AI Model"
                className="h-8.5 w-[180px]"
                menuClassName="min-w-[240px]"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
