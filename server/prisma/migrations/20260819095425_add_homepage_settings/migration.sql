-- CreateTable
CREATE TABLE "HomepageSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announcementText" TEXT NOT NULL DEFAULT 'Free delivery on orders above PKR 5,000',
    "announcementLinkText" TEXT DEFAULT 'Shop Now',
    "announcementLinkUrl" TEXT DEFAULT '/shop',
    "heroEnabled" BOOLEAN NOT NULL DEFAULT true,
    "heroEyebrow" TEXT NOT NULL DEFAULT 'New Collection 2026',
    "heroHeading" TEXT NOT NULL DEFAULT 'Step into comfort and confidence.',
    "heroDescription" TEXT NOT NULL DEFAULT 'Discover footwear designed for your everyday movement, professional style and active lifestyle.',
    "heroPrimaryLabel" TEXT NOT NULL DEFAULT 'Shop All Shoes',
    "heroPrimaryUrl" TEXT NOT NULL DEFAULT '/shop',
    "heroSecondaryLabel" TEXT DEFAULT 'Explore Sports',
    "heroSecondaryUrl" TEXT DEFAULT '/shop?category=Sports',
    "heroImageUrl" TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=1200&auto=format&fit=crop',
    "categoriesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "categoriesEyebrow" TEXT NOT NULL DEFAULT 'Shop by category',
    "categoriesHeading" TEXT NOT NULL DEFAULT 'Find your perfect pair',
    "categoriesDescription" TEXT DEFAULT 'Browse our footwear categories.',
    "categoriesCtaLabel" TEXT NOT NULL DEFAULT 'View all products',
    "categoriesCtaUrl" TEXT NOT NULL DEFAULT '/shop',
    "arrivalsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "arrivalsEyebrow" TEXT NOT NULL DEFAULT 'Latest footwear',
    "arrivalsHeading" TEXT NOT NULL DEFAULT 'New arrivals',
    "arrivalsDescription" TEXT DEFAULT 'Explore our newest styles and designs.',
    "arrivalsCtaLabel" TEXT NOT NULL DEFAULT 'Shop new arrivals',
    "arrivalsCtaUrl" TEXT NOT NULL DEFAULT '/shop',
    "arrivalsLimit" INTEGER NOT NULL DEFAULT 4,
    "promoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "promoEyebrow" TEXT NOT NULL DEFAULT 'Selected styles',
    "promoHeading" TEXT NOT NULL DEFAULT 'Save on our best sellers',
    "promoDescription" TEXT NOT NULL DEFAULT 'Shop selected everyday, formal and sports footwear at reduced prices while stock lasts.',
    "promoCtaLabel" TEXT NOT NULL DEFAULT 'Shop Sale Collection',
    "promoCtaUrl" TEXT NOT NULL DEFAULT '/shop',
    "promoImageUrl" TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
    "newsletterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newsletterEyebrow" TEXT NOT NULL DEFAULT 'Stay updated',
    "newsletterHeading" TEXT NOT NULL DEFAULT 'Get new arrivals and offers',
    "newsletterDescription" TEXT NOT NULL DEFAULT 'Subscribe to receive information about new products, seasonal collections and store promotions.',
    "newsletterPlaceholder" TEXT NOT NULL DEFAULT 'Enter your email address',
    "newsletterButtonLabel" TEXT NOT NULL DEFAULT 'Subscribe',
    "footerStoreName" TEXT NOT NULL DEFAULT 'Shoe Store',
    "footerDescription" TEXT NOT NULL DEFAULT 'Premium footwear for everyday movement, performance sports and formal elegance.',
    "footerCopyright" TEXT NOT NULL DEFAULT '© 2026 Shoe Store. All rights reserved.',
    "footerSupportEmail" TEXT DEFAULT 'support@shoestore.pk',
    "footerSupportPhone" TEXT DEFAULT '+92 300 1234567',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageStat" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL DEFAULT 'default',
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageBenefit" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL DEFAULT 'default',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL DEFAULT 'truck',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageStat_settingsId_sortOrder_idx" ON "HomepageStat"("settingsId", "sortOrder");

-- CreateIndex
CREATE INDEX "HomepageBenefit_settingsId_sortOrder_idx" ON "HomepageBenefit"("settingsId", "sortOrder");

-- AddForeignKey
ALTER TABLE "HomepageStat" ADD CONSTRAINT "HomepageStat_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "HomepageSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepageBenefit" ADD CONSTRAINT "HomepageBenefit_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "HomepageSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
