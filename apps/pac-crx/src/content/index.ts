import { Octokit } from 'octokit';
import { getPAT } from '../storage';

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

  const rawDiff = await fetch(compare.data.diff_url);
  console.log(await rawDiff.text());
}

await init();
