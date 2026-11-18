import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Buildings,
  CaretRight,
  ChartBar,
  Gear,
  Globe,
  Key,
  Lifebuoy,
  Lightning,
  ListChecks,
  Moon,
  PlugsConnected,
  Robot,
  ShieldCheck,
  UserCircle,
  Users,
  UsersThree,
  WebhooksLogo,
} from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin, normalizeRole } from "@/lib/roles";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

type SettingsItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold"; className?: string }>;
};

type SettingsGroup = {
  id: string;
  title: string;
  description: string;
  items: SettingsItem[];
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = normalizeRole(user.role);
  const isAdmin = isManagementAdmin(user.role, user.company);
  const canConfigureQa = isAdmin || role === "qa" || role === "fullstack" || role === "ai";

  const settingsGroups: SettingsGroup[] = [
    {
      id: "personal",
      title: "Personal",
      description: "Your account profile, theme preferences, alerts, and personal tokens.",
      items: [
        {
          title: "Profile & Security",
          description: "Update your name, avatar, password, and multi-factor authentication.",
          href: "/settings/profile",
          icon: UserCircle,
        },
        {
          title: "Appearance",
          description: "Choose light, dark, or system theme preferences.",
          href: "/settings/appearance",
          icon: Moon,
        },
        {
          title: "Notifications",
          description: "Control which workspace alerts you receive and how often.",
          href: "/settings/notifications",
          icon: Bell,
        },
        {
          title: "API Keys",
          description: "Create and revoke personal API keys for CLI scripts and REST endpoints.",
          href: "/settings/api-keys",
          icon: Key,
        },
        {
          title: "Support & Feedback",
          description: "Submit support tickets or report platform issues to the team.",
          href: "/settings/support",
          icon: Lifebuoy,
        },
      ],
    },
  ];

  if (canConfigureQa) {
    settingsGroups.push({
      id: "test-management",
      title: "Test Management",
      description: "Reusable templates, execution environments, and workflow automation for QA.",
      items: [
        {
          title: "Test Case Setup",
          description: "Configure templates and custom fields carried by test cases.",
          href: "/settings/test-case-setup",
          icon: ListChecks,
        },
        {
          title: "Test Environments",
          description: "Manage base URLs and {{variables}} injected into test runs.",
          href: "/settings/environments",
          icon: Globe,
        },
        {
          title: "Automation Rules",
          description: "Auto-assign teammates or trigger webhooks when item statuses change.",
          href: "/settings/automation",
          icon: Lightning,
        },
      ],
    });
  }

  if (isAdmin) {
    settingsGroups.push(
      {
        id: "workspace-team",
        title: "Workspace & Team",
        description: "Manage subscription limits, workspace memberships, and access roles.",
        items: [
          {
            title: "Workspace & Plan",
            description: "Review workspace details, plan subscription, and seat usage.",
            href: "/settings/workspace",
            icon: Buildings,
          },
          {
            title: "Members & Workspaces",
            description: "Manage team members, pending invitations, and workspace access.",
            href: "/settings/workspaces",
            icon: UsersThree,
          },
          {
            title: "Custom Roles",
            description: "Create custom roles and choose granular permissions per role.",
            href: "/settings/roles",
            icon: ShieldCheck,
          },
          {
            title: "Assignees Directory",
            description: "Maintain the directory of people available for task and run assignments.",
            href: "/assignees",
            icon: Users,
          },
        ],
      },
      {
        id: "ai-integrations",
        title: "AI & Integrations",
        description: "Connect AI providers, external issue trackers, and outgoing webhooks.",
        items: [
          {
            title: "AI & Models",
            description: "Configure AI provider keys (Gemini, Claude, OpenAI, Groq, DeepSeek).",
            href: "/settings/ai",
            icon: Robot,
          },
          {
            title: "AI Usage & Tokens",
            description: "Track AI calls and token consumption across features and models.",
            href: "/settings/ai-usage",
            icon: ChartBar,
          },
          {
            title: "Integrations",
            description: "Connect Jira, Trello, or Lark Base to sync defects and tasks.",
            href: "/settings/integrations",
            icon: PlugsConnected,
          },
          {
            title: "Webhooks",
            description: "Push real-time HTTP payloads to your endpoints when data changes.",
            href: "/settings/webhooks",
            icon: WebhooksLogo,
          },
        ],
      },
    );
  }

  return (
    <PageShell
      icon={<Gear size={22} weight="bold" />}
      title="Settings"
      description={
        isAdmin
          ? "Configure your personal account, test management defaults, team access, and integrations."
          : "Manage your personal profile, appearance, alerts, and workspace tools."
      }
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings" },
      ]}
    >
      <div className="max-w-5xl divide-y divide-slate-200/80">
        {settingsGroups.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`settings-group-${group.id}`}
            className="flex flex-col gap-5 py-8 first:pt-2 lg:flex-row lg:gap-10"
          >
            <div className="lg:w-64 lg:shrink-0">
              <h2
                id={`settings-group-${group.id}`}
                className="text-sm font-bold tracking-tight text-slate-900"
              >
                {group.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {group.description}
              </p>
            </div>

            <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-slate-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                      <Icon size={18} weight="bold" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                        {item.description}
                      </span>
                    </span>
                    <CaretRight
                      size={16}
                      weight="bold"
                      className="shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-blue-600"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-6 text-xs text-slate-400">
          <span>Aksora v{packageJson.version}</span>
          <span>Signed in as {user.email}</span>
        </div>
      </div>
    </PageShell>
  );
}
