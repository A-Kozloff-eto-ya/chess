ALTER TABLE "users" ADD COLUMN "pendingEmail" text,
                    ADD COLUMN "emailChangeToken" text,
                    ADD COLUMN "emailChangeExpires" timestamp;
