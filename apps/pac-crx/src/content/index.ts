function githubDiffInfo(pathname: string): [string, string] | null {
  const match = /\/\w+\/\w+\/compare\/(?<startCommit>\w+)..(?<endCommit>\w+)/.exec(pathname);
  if (!match?.groups) {
    return null;
  }

  const startCommit = match.groups['startCommit'];
  const endCommit = match.groups['endCommit'];

  return [startCommit, endCommit];
}

if (document.location.hostname === 'github.com') {
  const diffInfo = githubDiffInfo(document.location.pathname);
  if (diffInfo != null) {
    const [startCommit, endCommit] = diffInfo;
    console.log(`GitHub diff viewer ${startCommit}..${endCommit}`);
  }
}
