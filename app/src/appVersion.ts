/**
 * アプリのバージョン。package.json の version をビルド時に埋め込む（vite.config.ts の define）。
 * define が効かないテスト実行時は "dev" を使う。
 */
export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
