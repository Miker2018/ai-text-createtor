#!/usr/bin/env node
/**
 * 汇总 GitHub Releases 下载量，回写 stats/usage.json。
 *
 * 只覆盖 GitHub 能提供的数据（installBase / byVersion），手写字段
 * （activeInstalls / notes）原样保留——下载量不是活跃设备数，不能互相冒充。
 *
 * 用法：
 *   node scripts/update-stats.mjs
 *   node scripts/update-stats.mjs --repo owner/name
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const USAGE_PATH = join(ROOT, 'stats', 'usage.json');
const API = 'https://api.github.com';

function repoFromArgs(argv) {
  const index = argv.indexOf('--repo');
  if (index !== -1 && argv[index + 1]) return argv[index + 1].trim();
  const explicit = argv.find((arg) => arg.startsWith('--repo='));
  if (explicit) return explicit.slice('--repo='.length).trim();
  return repoFromRemote();
}

function repoFromRemote() {
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/\s]+?)(?:\.git)?$/i);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {
    // 无 remote 时落到下面的明确报错。
  }
  throw new Error('无法推断仓库：当前目录没有 GitHub remote，请用 --repo owner/name 指定');
}

async function api(path) {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'ai-text-createtor-stats',
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`${API}${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${path} 失败：${response.status} ${response.statusText}`);
  return response.json();
}

function versionKey(tag) {
  return String(tag ?? '').trim().replace(/^v/i, '') || 'unknown';
}

/** 只统计 APK 资源，避免把 version.json 等附件的下载量算进安装基数。 */
function apkDownloads(release) {
  return (release.assets ?? [])
    .filter((asset) => /\.apk$/i.test(asset.name ?? ''))
    .reduce((sum, asset) => sum + (Number(asset.download_count) || 0), 0);
}

async function collect(repo) {
  const releases = await api(`/repos/${repo}/releases?per_page=100`);
  const versions = new Map();
  let installBase = 0;

  for (const release of releases) {
    if (release.draft) continue;
    const downloads = apkDownloads(release);
    if (downloads === 0) continue;
    const version = versionKey(release.tag_name);
    const entry = versions.get(version) ?? {
      versionName: version,
      downloads: 0,
      publishedAt: null,
      prerelease: Boolean(release.prerelease),
    };
    entry.downloads += downloads;
    entry.publishedAt ??= release.published_at ?? null;
    versions.set(version, entry);
    installBase += downloads;
  }

  const byVersion = [...versions.values()]
    .sort((a, b) => compareVersion(a.versionName, b.versionName))
    .map((entry) => ({
      ...entry,
      share: installBase === 0 ? 0 : Number((entry.downloads / installBase).toFixed(4)),
    }));

  return { installBase, byVersion };
}

function compareVersion(a, b) {
  const split = (value) => value.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const [x, y] = [split(a), split(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function main() {
  const repo = repoFromArgs(process.argv.slice(2));
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error(`仓库格式非法：${repo}（应为 owner/name）`);

  const previous = JSON.parse(await readFile(USAGE_PATH, 'utf8'));
  const { installBase, byVersion } = await collect(repo);

  const next = {
    ...previous,
    generatedAt: new Date().toISOString(),
    installBase,
    activeInstalls: previous.activeInstalls ?? null,
    byVersion,
  };

  await writeFile(USAGE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`${repo}: installBase=${installBase}，版本数=${byVersion.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
