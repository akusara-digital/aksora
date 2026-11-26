export type SettingsIconKey =
  | "user-circle"
  | "moon"
  | "bell"
  | "key"
  | "lifebuoy"
  | "list-checks"
  | "globe"
  | "lightning"
  | "buildings"
  | "users-three"
  | "shield-check"
  | "users"
  | "robot"
  | "chart-bar"
  | "plugs-connected"
  | "webhooks";

export type SettingsNavItem = {
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  icon: SettingsIconKey;
};

export type SettingsNavGroup = {
  id: string;
  title: string;
  description: string;
  items: SettingsNavItem[];
};

export function getSettingsGroups({
  isAdmin,
  canConfigureQa,
  canAccessAi = false,
}: {
  isAdmin: boolean;
  canConfigureQa: boolean;
  canAccessAi?: boolean;
}): SettingsNavGroup[] {
  const groups: SettingsNavGroup[] = [
    {
      id: "personal",
      title: "Personal",
      description: "Your account profile, theme preferences, alerts, and personal tokens.",
      items: [
        {
          title: "Profile & Security",
          shortTitle: "Profile",
          description: "Update your name, avatar, password, and multi-factor authentication.",
          href: "/settings/profile",
          icon: "user-circle",
        },
        {
          title: "Appearance",
          shortTitle: "Appearance",
          description: "Choose light, dark, or system theme preferences.",
          href: "/settings/appearance",
          icon: "moon",
        },
        {
          title: "Notifications",
          shortTitle: "Notifications",
          description: "Control which workspace alerts you receive and how often.",
          href: "/settings/notifications",
          icon: "bell",
        },
        {
          title: "API Keys",
          shortTitle: "API Keys",
          description: "Create and revoke personal API keys for CLI scripts and REST endpoints.",
          href: "/settings/api-keys",
          icon: "key",
        },
        {
          title: "Support & Feedback",
          shortTitle: "Support",
          description: "Submit support tickets or report platform issues to the team.",
          href: "/settings/support",
          icon: "lifebuoy",
        },
      ],
    },
  ];

  if (canConfigureQa) {
    groups.push({
      id: "test-management",
      title: "Test Management",
      description: "Reusable templates, execution environments, and workflow automation for QA.",
      items: [
        {
          title: "Test Case Setup",
          shortTitle: "Case Setup",
          description: "Configure templates and custom fields carried by test cases.",
          href: "/settings/test-case-setup",
          icon: "list-checks",
        },
        {
          title: "Test Environments",
          shortTitle: "Environments",
          description: "Manage base URLs and {{variables}} injected into test runs.",
          href: "/settings/environments",
          icon: "globe",
        },
        {
          title: "Automation Rules",
          shortTitle: "Automation",
          description: "Auto-assign teammates or trigger webhooks when item statuses change.",
          href: "/settings/automation",
          icon: "lightning",
        },
      ],
    });
  }

  if (isAdmin) {
    groups.push({
      id: "workspace-team",
      title: "Workspace & Team",
      description: "Manage subscription limits, workspace memberships, and access roles.",
      items: [
        {
          title: "Workspace & Plan",
          shortTitle: "Workspace",
          description: "Review workspace details, plan subscription, and seat usage.",
          href: "/settings/workspace",
          icon: "buildings",
        },
        {
          title: "Members & Workspaces",
          shortTitle: "Members",
          description: "Manage team members, pending invitations, and workspace access.",
          href: "/settings/workspaces",
          icon: "users-three",
        },
        {
          title: "Custom Roles",
          shortTitle: "Roles",
          description: "Create custom roles and choose granular permissions per role.",
          href: "/settings/roles",
          icon: "shield-check",
        },
        {
          title: "Assignees Directory",
          shortTitle: "Assignees",
          description: "Maintain the directory of people available for task and run assignments.",
          href: "/assignees",
          icon: "users",
        },
      ],
    });
  }

  if (isAdmin || canAccessAi) {
    groups.push({
      id: "ai-integrations",
      title: "AI & Integrations",
      description: "Connect AI providers, external issue trackers, and outgoing webhooks.",
      items: [
        {
          title: "AI & Models",
          shortTitle: "AI & Models",
          description: "Configure AI provider keys (Gemini, Claude, OpenAI, Groq, DeepSeek).",
          href: "/settings/ai",
          icon: "robot",
        },
        {
          title: "AI Usage & Tokens",
          shortTitle: "AI Usage",
          description: "Track AI calls and token consumption across features and models.",
          href: "/settings/ai-usage",
          icon: "chart-bar",
        },
        {
          title: "Integrations",
          shortTitle: "Integrations",
          description: "Connect Jira, Trello, or Lark Base to sync defects and tasks.",
          href: "/settings/integrations",
          icon: "plugs-connected",
        },
        {
          title: "Webhooks",
          shortTitle: "Webhooks",
          description: "Push real-time HTTP payloads to your endpoints when data changes.",
          href: "/settings/webhooks",
          icon: "webhooks",
        },
      ],
    });
  }

  return groups;
}
