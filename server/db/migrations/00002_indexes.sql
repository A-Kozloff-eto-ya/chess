CREATE INDEX IF NOT EXISTS idx_games_white ON games ("whitePlayerId");
CREATE INDEX IF NOT EXISTS idx_games_black ON games ("blackPlayerId");
CREATE INDEX IF NOT EXISTS idx_games_invite ON games ("inviteCode");
CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);
CREATE INDEX IF NOT EXISTS idx_games_created ON games ("createdAt");
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships ("requesterId");
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships ("addresseeId");
