import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 環境変数
const isGitHubPages = process.env.VITE_GITHUB_ACTIONS === 'true';
const repositoryName = process.env.VITE_GITHUB_REPOSITORY?.split('/')[1] || '';

export default defineConfig({
    site: isGitHubPages
        ? 'https://slide-tubone24.pages.dev'
        : 'http://localhost:4321',
    base: isGitHubPages ? `/${repositoryName}` : '/',
    output: 'static',
    build: {
        format: 'file',
    },
    vite: {
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src')
            }
        }
    },
    devToolbar: {
        enabled: false
    }
});
