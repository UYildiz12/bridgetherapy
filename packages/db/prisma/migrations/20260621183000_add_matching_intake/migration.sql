-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'ENDED');

-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "availability" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "concerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "goals" TEXT,
ADD COLUMN     "intakeCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PatientTherapist" ADD COLUMN     "requestNote" TEXT,
ADD COLUMN     "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "TherapistProfile" ADD COLUMN     "acceptingPatients" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availability" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];
