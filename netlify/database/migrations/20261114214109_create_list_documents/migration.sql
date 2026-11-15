CREATE TABLE "list_documents" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
