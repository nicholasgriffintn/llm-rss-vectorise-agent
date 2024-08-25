-- Update item with new text and metadata columns
ALTER TABLE "item"
ADD COLUMN "text" varchar(2024) NULL;

ALTER TABLE "item"
ADD COLUMN "metadata" varchar(2024) NULL;