UPDATE "user_oauth_accounts"
SET "profileUrl" = 'https://discord.com/users/' || "providerId"
WHERE provider = 'discord' AND "profileUrl" IS NULL;
