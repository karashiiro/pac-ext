export async function getPAT(): Promise<string | undefined> {
  const pat = await chrome.storage.sync.get('github_pat');
  return pat['github_pat'];
}

export function setPAT(pat: string): Promise<void> {
  return chrome.storage.sync.set({ github_pat: pat });
}
