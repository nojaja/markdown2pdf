# 品質ベースライン初回監査（v1.00）

## 1. 監査対象
- 対象プロジェクト: markdown2pdf（CLIアプリ）
- 監査日: 2026-06-03
- 監査観点:
  - テスト・Lint・depcruise・typedoc・build の遵守状況
  - `docs/spec/vx.y.z/` の有無と内容（受け入れ条件・設計判断）
  - Jest 設定分割
  - CI の `test:ci` 利用
  - `depcruise` の失敗回避有無

## 2. Skill展開状況
- 生成済み:
  - `.github/skills/nodejs-project-quality-guardrails/SKILL.md`
  - `.github/skills/completion-mandatory-quality-gates/SKILL.md`

## 3. 監査結果サマリ

| 項目 | 状態 | 判定理由 |
|---|---|---|
| package.json 存在 | NG | プロジェクト直下に未作成 |
| test 実行基盤 | NG | スクリプト定義なし（`npm run test` / `test:ci` 不可） |
| lint 実行基盤 | NG | `eslint.config.js` とスクリプト未定義 |
| depcruise 実行基盤 | NG | `.dependency-cruiser.js` とスクリプト未定義 |
| typedoc 実行基盤 | NG | `typedoc.js` とスクリプト未定義 |
| build 実行基盤 | NG | build スクリプト未定義 |
| docs/spec/vx.y.z の存在 | OK | `docs/spec/v1.00/` が存在 |
| 受け入れ条件の記載 | OK | `docs/spec/v1.00/design.md` に明記あり |
| 設計判断の記載 | OK | `docs/spec/v1.00/design.md` に採用提案と判断あり |
| Jest 設定分割 | NG | `jest.*.config.js` 未整備 |
| CI で test:ci 利用 | NG | ワークフロー未作成 |
| depcruise 失敗回避有無 | 要確認 | スクリプト未定義のため判定対象が未整備 |

## 4. CLIアプリ向け適用メモ
本プロジェクトはCLIアプリであり、Skill原文内の UI 例示（画面編集や同時編集など）はそのまま適用しない。

CLI向けの受け入れ条件は `docs/spec/v1.00/design.md` を正とし、品質ゲート（test/lint/build/docs/depcruise/cpd）は共通で適用する。

## 5. 是正アクション（優先順）
1. 最小の Node.js/TypeScript 土台を作成し、`package.json` に以下を定義する。
   - scripts: `build`, `type-check`, `test`, `test:ci`, `lint`, `depcruise`, `cpd`, `docs`
2. Jest 設定を分割作成する。
   - `jest.unit.config.js`（必須）
   - `jest.e2e.config.js`（必要に応じて）
   - `jest.coverage.config.js`（coverage閾値管理）
3. 静的解析設定を追加する。
   - `eslint.config.js`
   - `.dependency-cruiser.js`
4. ドキュメント生成設定を追加する。
   - `typedoc.js`
   - 出力先 `docs/typedoc-md/`
5. CI ワークフローを追加し、テストは `npm run test:ci` を使用する。
6. `npm run depcruise` と `npm run cpd` に失敗回避（`|| exit 0` 等）がないことを固定化する。

## 6. 判定
- 初回監査は「未準拠（基盤未整備）」。
- ただし、仕様書ディレクトリと設計記載（受け入れ条件・設計判断）は確認済み。

## 7. 次工程
- ユーザー指示に従い、現時点では製造は実施しない。
- 追加要件受領後、設計更新または品質基盤整備計画に進む。