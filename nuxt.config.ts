export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxthub/core', '@nuxt/ui', 'nuxt-auth-utils', '@nuxtjs/i18n'],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'ru', name: 'Русский', file: 'ru.json' },
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'no_prefix',
  },

  css: ['~/assets/css/main.css'],

  experimental: {
    typedPages: false,
  },

  icon: {
    serverBundle: 'local',
  },

  hub: {
    db: 'postgresql',
    blob: true,
  },

  nitro: {
    experimental: {
      websocket: true,
    },
  },

  runtimeConfig: {
    emailSmtp: {
      host: process.env.EMAIL_SMTP_HOST || '',
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
      user: process.env.EMAIL_SMTP_USER || '',
      pass: process.env.EMAIL_SMTP_PASS || '',
      from: process.env.EMAIL_FROM || '',
    },
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    session: {
      maxAge: 60 * 60 * 24 * 7,
      password: process.env.NUXT_SESSION_PASSWORD ?? '',
    },
    oauth: {
      github: {
        clientId: process.env.NUXT_OAUTH_GITHUB_CLIENT_ID || '',
        clientSecret: process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET || '',
      },
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET || '',
      },
    },
    stockfishPath: process.env.STOCKFISH_PATH || './stockfish',
  },
})