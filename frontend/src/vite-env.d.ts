/// <reference types="vite/client" />

// Augment ImportMeta so TypeScript knows about Vite's env vars
interface ImportMetaEnv {
    readonly VITE_SUPABASE_PROJECT_REF: string;
    readonly VITE_SUPABASE_PROJECT: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_DEV_API_PROXY_TARGET: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
