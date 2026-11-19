"use client";

import { useState, useEffect } from "react";
import { Globe, Check, LockKey, X } from "@phosphor-icons/react";
import { InlineAlert } from "@/components/ui/inline-alert";
import {
  CONFIGURABLE_PROVIDERS,
  AI_PROVIDER_LABELS,
  type SupportedProvider,
} from "@/lib/ai-types";
import { cn } from "@/lib/utils";
import { AIProviderCard } from "./ai-provider-card";
import { AIStatusCard } from "./ai-status-card";
import { useAISettings } from "./use-ai-settings";

export function AISettingsClient() {
  const {
    activeProvider,
    activeModel,
    generalError,
    fetchingModels,
    customModelMode,
    providerStates,
    isCurrentActiveConfigured,
    handleKeyChange,
    handleUrlChange,
    handleModelChange,
    handleSaveKey,
    handleRemoveKey,
    handleFetchModels,
    handleTestConnection,
    handleSetActive,
    toggleShowSecret,
    toggleCustomModelMode,
  } = useAISettings();

  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>(() => {
    return (activeProvider as SupportedProvider) || "9router-public";
  });

  const [dismissedError, setDismissedError] = useState(false);

  // Sync selected tab if activeProvider becomes ready on mount
  useEffect(() => {
    if (activeProvider && CONFIGURABLE_PROVIDERS.includes(activeProvider as SupportedProvider)) {
      setSelectedProvider(activeProvider as SupportedProvider);
    }
  }, [activeProvider]);

  // Reset dismissed error state if a new error arrives
  useEffect(() => {
    if (generalError) {
      setDismissedError(false);
    }
  }, [generalError]);

  const activeState = providerStates[selectedProvider] || {
    status: "disconnected",
    keyInput: "",
    validating: false,
    selectedModel: "",
    models: [],
    showSecret: false,
  };

  const isConfigured = activeState.status === "connected" || activeState.status === "saved";
  const isCardActive = activeProvider === selectedProvider && isConfigured;

  return (
    <div className="w-full space-y-5">
      {/* Top AI Engine Status Banner */}
      <AIStatusCard
        isConfigured={isCurrentActiveConfigured}
        activeProvider={activeProvider}
        activeModel={activeModel}
        providerStates={providerStates}
        onSetActive={handleSetActive}
        onModelChange={handleModelChange}
      />

      {generalError && !dismissedError && (
        <div className="relative">
          <InlineAlert variant="error" message={generalError} />
          <button
            type="button"
            onClick={() => setDismissedError(true)}
            className="absolute right-3 top-3 text-rose-500 hover:text-rose-700 cursor-pointer"
            title="Dismiss error"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* Provider Selector Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Configure Provider
          </h3>
          <span className="text-xs text-slate-400">
            Select a provider to connect or customize
          </span>
        </div>

        {/* Responsive Segmented Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {CONFIGURABLE_PROVIDERS.map((p) => {
            const state = providerStates[p];
            const meta = AI_PROVIDER_LABELS[p];
            const pConfigured = state?.status === "connected" || state?.status === "saved";
            const pActive = activeProvider === p && pConfigured;
            const isSelected = selectedProvider === p;
            const isPublicRouter = p === "9router-public";

            return (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedProvider(p)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left transition cursor-pointer select-none",
                  isSelected
                    ? "border-blue-500 bg-white ring-2 ring-blue-500/15 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 text-slate-600",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    meta.color,
                  )}
                >
                  {isPublicRouter ? (
                    <Globe size={14} weight="bold" />
                  ) : (
                    p.slice(0, 2).toUpperCase()
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-xs truncate font-semibold",
                        isSelected ? "text-slate-900 font-bold" : "text-slate-700",
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    {pActive ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600">
                        <Check size={10} weight="bold" />
                        Active
                      </span>
                    ) : pConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Saved
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Offline</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Focused Provider Configuration Card */}
      <div className="w-full">
        <AIProviderCard
          key={selectedProvider}
          provider={selectedProvider}
          state={activeState}
          isActive={isCardActive}
          isCustom={Boolean(customModelMode[selectedProvider])}
          isFetchingModels={Boolean(fetchingModels[selectedProvider])}
          onKeyChange={(val) => handleKeyChange(selectedProvider, val)}
          onUrlChange={selectedProvider === "9router-public" ? handleUrlChange : undefined}
          onModelChange={(model) => handleModelChange(selectedProvider, model)}
          onToggleCustomMode={() => toggleCustomModelMode(selectedProvider)}
          onToggleShowSecret={() => toggleShowSecret(selectedProvider)}
          onFetchModels={() => handleFetchModels(selectedProvider)}
          onSaveKey={() => handleSaveKey(selectedProvider)}
          onRemoveKey={() => handleRemoveKey(selectedProvider)}
          onTestConnection={() => handleTestConnection(selectedProvider)}
          onSetActive={() => handleSetActive(selectedProvider)}
        />
      </div>

      {/* Subtle Privacy & Security Notice */}
      <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
        <LockKey size={14} weight="bold" className="text-slate-400 shrink-0" />
        <span>
          API credentials are stored locally in your browser and transmitted securely directly to the AI provider.
        </span>
      </div>
    </div>
  );
}
