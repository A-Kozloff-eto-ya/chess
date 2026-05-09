CREATE TABLE IF NOT EXISTS "user_oauth_accounts" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "providerId" text NOT NULL,
  "username" text,
  "profileUrl" text,
  "visible" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_provider_unique" ON "user_oauth_accounts"("provider", "providerId");

INSERT INTO "user_oauth_accounts" ("userId", "provider", "providerId", "username", "profileUrl")
SELECT id, provider, "providerId",
  CASE WHEN provider = 'github' THEN username
       WHEN provider = 'discord' THEN username
       ELSE NULL END,
  CASE WHEN provider = 'github' THEN 'https://github.com/' || username
       ELSE NULL END
FROM users
WHERE provider IS NOT NULL AND provider != 'email' AND "providerId" IS NOT NULL;
