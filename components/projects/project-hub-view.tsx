"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FolderSimple,
  Plus,
  Bug,
  Kanban,
  ClipboardText,
  Users,
  Gear,
  SquaresFour,
  PencilSimple,
} from "@phosphor-icons/react";
import { ProjectMembersModal } from "@/components/projects/project-members-modal";
import { QuickEditProjectModal } from "@/components/projects/quick-edit-project-modal";
import { QuickBugModal } from "@/components/bugs/quick-bug-modal";
import { QuickTaskModal } from "@/components/projects/quick-task-modal";
import {
  ProjectData,
  TaskItem,
  BugItem,
  TestPlanItem,
  TestSuiteItem,
  ProjectMemberItem,
  ProjectHubTab,
} from "./project-hub-types";
import { ProjectHubOverviewTab } from "./project-hub-overview-tab";
import { ProjectHubTasksTab } from "./project-hub-tasks-tab";
import { ProjectHubBugsTab } from "./project-hub-bugs-tab";
import { ProjectHubTestsTab } from "./project-hub-tests-tab";
import { ProjectHubSettingsTab } from "./project-hub-settings-tab";

interface ProjectHubViewProps {
  project: ProjectData;
  tasks: TaskItem[];
  bugs: BugItem[];
  testPlans: TestPlanItem[];
  testSuites: TestSuiteItem[];
  members: ProjectMemberItem[];
  initialTab?: string;
}

const VALID_TABS: ProjectHubTab[] = ["overview", "tasks", "bugs", "tests", "settings"];

export function ProjectHubView({
  project: initialProject,
  tasks: initialTasks,
  bugs: initialBugs,
  testPlans: initialTestPlans,
  testSuites: initialTestSuites,
  members: initialMembers,
  initialTab,
}: ProjectHubViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [project, setProject] = useState<ProjectData>(initialProject);
  const [tasks] = useState<TaskItem[]>(initialTasks);
  const [bugs] = useState<BugItem[]>(initialBugs);
  const [testPlans] = useState<TestPlanItem[]>(initialTestPlans);
  const [testSuites] = useState<TestSuiteItem[]>(initialTestSuites);
  const [members] = useState<ProjectMemberItem[]>(initialMembers);

  // Tab state
  const queryTab = searchParams?.get("tab") as ProjectHubTab | null;
  const resolvedTab = (queryTab && VALID_TABS.includes(queryTab) ? queryTab : null) ||
    (initialTab && VALID_TABS.includes(initialTab as ProjectHubTab) ? (initialTab as ProjectHubTab) : "overview");

  const [activeTab, setActiveTab] = useState<ProjectHubTab>(resolvedTab);

  // Sync state if query changes externally
  useEffect(() => {
    if (queryTab && VALID_TABS.includes(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab, activeTab]);

  const handleTabChange = (tab: ProjectHubTab) => {
    setActiveTab(tab);
    const url = `/projects/${project.id}?tab=${tab}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);

  const isArchived = project.status === "archived";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {project.key && (
                <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                  {project.key}
                </span>
              )}
              <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
                {project.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  isArchived
                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {project.status || "active"}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm max-w-3xl">
              {project.description || "No description provided for this project."}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <button
              type="button"
              onClick={() => setTaskModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
            >
              <Plus size={14} weight="bold" />
              Create Task
            </button>
            <button
              type="button"
              onClick={() => setBugModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 shadow-xs transition hover:bg-rose-100"
            >
              <Bug size={14} weight="bold" />
              Log Bug
            </button>
            <button
              type="button"
              onClick={() => setMembersModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <Users size={14} weight="bold" />
              Members ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setEditProjectModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-blue-600"
            >
              <PencilSimple size={14} weight="bold" />
              Edit Project
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleTabChange("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <SquaresFour size={16} weight="bold" />
          Overview
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("tasks")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "tasks"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <Kanban size={16} weight="bold" />
          Tasks
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {tasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("bugs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "bugs"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <Bug size={16} weight="bold" />
          Bugs
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {bugs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("tests")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "tests"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <ClipboardText size={16} weight="bold" />
          Test Management
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {testPlans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("settings")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <Gear size={16} weight="bold" />
          Settings
        </button>
      </div>

      {/* Tab Content Views */}
      <div>
        {activeTab === "overview" && (
          <ProjectHubOverviewTab
            project={project}
            tasks={tasks}
            bugs={bugs}
            testPlans={testPlans}
            testSuites={testSuites}
            members={members}
            onSelectTab={handleTabChange}
            onOpenTaskModal={() => setTaskModalOpen(true)}
            onOpenBugModal={() => setBugModalOpen(true)}
            onOpenMembersModal={() => setMembersModalOpen(true)}
          />
        )}

        {activeTab === "tasks" && (
          <ProjectHubTasksTab
            tasks={tasks}
            projectName={project.name}
            onOpenTaskModal={() => setTaskModalOpen(true)}
          />
        )}

        {activeTab === "bugs" && (
          <ProjectHubBugsTab
            bugs={bugs}
            projectName={project.name}
            onOpenBugModal={() => setBugModalOpen(true)}
          />
        )}

        {activeTab === "tests" && (
          <ProjectHubTestsTab
            project={project}
            testPlans={testPlans}
            testSuites={testSuites}
          />
        )}

        {activeTab === "settings" && (
          <ProjectHubSettingsTab
            project={project}
            onProjectUpdated={(updated) => setProject(updated)}
          />
        )}
      </div>

      {/* Quick Task Modal */}
      <QuickTaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        project={project}
        members={members}
      />

      {/* Quick Bug Modal */}
      <QuickBugModal
        isOpen={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
        defaultProject={project.name}
      />

      {/* Project Members Modal */}
      <ProjectMembersModal
        project={project}
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
      />

      {/* Quick Edit Project Modal */}
      <QuickEditProjectModal
        project={project}
        isOpen={editProjectModalOpen}
        onClose={() => setEditProjectModalOpen(false)}
        onSuccess={(updated) => {
          setProject((prev) => ({ ...prev, ...updated }));
          router.refresh();
        }}
      />
    </div>
  );
}
