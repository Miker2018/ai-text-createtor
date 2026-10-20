# 日志目录

存放客户端上传/人工归档的诊断日志，**不是**运行日志的实时写入点（App 本地缓冲在
`uni.setStorageSync`，默认最多 30 条，只有用户显式点「上报」才会外发）。

## 目录结构

```text
logs/
└── <versionName>/
    └── <YYYY-MM>.jsonl      # 每行一条记录，UTF-8，无 BOM
```

示例：`logs/0.1.1/2026-10.jsonl`

## 单条记录字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 客户端生成的唯一 ID，用于去重 |
| `at` | number | 客户端时间戳（ms） |
| `versionName` / `versionCode` | string / number | 发生时的版本 |
| `platform` | string | `android` / `ios` / `h5` |
| `kind` | string | `error` / `unhandledrejection` / `vue` / `diagnostic` |
| `message` | string | 已截断的错误消息（≤ 2000 字符） |
| `stack` | string | 已截断的调用栈（≤ 8000 字符） |
| `bodyHash` | string | 正文域短 SHA-256，**不存原文** |

## 脱敏红线

沿用主仓 `src/features/reporting` 的规则，以下内容**绝不入库**：

- PAT / `apiKey` / `token` / `authorization` / `api_key_cipher` 等凭据；
- 小说正文、章节内容、提示词原文（只留长度 + 短哈希）；
- 用户设备唯一标识、账号、邮箱、IP。

## 保留策略

- `logs/` 仅保留**最近 6 个月**，超期记录在归档后删除；
- 单个文件超过 20 MB 时按月内分片，命名追加 `.part2`、`.part3`；
- 已修复问题对应的日志在下一个版本发布后清理。
