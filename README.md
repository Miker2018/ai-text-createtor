# ai-text-createtor

「AI 小说创作工作坊」（`xiaoshuo`）的**发布与运维仓库**。App 通过 jsDelivr / raw.githubusercontent
读取本仓库根目录的 `version.json` 完成自更新，并在本仓库归档日志与使用量统计。

| 目录 / 文件 | 作用 | 消费方 |
|---|---|---|
| `version.json` | App 自更新清单（**必须在仓库根**） | `UpdateService`，`src/features/update` |
| `CHANGELOG.md` | 人读的版本更新记录 | 发布同学 |
| `logs/` | 日志归档目录（崩溃 / 诊断） | 诊断与排障 |
| `stats/usage.json` | 使用中 APP 数量与版本分布 | 运维看板、发版决策 |
| `scripts/update-stats.mjs` | 汇总 Release 下载量 → 回写 `stats/usage.json` | GitHub Actions |

## 1. 版本更新

`version.json` 的字段与 `src/features/update/types.ts` 的 `VersionManifest` **严格一致**：

```json
{
  "versionCode": 100,
  "versionName": "0.1.0",
  "downloadUrl": "https://github.com/Miker2018/ai-text-createtor/releases/download/v0.1.0/xiaoshuo-0.1.0.apk",
  "sha256": "<64 位小写十六进制>",
  "size": 12345678,
  "minSupportedVersionCode": null,
  "changelog": "- 首个版本",
  "publishedAt": 1700000000000
}
```

- 升级判断**只比 `versionCode`**，`versionName` 仅用于展示；
- `size` 必须 > 0；`sha256` 必须是 64 位十六进制，客户端下载后逐字节校验，不匹配即删除；
- `minSupportedVersionCode`：低于它的客户端**不可跳过**更新；`null` 表示不强制；
- 访问地址（App 端已实现双通道，jsDelivr 有约 12h 缓存）：
  - `https://cdn.jsdelivr.net/gh/Miker2018/ai-text-createtor@main/version.json`
  - `https://raw.githubusercontent.com/Miker2018/ai-text-createtor/main/version.json`

> 当前 `version.json` 是 **0.1.0 占位**（`sha256` 全 0、`size` 为占位值），发首个正式包时
> 必须用主仓 `scripts/release/release.mjs` 重新生成，不要手改。

## 2. 日志目录

`logs/` 按版本与月份分层归档诊断日志，规则见 [`logs/README.md`](logs/README.md)。
**禁止提交** PAT、API Key、小说正文原文——主仓 `src/features/reporting` 的脱敏规则在这里同样生效。

## 3. 使用中 APP 数量

口径见 [`stats/README.md`](stats/README.md)。当前实现：

- `installBase`：各 Release 资源 `download_count` 之和（安装基数，含重复下载）；
- `byVersion`：按版本标签聚合的下载量分布；
- `activeInstalls`：本仓库**不采集**客户端心跳，保持手动维护；填 `null` 表示未统计，绝不猜数。

更新命令：

```bash
node scripts/update-stats.mjs                       # 自动探测 git remote
node scripts/update-stats.mjs --repo owner/name     # 显式指定仓库
```

`.github/workflows/stats.yml` 每天 01:00 UTC 自动执行并提交 `stats/usage.json`。

## 4. 可见性要求

`version.json` 要被客户端匿名读取，**本仓库必须保持 public**。若改为 private，
App 端自更新将全部失效（jsDelivr 与 raw 均无法匿名访问）。
