-- CreateTable
CREATE TABLE "custom_columns" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_column_entries" (
    "id" TEXT NOT NULL,
    "custom_column_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "custom_column_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_column_entries_custom_column_id_account_code_key" ON "custom_column_entries"("custom_column_id", "account_code");

-- AddForeignKey
ALTER TABLE "custom_columns" ADD CONSTRAINT "custom_columns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_columns" ADD CONSTRAINT "custom_columns_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_column_entries" ADD CONSTRAINT "custom_column_entries_custom_column_id_fkey" FOREIGN KEY ("custom_column_id") REFERENCES "custom_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_column_entries" ADD CONSTRAINT "custom_column_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
