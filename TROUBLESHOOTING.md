# 🔧 EMFILE 오류 해결 방법

## 문제 증상
```
Error: EMFILE: too many open files, watch '/workspace/ai-story-game/client'
```

## 원인
- Linux의 **inotify watch limit** 초과 (기본값: 8192)
- Vite가 수백 개의 파일을 동시에 모니터링
- `ulimit -n`과는 다른 문제!

## ✅ 해결 방법 1: server/vite.ts 교체 (필수!)

**Linux 서버**에서 실행하기 전에:

```bash
cp server/vite.fixed.ts server/vite.ts
npm run dev
```

**왜 필요한가?**
- `server/vite.ts`는 `configFile: false`로 Vite를 실행
- 이로 인해 `vite.config.ts`의 watch 설정이 무시됨
- `server/vite.fixed.ts`는 watch 설정을 직접 포함

## ✅ 해결 방법 2: 임시 디렉토리 제거 (효과 제한적)

서버 시작 전에 불필요한 디렉토리 제거:
```bash
rm -rf uploads/ attached_assets/
npm run dev
```

## ✅ 해결 방법 2: Vite 설정 덮어쓰기

`vite.config.ts` 파일을 다음 내용으로 **교체**하세요:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/uploads/**',
        '**/attached_assets/**',
        '**/*.db',
        '**/*.db-shm',
        '**/*.db-wal',
      ],
      usePolling: false,
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      '@tanstack/react-query',
      'react-markdown',
      'lucide-react',
    ],
  },
});
```

## ✅ 해결 방법 3: ulimit 증가 (Linux)

```bash
ulimit -n 65536
npm run dev
```

## ✅ 해결 방법 4: Rollup 다운그레이드

`package.json`에서 Vite 버전 고정:
```bash
npm install vite@6.0.0 --save-dev
npm install
npm run dev
```

## 🎯 권장 해결책

**방법 1**이 가장 빠르고 안전합니다:
```bash
rm -rf uploads/ attached_assets/
npm run dev
```

uploads/와 attached_assets/ 디렉토리는 런타임에 자동으로 생성됩니다.
