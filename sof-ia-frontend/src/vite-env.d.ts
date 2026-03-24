/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_CHATBOT_WEB_API_URL?: string
  readonly VITE_CHATBOT_BACKEND_MODE?: 'sicop_proxy' | 'legacy'
  readonly VITE_WEBCHAT_TENANT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
