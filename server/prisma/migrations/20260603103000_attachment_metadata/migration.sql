ALTER TABLE "Attachment" ADD COLUMN "messageId" TEXT;
ALTER TABLE "Attachment" ADD COLUMN "uploadedById" TEXT;
ALTER TABLE "Attachment" ADD COLUMN "originalName" TEXT;
ALTER TABLE "Attachment" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Attachment" ADD COLUMN "fileSize" INTEGER;

UPDATE "Attachment"
SET "originalName" = "fileName",
    "mimeType" = "fileType"
WHERE "originalName" IS NULL;

ALTER TABLE "Attachment" ALTER COLUMN "fileType" DROP NOT NULL;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
