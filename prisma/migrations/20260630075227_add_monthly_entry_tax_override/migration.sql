-- AlterTable
ALTER TABLE "monthly_entries" ADD COLUMN     "tax_code_id" TEXT;

-- AddForeignKey
ALTER TABLE "monthly_entries" ADD CONSTRAINT "monthly_entries_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
