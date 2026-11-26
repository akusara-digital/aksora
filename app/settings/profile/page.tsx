import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { User, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { redirect } from"next/navigation";
import { ProfileForm } from"./profile-form";
import { RestartTourButton } from"@/components/layout/restart-tour-button";

export const dynamic ="force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { db } = await import("@/lib/db");
  const dbUser = await db.get<{ mfaEnabled: number; avatar: string | null }>(
    'SELECT "mfaEnabled", "avatar" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
    [user.id]
  );

  const userWithMfa = {
    ...user,
    avatar: dbUser?.avatar || (user as { avatar?: string }).avatar || "",
    mfaEnabled: Boolean(dbUser?.mfaEnabled ?? (user as { mfaEnabled?: boolean }).mfaEnabled),
  };

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "Profile" },
  ];

  return (
    <PageShell 
      icon={<User size={22} weight="bold" />}
      title="My Profile" 
      description="View and update your personal information, avatar, password, and security preferences."
      crumbs={crumbs}
    >
      <div className="w-full">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Account Details</h2>
              <p className="text-xs text-slate-500">Manage your identity, profile picture, and credentials within the Aksora platform.</p>
            </div>

            <ProfileForm user={JSON.parse(JSON.stringify(userWithMfa))} />
            
            <div className="mt-10 pt-6 border-t border-slate-100">
              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <ShieldCheck size={22} className="text-emerald-600 shrink-0 mt-0.5" weight="fill" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Security & Access Policy</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Your account is permanently linked to <strong>{user.email}</strong>. 
                    Email modifications require administrator coordination to preserve engineering audit log integrity.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <RestartTourButton />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}


