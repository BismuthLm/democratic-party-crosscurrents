import type { ReleaseManifest, ReleasePointer } from "../types";

const cache = new Map<string, Promise<unknown>>();
const base = import.meta.env.BASE_URL;

const normalizePath = (path: string) => `${base}${path.replace(/^\/+/, "")}`;

export async function fetchPublicJson<T>(path: string): Promise<T> {
  const url = normalizePath(path);
  if (!cache.has(url)) cache.set(url, fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
    return response.json();
  }));
  return cache.get(url) as Promise<T>;
}

export async function loadRelease() {
  const pointer = await fetchPublicJson<ReleasePointer>("data/v3/latest.json");
  const manifest = await fetchPublicJson<ReleaseManifest>(pointer.manifest);
  return { pointer, manifest };
}

export function findPartition(manifest: ReleaseManifest, suffix: string) {
  const partition = manifest.partitions.find((item) => item.path.endsWith(suffix));
  if (!partition) throw new Error(`Release ${manifest.releaseId} has no ${suffix} partition`);
  return partition;
}

export function loadPartition<T>(manifest: ReleaseManifest, suffix: string) {
  return fetchPublicJson<T>(findPartition(manifest, suffix).path);
}

export function publicDownloadUrl(path: string) {
  return normalizePath(path);
}
