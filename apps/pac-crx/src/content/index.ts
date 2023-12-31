import { Octokit } from 'octokit';
import { getPAT } from '../storage';
import { injectParser, parseCode, getTreeString } from '../parser/client';

interface GitHubDiffInfo {
  owner: string;
  repo: string;
  baseCommit: string;
  headCommit: string;
}

function githubDiffInfo(pathname: string): GitHubDiffInfo | null {
  const match =
    /\/(?<owner>(\w|-)+)\/(?<repo>(\w|-)+)\/compare\/(?<baseCommit>\w+)..(?<headCommit>\w+)/.exec(
      pathname,
    );
  if (!match?.groups) {
    return null;
  }

  const owner = match.groups['owner'];
  const repo = match.groups['repo'];
  const baseCommit = match.groups['baseCommit'];
  const headCommit = match.groups['headCommit'];

  return { owner, repo, baseCommit, headCommit };
}

function fetchGitHubFileContent(owner: string, repo: string, commitSha: string, fileName: string) {
  return fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${fileName}`).then(
    (res) => res.text(),
  );
}

interface FileState {
  path: string;
  data: string;
}

async function init() {
  if (document.location.hostname !== 'github.com') {
    return;
  }

  const diffInfo = githubDiffInfo(document.location.pathname);
  if (diffInfo == null) {
    return;
  }

  const { owner, repo, baseCommit, headCommit } = diffInfo;
  console.log(`GitHub diff viewer ${baseCommit}..${headCommit}`);

  injectParser(document.body);

  // TODO: Remove this and add some kind of synchronization between this and the parser (can't use chrome.tabs in content scripts)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const pat = await getPAT();
  if (!pat) {
    console.warn('PAC extension PAT not set!');
    return;
  }

  const octokit = new Octokit({ auth: pat });
  const compare = await octokit.rest.repos.compareCommits({
    owner: owner,
    repo: repo,
    base: baseCommit,
    head: headCommit,
  });

  console.log(compare);

  const changedFiles = new Map<string, { old: FileState; new: FileState }>();
  for (const file of compare.data.files ?? []) {
    // file.blob_url has the new file contents, but there's no link to the old file contents
    const [oldContent, newContent] = await Promise.all([
      fetchGitHubFileContent(owner, repo, baseCommit, file.previous_filename ?? file.filename),
      fetchGitHubFileContent(owner, repo, headCommit, file.filename),
    ]);
    changedFiles.set(file.filename, {
      old: {
        path: file.previous_filename ?? file.filename,
        data: oldContent,
      },
      new: {
        path: file.filename,
        data: newContent,
      },
    });
  }

  console.log(changedFiles);

  for (const fileState of Array.from(changedFiles.entries())
    .filter(([path]) => path.endsWith('.cs'))
    .map(([, f]) => f)) {
    const { id: baseTreeId } = await parseCode(fileState.old.data);
    const { id: headTreeId } = await parseCode(fileState.new.data);
    console.log(await getTreeString(baseTreeId));
    console.log(await getTreeString(headTreeId));
  }
}

await init();
