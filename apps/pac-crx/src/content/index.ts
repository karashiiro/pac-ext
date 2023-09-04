import { Octokit } from 'octokit';
import { getPAT } from '../storage';
import { ParserEvent } from '../parser/messages';

function injectParser() {
  // tree-sitter must be injected into the page in an iframe to circumvent GitHub's CSP configuration.
  // This content script can communicate with the parser using Chrome's runtime messaging API.
  const src = chrome.runtime.getURL('parser/index.html');
  const iframe = new DOMParser().parseFromString(`<iframe src="${src}"></iframe>`, 'text/html').body
    .firstElementChild!;
  iframe.setAttribute('hidden', '');
  document.body.append(iframe);
}

function parseCode(code: string) {
  // TODO: Recover Parser.Tree prototype?
  return chrome.runtime.sendMessage<ParserEvent>({
    event: 'parseCode',
    value: {
      code,
    },
  });
}

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

  injectParser();

  // TODO: Remove this and add some kind of synchronization between this and the parser (can't use chrome.tabs in content scripts)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(await parseCode(`Console.WriteLine("Hello, world!");`));

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
  for (const file of compare.data.files?.filter((f) => f.previous_filename) ?? []) {
    // file.blob_url has the new file contents, but there's no link to the old file contents
    const [oldContent, newContent] = await Promise.all([
      fetchGitHubFileContent(owner, repo, baseCommit, file.previous_filename!),
      fetchGitHubFileContent(owner, repo, headCommit, file.filename),
    ]);
    changedFiles.set(file.filename, {
      old: {
        path: file.previous_filename!,
        data: oldContent,
      },
      new: {
        path: file.filename,
        data: newContent,
      },
    });
  }

  console.log(changedFiles);
}

await init();
