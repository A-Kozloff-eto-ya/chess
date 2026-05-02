import { pgTable, text, serial, timestamp, integer, pgEnum, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const gameStatusEnum = pgEnum('game_status', ['waiting', 'active', 'completed', 'abandoned'])
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'declined'])

export const users = pgTable('users', {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  email: text().notNull().unique(),
  passwordHash: text(),
  avatar: text().default('/default-avatar.png'),
  bio: text().default(''),
  rating: integer().default(1200),
  provider: text().default('email'),
  providerId: text(),
  emailVerified: text('emailVerified').default('false'),
  lastSeenAt: timestamp('lastSeenAt'),
  settings: jsonb().default({}),
  createdAt: timestamp().notNull().defaultNow(),
})

export const games = pgTable('games', {
  id: serial().primaryKey(),
  whitePlayerId: integer().references(() => users.id),
  blackPlayerId: integer().references(() => users.id),
  status: gameStatusEnum().notNull().default('waiting'),
  fen: text().notNull(),
  pgn: text(),
  moves: text().notNull().default('[]'),
  result: text(),
  timeControl: text().default('10+0'),
  inviteCode: text().notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
  endedAt: timestamp(),
  whiteTimeMs: integer('whiteTimeMs'),
  blackTimeMs: integer('blackTimeMs'),
  lastMoveAt: timestamp('lastMoveAt', { withTimezone: true }),
})

export const friendships = pgTable('friendships', {
  id: serial().primaryKey(),
  requesterId: integer().notNull().references(() => users.id),
  addresseeId: integer().notNull().references(() => users.id),
  status: friendshipStatusEnum().notNull().default('pending'),
  createdAt: timestamp().notNull().defaultNow(),
  respondedAt: timestamp(),
}, (table) => [
  uniqueIndex('friendships_pair_unique').on(table.requesterId, table.addresseeId),
])

export const chatMessages = pgTable('chat_messages', {
  id: serial().primaryKey(),
  gameId: integer('gameId').notNull().references(() => games.id),
  userId: integer('userId').notNull().references(() => users.id),
  username: text().notNull(),
  message: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
})

export const passwordResets = pgTable('password_resets', {
  id: serial().primaryKey(),
  userId: integer().notNull().references(() => users.id),
  token: text().notNull().unique(),
  expiresAt: timestamp().notNull(),
  usedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
})

export const gameAnalyses = pgTable('game_analyses', {
  id: serial().primaryKey(),
  gameId: integer('gameId').notNull().references(() => games.id),
  status: text().notNull().default('pending'),
  analysis: text().notNull().default('{}'),
  createdAt: timestamp().notNull().defaultNow(),
})

export const emailVerifications = pgTable('email_verifications', {
  id: serial().primaryKey(),
  userId: integer('userId').notNull().references(() => users.id),
  token: text().notNull().unique(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  gamesAsWhite: many(games, { relationName: 'whitePlayer' }),
  gamesAsBlack: many(games, { relationName: 'blackPlayer' }),
  friendshipsRequested: many(friendships, { relationName: 'requester' }),
  friendshipsReceived: many(friendships, { relationName: 'addressee' }),
  passwordResets: many(passwordResets),
  chatMessages: many(chatMessages),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  game: one(games, { fields: [chatMessages.gameId], references: [games.id] }),
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
}))

export const gamesRelations = relations(games, ({ one, many }) => ({
  chatMessages: many(chatMessages),
  whitePlayer: one(users, { relationName: 'whitePlayer', fields: [games.whitePlayerId], references: [users.id] }),
  blackPlayer: one(users, { relationName: 'blackPlayer', fields: [games.blackPlayerId], references: [users.id] }),
}))

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, { relationName: 'requester', fields: [friendships.requesterId], references: [users.id] }),
  addressee: one(users, { relationName: 'addressee', fields: [friendships.addresseeId], references: [users.id] }),
}))

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, { fields: [passwordResets.userId], references: [users.id] }),
}))
