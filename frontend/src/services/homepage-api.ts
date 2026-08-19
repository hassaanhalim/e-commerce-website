import { apiRequest } from "./api";

export interface HomepageStatItem {
  id?: string;
  value: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
}

export interface HomepageBenefitItem {
  id?: string;
  title: string;
  description: string;
  iconKey: string;
  enabled: boolean;
  sortOrder: number;
}

export interface HomepageSettingsData {
  id?: string;

  // Announcement Bar
  announcementEnabled: boolean;
  announcementText: string;
  announcementLinkText?: string | null;
  announcementLinkUrl?: string | null;

  // Hero Section
  heroEnabled: boolean;
  heroEyebrow: string;
  heroHeading: string;
  heroDescription: string;
  heroPrimaryLabel: string;
  heroPrimaryUrl: string;
  heroSecondaryLabel?: string | null;
  heroSecondaryUrl?: string | null;
  heroImageUrl: string;

  // Categories Section
  categoriesEnabled: boolean;
  categoriesEyebrow: string;
  categoriesHeading: string;
  categoriesDescription?: string | null;
  categoriesCtaLabel: string;
  categoriesCtaUrl: string;

  // New Arrivals Section
  arrivalsEnabled: boolean;
  arrivalsEyebrow: string;
  arrivalsHeading: string;
  arrivalsDescription?: string | null;
  arrivalsCtaLabel: string;
  arrivalsCtaUrl: string;
  arrivalsLimit: number;

  // Promotional Banner
  promoEnabled: boolean;
  promoEyebrow: string;
  promoHeading: string;
  promoDescription: string;
  promoCtaLabel: string;
  promoCtaUrl: string;
  promoImageUrl: string;

  // Newsletter Section
  newsletterEnabled: boolean;
  newsletterEyebrow: string;
  newsletterHeading: string;
  newsletterDescription: string;
  newsletterPlaceholder: string;
  newsletterButtonLabel: string;

  // Footer Content
  footerStoreName: string;
  footerDescription: string;
  footerCopyright: string;
  footerSupportEmail?: string | null;
  footerSupportPhone?: string | null;

  stats: HomepageStatItem[];
  benefits: HomepageBenefitItem[];
}

const CACHE_KEY = "shoe_store_homepage_settings_cache";

export const homepageApi = {
  getCachedSettings(): HomepageSettingsData | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  },

  async getPublicSettings(): Promise<HomepageSettingsData> {
    const data = await apiRequest<HomepageSettingsData>("/homepage");
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {}
    return data;
  },

  getAdminSettings(): Promise<HomepageSettingsData> {
    return apiRequest<HomepageSettingsData>("/admin/settings/homepage");
  },

  async updateAdminSettings(dto: Partial<HomepageSettingsData>): Promise<HomepageSettingsData> {
    const updated = await apiRequest<HomepageSettingsData>("/admin/settings/homepage", {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  },
};
