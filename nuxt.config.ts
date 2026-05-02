export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  devServer: { host: '0.0.0.0' },

  modules: ['@nuxt/ui', 'nuxt-auth-utils'],

  ui: {
    fonts: false,
  },

  imports: {
    presets: [{ from: 'vue-i18n', imports: ['useI18n'] }],
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover' }],
    },
  },

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
      cookie: {
        secure: false,
      },
    },
    oauth: {
      github: {
        clientId: process.env.NUXT_OAUTH_GITHUB_CLIENT_ID || '',
        clientSecret: process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET || '',
        redirectURL: process.env.NUXT_OAUTH_GITHUB_REDIRECT_URL || '',
      },
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET || '',
      },
      yandex: {
        clientId: process.env.NUXT_OAUTH_YANDEX_CLIENT_ID || '',
        clientSecret: process.env.NUXT_OAUTH_YANDEX_CLIENT_SECRET || '',
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