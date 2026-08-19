import { useEffect, useState } from "react";
import { homepageApi, type HomepageSettingsData, type HomepageStatItem, type HomepageBenefitItem } from "../../services/homepage-api";

type TabId = "announcement" | "hero" | "stats" | "categories" | "arrivals" | "promo" | "benefits" | "newsletter" | "footer";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("announcement");
  const [settings, setSettings] = useState<HomepageSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    homepageApi
      .getAdminSettings()
      .then((data) => setSettings(data))
      .catch((err) => {
        setFeedback({ type: "error", message: err?.message || "Failed to load homepage settings." });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setFeedback(null);

    try {
      const { id, createdAt, updatedAt, ...cleanPayload } = settings as any;
      const cleanStats = settings.stats?.map(({ settingsId, createdAt, updatedAt, ...st }: any) => st);
      const cleanBenefits = settings.benefits?.map(({ settingsId, createdAt, updatedAt, ...bn }: any) => bn);

      const payload = {
        ...cleanPayload,
        stats: cleanStats,
        benefits: cleanBenefits,
      };

      const updated = await homepageApi.updateAdminSettings(payload);
      setSettings(updated);
      setFeedback({ type: "success", message: "Homepage settings saved successfully!" });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof HomepageSettingsData>(field: K, value: HomepageSettingsData[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  // Stat item handlers
  const handleAddStat = () => {
    if (!settings) return;
    const newStat: HomepageStatItem = {
      value: "New Stat",
      label: "Stat Description",
      enabled: true,
      sortOrder: settings.stats.length,
    };
    setSettings({ ...settings, stats: [...settings.stats, newStat] });
  };

  const handleUpdateStat = (index: number, updated: Partial<HomepageStatItem>) => {
    if (!settings) return;
    const newStats = [...settings.stats];
    newStats[index] = { ...newStats[index], ...updated };
    setSettings({ ...settings, stats: newStats });
  };

  const handleRemoveStat = (index: number) => {
    if (!settings) return;
    const newStats = settings.stats.filter((_, i) => i !== index);
    setSettings({ ...settings, stats: newStats });
  };

  const handleMoveStat = (index: number, direction: "up" | "down") => {
    if (!settings) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= settings.stats.length) return;

    const newStats = [...settings.stats];
    const temp = newStats[index];
    newStats[index] = newStats[targetIdx];
    newStats[targetIdx] = temp;

    newStats.forEach((st, i) => {
      st.sortOrder = i;
    });

    setSettings({ ...settings, stats: newStats });
  };

  // Benefit item handlers
  const handleAddBenefit = () => {
    if (!settings) return;
    const newBenefit: HomepageBenefitItem = {
      title: "New Benefit",
      description: "Benefit description details here.",
      iconKey: "truck",
      enabled: true,
      sortOrder: settings.benefits.length,
    };
    setSettings({ ...settings, benefits: [...settings.benefits, newBenefit] });
  };

  const handleUpdateBenefit = (index: number, updated: Partial<HomepageBenefitItem>) => {
    if (!settings) return;
    const newBenefits = [...settings.benefits];
    newBenefits[index] = { ...newBenefits[index], ...updated };
    setSettings({ ...settings, benefits: newBenefits });
  };

  const handleRemoveBenefit = (index: number) => {
    if (!settings) return;
    const newBenefits = settings.benefits.filter((_, i) => i !== index);
    setSettings({ ...settings, benefits: newBenefits });
  };

  const handleMoveBenefit = (index: number, direction: "up" | "down") => {
    if (!settings) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= settings.benefits.length) return;

    const newBenefits = [...settings.benefits];
    const temp = newBenefits[index];
    newBenefits[index] = newBenefits[targetIdx];
    newBenefits[targetIdx] = temp;

    newBenefits.forEach((bn, i) => {
      bn.sortOrder = i;
    });

    setSettings({ ...settings, benefits: newBenefits });
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-400">Loading homepage settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm font-medium text-red-700">
        Failed to load homepage settings.
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "announcement", label: "Announcement Bar", icon: "📢" },
    { id: "hero", label: "Hero Section", icon: "🖼️" },
    { id: "stats", label: "Trust Stats", icon: "📊" },
    { id: "categories", label: "Category Section", icon: "📁" },
    { id: "arrivals", label: "New Arrivals", icon: "👟" },
    { id: "promo", label: "Promo Banner", icon: "🏷️" },
    { id: "benefits", label: "Benefits", icon: "🛡️" },
    { id: "newsletter", label: "Newsletter", icon: "✉️" },
    { id: "footer", label: "Footer Content", icon: "🦶" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Save Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Homepage Settings
          </h1>
          <p className="mt-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Manage public storefront content, section visibility, and layouts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-gray-800 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {saving ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-xs font-semibold flex items-center justify-between shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-bold underline text-current ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-1.5 border-b border-gray-200 pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "bg-black text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-black"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 shadow-xs space-y-6">
        {/* 1. Announcement Bar */}
        {activeTab === "announcement" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Announcement Bar</h2>
                <p className="text-xs text-gray-500">Top promotional bar visible across the storefront header.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.announcementEnabled}
                  onChange={(e) => updateField("announcementEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                Enable Section
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Announcement Text
                </label>
                <input
                  type="text"
                  value={settings.announcementText}
                  onChange={(e) => updateField("announcementText", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Link Text (Optional)
                </label>
                <input
                  type="text"
                  value={settings.announcementLinkText || ""}
                  onChange={(e) => updateField("announcementLinkText", e.target.value || null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Link Destination URL (Optional)
                </label>
                <input
                  type="text"
                  value={settings.announcementLinkUrl || ""}
                  onChange={(e) => updateField("announcementLinkUrl", e.target.value || null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Hero Section */}
        {activeTab === "hero" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Hero Banner Section</h2>
                <p className="text-xs text-gray-500">Main hero banner and primary calls-to-action on the homepage.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.heroEnabled}
                  onChange={(e) => updateField("heroEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                Enable Section
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Eyebrow Tagline
                </label>
                <input
                  type="text"
                  value={settings.heroEyebrow}
                  onChange={(e) => updateField("heroEyebrow", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Main Heading
                </label>
                <input
                  type="text"
                  value={settings.heroHeading}
                  onChange={(e) => updateField("heroHeading", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={settings.heroDescription}
                  onChange={(e) => updateField("heroDescription", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Button Label
                </label>
                <input
                  type="text"
                  value={settings.heroPrimaryLabel}
                  onChange={(e) => updateField("heroPrimaryLabel", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Button URL
                </label>
                <input
                  type="text"
                  value={settings.heroPrimaryUrl}
                  onChange={(e) => updateField("heroPrimaryUrl", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Secondary Button Label (Optional)
                </label>
                <input
                  type="text"
                  value={settings.heroSecondaryLabel || ""}
                  onChange={(e) => updateField("heroSecondaryLabel", e.target.value || null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Secondary Button URL (Optional)
                </label>
                <input
                  type="text"
                  value={settings.heroSecondaryUrl || ""}
                  onChange={(e) => updateField("heroSecondaryUrl", e.target.value || null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Hero Image URL
                </label>
                <input
                  type="text"
                  value={settings.heroImageUrl}
                  onChange={(e) => updateField("heroImageUrl", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
                {settings.heroImageUrl && (
                  <img
                    src={settings.heroImageUrl}
                    alt="Hero Preview"
                    className="mt-2 h-32 rounded-xl object-cover border border-gray-200"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Trust Statistics */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Hero Trust Statistics</h2>
                <p className="text-xs text-gray-500">Key proof metrics shown under the hero action buttons.</p>
              </div>
              <button
                type="button"
                onClick={handleAddStat}
                className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:border-black transition cursor-pointer"
              >
                + Add Stat
              </button>
            </div>

            <div className="space-y-4">
              {settings.stats.map((st, idx) => (
                <div key={st.id || idx} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">Item #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveStat(idx, "up")}
                        disabled={idx === 0}
                        className="rounded p-1 text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStat(idx, "down")}
                        disabled={idx === settings.stats.length - 1}
                        className="rounded p-1 text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStat(idx)}
                        className="rounded p-1 text-xs font-bold text-red-600 hover:bg-red-100 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Main Value</label>
                      <input
                        type="text"
                        value={st.value}
                        onChange={(e) => handleUpdateStat(idx, { value: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Label</label>
                      <input
                        type="text"
                        value={st.label}
                        onChange={(e) => handleUpdateStat(idx, { label: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={st.enabled}
                          onChange={(e) => handleUpdateStat(idx, { enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                        />
                        Enabled
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Category Section */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Category Section</h2>
                <p className="text-xs text-gray-500">Controls section headings and presentation for product category cards.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.categoriesEnabled}
                  onChange={(e) => updateField("categoriesEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                Enable Section
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Eyebrow Tagline
                </label>
                <input
                  type="text"
                  value={settings.categoriesEyebrow}
                  onChange={(e) => updateField("categoriesEyebrow", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={settings.categoriesHeading}
                  onChange={(e) => updateField("categoriesHeading", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  value={settings.categoriesCtaLabel}
                  onChange={(e) => updateField("categoriesCtaLabel", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  CTA Destination URL
                </label>
                <input
                  type="text"
                  value={settings.categoriesCtaUrl}
                  onChange={(e) => updateField("categoriesCtaUrl", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. New Arrivals Section */}
        {activeTab === "arrivals" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">New Arrivals / Featured Products</h2>
                <p className="text-xs text-gray-500">Controls section headings and display limit for catalog products.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.arrivalsEnabled}
                  onChange={(e) => updateField("arrivalsEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                Enable Section
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Eyebrow Tagline
                </label>
                <input
                  type="text"
                  value={settings.arrivalsEyebrow}
                  onChange={(e) => updateField("arrivalsEyebrow", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={settings.arrivalsHeading}
                  onChange={(e) => updateField("arrivalsHeading", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={settings.arrivalsDescription || ""}
                  onChange={(e) => updateField("arrivalsDescription", e.target.value || null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  value={settings.arrivalsCtaLabel}
                  onChange={(e) => updateField("arrivalsCtaLabel", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Product Limit Count
                </label>
                <select
                  value={settings.arrivalsLimit}
                  onChange={(e) => updateField("arrivalsLimit", Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black cursor-pointer"
                >
                  {[2, 4, 6, 8, 12, 16].map((num) => (
                    <option key={num} value={num}>{num} Products</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 6. Promotional Banner */}
        {activeTab === "promo" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Promotional / Sale Banner</h2>
                <p className="text-xs text-gray-500">Curated sale banner section on the homepage.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.promoEnabled}
                  onChange={(e) => updateField("promoEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                Enable Section
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Eyebrow Tagline
                </label>
                <input
                  type="text"
                  value={settings.promoEyebrow}
                  onChange={(e) => updateField("promoEyebrow", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={settings.promoHeading}
                  onChange={(e) => updateField("promoHeading", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={settings.promoDescription}
                  onChange={(e) => updateField("promoDescription", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  value={settings.promoCtaLabel}
                  onChange={(e) => updateField("promoCtaLabel", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  CTA Destination URL
                </label>
                <input
                  type="text"
                  value={settings.promoCtaUrl}
                  onChange={(e) => updateField("promoCtaUrl", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Banner Image URL
                </label>
                <input
                  type="text"
                  value={settings.promoImageUrl}
                  onChange={(e) => updateField("promoImageUrl", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* 7. Benefits Section */}
        {activeTab === "benefits" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Benefits & Trust Features</h2>
                <p className="text-xs text-gray-500">Highlights customer guarantees such as shipping, returns, and support.</p>
              </div>
              <button
                type="button"
                onClick={handleAddBenefit}
                className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:border-black transition cursor-pointer"
              >
                + Add Benefit
              </button>
            </div>

            <div className="space-y-4">
              {settings.benefits.map((bn, idx) => (
                <div key={bn.id || idx} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">Benefit #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveBenefit(idx, "up")}
                        disabled={idx === 0}
                        className="rounded p-1 text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBenefit(idx, "down")}
                        disabled={idx === settings.benefits.length - 1}
                        className="rounded p-1 text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(idx)}
                        className="rounded p-1 text-xs font-bold text-red-600 hover:bg-red-100 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        value={bn.title}
                        onChange={(e) => handleUpdateBenefit(idx, { title: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Icon Type</label>
                      <select
                        value={bn.iconKey}
                        onChange={(e) => handleUpdateBenefit(idx, { iconKey: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-black cursor-pointer"
                      >
                        <option value="truck">🚚 Truck / Delivery</option>
                        <option value="exchange">🔄 Exchange / Returns</option>
                        <option value="shield">🛡️ Shield / Quality</option>
                        <option value="support">🎧 Support / Help</option>
                        <option value="star">⭐ Star / Rating</option>
                        <option value="heart">❤️ Heart / Loyalty</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bn.enabled}
                          onChange={(e) => handleUpdateBenefit(idx, { enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={bn.description}
                        onChange={(e) => handleUpdateBenefit(idx, { description: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Newsletter Section */}
        {activeTab === "newsletter" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Newsletter Subscription Section</h2>
                <p className="text-xs text-gray-500">Controls section headings and input placeholder text.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.newsletterEnabled}
                  onChange={(e) => updateField("newsletterEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                Enable Section
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Eyebrow Tagline
                </label>
                <input
                  type="text"
                  value={settings.newsletterEyebrow}
                  onChange={(e) => updateField("newsletterEyebrow", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={settings.newsletterHeading}
                  onChange={(e) => updateField("newsletterHeading", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={settings.newsletterDescription}
                  onChange={(e) => updateField("newsletterDescription", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Input Placeholder
                </label>
                <input
                  type="text"
                  value={settings.newsletterPlaceholder}
                  onChange={(e) => updateField("newsletterPlaceholder", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={settings.newsletterButtonLabel}
                  onChange={(e) => updateField("newsletterButtonLabel", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* 9. Footer Content */}
        {activeTab === "footer" && (
          <div className="space-y-6">
            <div className="border-b border-gray-150 pb-4">
              <h2 className="text-base font-bold text-gray-900">Footer Store Content</h2>
              <p className="text-xs text-gray-500">Branding, copyright, and contact info displayed in the footer.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  value={settings.footerStoreName}
                  onChange={(e) => updateField("footerStoreName", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Copyright Notice
                </label>
                <input
                  type="text"
                  value={settings.footerCopyright}
                  onChange={(e) => updateField("footerCopyright", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Store Description
                </label>
                <textarea
                  rows={2}
                  value={settings.footerDescription}
                  onChange={(e) => updateField("footerDescription", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Support Email (Optional)
                </label>
                <input
                  type="text"
                  value={settings.footerSupportEmail || ""}
                  onChange={(e) => updateField("footerSupportEmail", e.target.value || null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Support Phone (Optional)
                </label>
                <input
                  type="text"
                  value={settings.footerSupportPhone || ""}
                  onChange={(e) => updateField("footerSupportPhone", e.target.value || null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
