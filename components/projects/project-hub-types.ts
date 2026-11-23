export interface ProjectData {
  id: number;
  name: string;
  key: string;
  description: string;
  status: string;
  publicToken: string;
  createdAt: string;
}

export interface TaskItem {
  id: number;
  title: string;
  status: string;
  priority: string;
  category: string;
  assignee: string | null;
  relatedFeature: string | null;
  publicToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface BugItem {
  id: number;
  title: string;
  severity: string;
  status: string;
  priority: string;
  module: string;
  suggestedDev: string | null;
  publicToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestPlanItem {
  id: number;
  title: string;
  sprint: string | null;
  status: string;
  scope: string | null;
  publicToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestSuiteItem {
  id: number;
  title: string;
  status: string;
  assignee: string | null;
  testPlanId: string | null;
  publicToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberItem {
  id: number;
  uuid: string;
  projectId: number;
  userId: number;
  workspaceId: number | null;
  role: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
}

export type ProjectHubTab = "overview" | "tasks" | "bugs" | "tests" | "settings";
