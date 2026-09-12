/// <reference types="vite/client" />

/** package.json の version をビルド時に埋め込む（テスト実行時は未定義）。 */
declare const __APP_VERSION__: string | undefined;
