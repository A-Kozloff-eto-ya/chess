import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/en.json'
import ru from '../../i18n/locales/ru.json'

export default defineNuxtPlugin((nuxt) => {
  const settingsCookie = useCookie<Record<string, any>>('chess-settings')
  const savedLocale = (settingsCookie.value?.language as string) || 'en'

  const i18n = createI18n({
    legacy: false,
    locale: savedLocale,
    fallbackLocale: 'en',
    globalInjection: true,
    messages: { en, ru },
  })

  nuxt.vueApp.use(i18n)
})
