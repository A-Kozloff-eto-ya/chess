CREATE TYPE game_status AS ENUM ('waiting', 'active', 'completed', 'abandoned');
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  avatar TEXT DEFAULT '/default-avatar.png',
  rating INTEGER DEFAULT 1200,
  provider TEXT DEFAULT 'email',
  "providerId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  "whitePlayerId" INTEGER REFERENCES users(id),
  "blackPlayerId" INTEGER REFERENCES users(id),
  status game_status NOT NULL DEFAULT 'waiting',
  fen TEXT NOT NULL,
  pgn TEXT,
  moves TEXT NOT NULL DEFAULT '[]',
  result TEXT,
  "timeControl" TEXT DEFAULT '10+0',
  "inviteCode" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  "requesterId" INTEGER NOT NULL REFERENCES users(id),
  "addresseeId" INTEGER NOT NULL REFERENCES users(id),
  status friendship_status NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP
);
