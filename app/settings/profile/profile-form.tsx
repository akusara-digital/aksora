"use client";

import React, { useEffect, useState, useRef } from "react";
import { EnvelopeSimple, Briefcase, User, CheckCircle, Warning, Globe, Camera, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { FormFieldError } from "@/components/shared/form-field-error";
import { getRoleLabel } from "@/lib/roles";
import { useTranslation } from "@/hooks/use-translation";
import { ProfileTwoFactor } from "@/components/settings/profile-two-factor";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  locale?: string;
  avatar?: string;
  mfaEnabled?: boolean;
}

export function ProfileForm({ user }: { user: UserProfile }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { locale: currentLocale, setLocale } = useTranslation();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file (PNG or JPEG)", "error");
      return;
    }

    setAvatarLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const size = 64;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not initialize canvas");

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          const res = await fetch("/api/auth/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatar: dataUrl }),
          });

          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || "Failed to update profile picture");

          setAvatar(dataUrl);
          toast("Profile photo updated successfully", "success");
          window.dispatchEvent(new Event("qa:profile-updated"));
          router.refresh();
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update photo", "error");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarLoading(true);
    try {
      const res = await fetch("/api/auth/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove avatar");
      setAvatar("");
      toast("Profile photo removed", "info");
      window.dispatchEvent(new Event("qa:profile-updated"));
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove photo", "error");
    } finally {
      setAvatarLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    name: user.name || "",
    role: user.role || "",
    locale: (user.locale as "en" | "id") || currentLocale || "en",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setFormData({
      name: user.name || "",
      role: user.role || "",
      locale: (user.locale as "en" | "id") || currentLocale || "en",
      password: "",
      confirmPassword: "",
    });
  }, [user, currentLocale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Full name is required";
    }

    if (formData.password && formData.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors)[0];
      toast(firstError, "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update profile");
      }

      setLocale(formData.locale);
      setFieldErrors({});
      toast("Profile updated successfully!", "success");
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-8">
      {/* Avatar Picture Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl border border-slate-200/80 bg-slate-50/60">
        <div className="relative h-16 w-16 shrink-0 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-200 flex items-center justify-center">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={user.name || "User Avatar"} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-blue-600 text-white font-black text-lg">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-900">Profile Photo</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            PNG, JPEG, or WebP. Auto-compressed and displayed across assignments, comments, and navbar.
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleAvatarUpload}
              disabled={avatarLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              <Camera size={13} weight="bold" />
              <span>{avatarLoading ? "Uploading..." : avatar ? "Change Photo" : "Upload Photo"}</span>
            </button>

            {avatar && (
              <button
                type="button"
                onClick={handleAvatarDelete}
                disabled={avatarLoading}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition disabled:opacity-50"
              >
                <Trash size={13} weight="bold" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Name Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <User size={14} weight="bold" />
            Full Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setFieldErrors((current) => {
                const next = { ...current };
                delete next.name;
                return next;
              });
            }}
            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
            placeholder="Your Name"
          />
          <FormFieldError message={fieldErrors.name} />
        </div>

        {/* Email Field (Disabled) */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <EnvelopeSimple size={14} weight="bold" />
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full h-11 px-4 bg-gray-100 border border-gray-200 text-gray-400 font-bold text-sm cursor-not-allowed select-none"
            />
            <div className="absolute right-3 top-3 text-emerald-500 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 border border-emerald-200">
              <CheckCircle size={12} weight="bold" /> Verified
            </div>
          </div>
          <p className="text-[11px] text-gray-500 font-medium">Email address is managed by your organization</p>
        </div>

        {/* Role Field (Read-only) */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Briefcase size={14} weight="bold" />
            Workspace Role
          </label>
          <div className="relative">
            <input
              type="text"
              disabled
              value={getRoleLabel(user.role)}
              className="w-full h-11 px-4 bg-gray-100 border border-gray-200 text-gray-500 font-bold text-sm cursor-not-allowed select-none"
            />
            <div className="absolute right-3 top-3 text-gray-400 text-[10px] font-bold uppercase tracking-wider bg-gray-200 px-2 py-0.5">
              Fixed
            </div>
          </div>
          <p className="text-[11px] text-gray-500 font-medium">Role assignment can only be changed by an administrator</p>
        </div>
      </div>

      {/* Language / Locale Preference */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Globe size={16} weight="bold" />
          Language & Regional Settings
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Choose your preferred display language for the Aksora workspace interface.
        </p>

        <div className="max-w-xs space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
            Interface Language
          </label>
          <select
            value={formData.locale}
            onChange={(e) => setFormData({ ...formData, locale: e.target.value as "en" | "id" })}
            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
          >
            <option value="en">English (US)</option>
            <option value="id">Bahasa Indonesia</option>
          </select>
          <p className="text-[11px] text-gray-500">Changes apply immediately across navigation, forms, and alerts.</p>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="pt-8 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Security & Password</h3>
        <p className="text-xs text-gray-500 mb-6">Leave blank if you don&apos;t want to change your password</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              New Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.password;
                  return next;
                });
              }}
              className="w-full h-11 px-4 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
              placeholder="••••••••"
            />
            <FormFieldError message={fieldErrors.password} />
            <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-medium pt-1">
              <Warning size={12} weight="bold" />
              Must be at least 8 characters
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Confirm New Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.confirmPassword;
                  return next;
                });
              }}
              className="w-full h-11 px-4 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
              placeholder="••••••••"
            />
            <FormFieldError message={fieldErrors.confirmPassword} />
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between">
        <button
          type="submit"
          disabled={loading}
          className="h-11 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 transition flex items-center gap-2 rounded-lg"
        >
          {loading ? "Updating..." : "Save Changes"}
        </button>
      </div>

      {/* Two-Factor Authentication Section Isolated in ProfileTwoFactor */}
      <ProfileTwoFactor initialMfaEnabled={Boolean(user.mfaEnabled)} />
    </form>
  );
}
