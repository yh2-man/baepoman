import { defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    root: 'src',
    publicDir: '../public',
    plugins: [react()],
    base: './', // Electron 빌드 환경을 위해 상대 경로 설정
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
})