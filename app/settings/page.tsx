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
import { getSettingsGroups, type SettingsIconKey } from "@/lib/settings-nav";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

const ICONS: Record<
  SettingsIconKey,
  React.ComponentType<{ size?: number; weight?: "bold"; className?: string }>
> = {
  "user-circle": UserCircle,
  moon: Moon,
  bell: Bell,
  key: Key,
  lifebuoy: Lifebuoy,
  "list-checks": ListChecks,
  globe: Globe,
  lightning: Lightning,
  buildings: Buildings,
  "users-three": UsersThree,
  "shield-check": ShieldCheck,
  users: Users,
  robot: Robot,
  "chart-bar": ChartBar,
  "plugs-connected": PlugsConnected,
  webhooks: WebhooksLogo,
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = normalizeRole(user.role);
  const isAdmin = isManagementAdmin(user.role, user.company);
  const canConfigureQa = isAdmin || role === "qa" || role === "fullstack" || role === "ai";
  const settingsGroups = getSettingsGroups({ isAdmin, canConfigureQa });

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
                const Icon = ICONS[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-slate-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                      <Icon size={18} weight="bold" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
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
