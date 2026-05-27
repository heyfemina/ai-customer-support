ALTER TABLE "AIConfig"
ADD COLUMN "autoTranslate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "handoffAfterFailedReplies" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "supportedLanguages" TEXT[] NOT NULL DEFAULT ARRAY['en', 'it', 'es', 'fr']::TEXT[],
ADD COLUMN "regionalNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN "regionalProfiles" JSONB NOT NULL DEFAULT '{}';
