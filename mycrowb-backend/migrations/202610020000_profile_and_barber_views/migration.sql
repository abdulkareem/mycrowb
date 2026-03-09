ALTER TABLE "BarberShop"
ADD COLUMN "ownerName" TEXT,
ADD COLUMN "wardNumber" TEXT,
ADD COLUMN "localBody" TEXT,
ADD COLUMN "whatsappNumber" TEXT,
ADD COLUMN "employeeCount" INTEGER,
ADD COLUMN "chairCount" INTEGER,
ADD COLUMN "profileLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "editRequestPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "editApproved" BOOLEAN NOT NULL DEFAULT false;
