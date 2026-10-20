# 使用量统计

`usage.json` 回答一个问题：**现在有多少台设备在用这个 App，分别是什么版本。**

## 指标口径（必须如实区分）

| 字段 | 含义 | 数据来源 | 可信度 |
|---|---|---|---|
| `installBase` | 安装基数：各 Release 资源 `download_count` 之和 | GitHub Releases API | 高（含重复下载、镜像下载不计） |
| `byVersion[].downloads` | 按版本标签聚合的下载量 | 同上 | 高 |
| `byVersion[].share` | 该版本下载量占 `installBase` 的比例 | 计算 | 派生 |
| `activeInstalls` | 活跃设备数（真·"在用"） | **本仓库不采集心跳**，手动维护 | 低，填 `null` 表示未统计 |

`installBase` 是累计下载，不等于活跃设备：卸载、换机、重复下载都会虚高。
在接入客户端心跳（需自建上报端，不能把 PAT 放进 App）之前，`activeInstalls` 保持 `null`，
**不得用 `installBase` 冒充活跃数**。

## 更新方式

```bash
node scripts/update-stats.mjs                     # 从 git remote 推断 owner/repo
node scripts/update-stats.mjs --repo owner/name   # 显式指定
```

- 无 `GITHUB_TOKEN` 时走匿名 API（60 次/小时，足够）；
- 有 `GITHUB_TOKEN` 时自动携带，避免限流；
- 只重算 GitHub 能提供的数据，手写字段（`activeInstalls`、`notes`）原样保留。

## 输出示例

```json
{
  "generatedAt": "2026-10-20T01:00:00.000Z",
  "installBase": 0,
  "activeInstalls": null,
  "byVersion": [],
  "notes": "activeInstalls 需人工维护，本仓库不采集客户端心跳"
}
```
