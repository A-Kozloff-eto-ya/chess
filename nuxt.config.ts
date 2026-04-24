export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', 'nuxt-auth-utils'],

  imports: {
    presets: [{ from: 'vue-i18n', imports: ['useI18n'] }],
  },

  css: ['~/assets/css/main.css'],

  experimental: {
    typedPages: false,
  },

  icon: {
    serverBundle: 'local',
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
    shm: {
      serverUrl: process.env.SHM_SERVER_URL || '',
      appName: process.env.SHM_APP_NAME || 'Chess',
      enabled: process.env.SHM_ENABLED !== 'false',
    },
  },
})