import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 環境変数
const isGitHubPages = process.env.VITE_GITHUB_ACTIONS === 'true';
const repositoryName = process.env.VITE_GITHUB_REPOSITORY?.split('/')[1] || '';
console.log(isGitHubPages)

export default defineConfig({
    site: isGitHubPages
        ? `https://${process.env.VITE_GITHUB_REPOSITORY_OWNER}.github.io/${repositoryName}/`
        : 'http://localhost:3000',
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
