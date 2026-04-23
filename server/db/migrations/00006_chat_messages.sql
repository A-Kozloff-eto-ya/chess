CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  "gameId" INTEGER NOT NULL REFERENCES games(id),
  "userId" INTEGER NOT NULL REFERENCES users(id),
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_game ON chat_messages ("gameId");
