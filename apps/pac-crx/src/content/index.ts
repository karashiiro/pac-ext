function githubDiffInfo(pathname: string): [string, string] | null {
  const match = /\/\w+\/\w+\/compare\/(?<startCommit>\w+)..(?<endCommit>\w+)/.exec(pathname);
  if (!match?.groups) {
    return null;
  }

  const startCommit = match.groups['startCommit'];
  const endCommit = match.groups['endCommit'];

  return [startCommit, endCommit];
}

type LineDiff = {
  type: 'delete' | 'add' | 'replace';
  lineNumber: number;
  line?: { old?: string; new?: string };
};

function parseChanges(content: Element[]): LineDiff[] {
  const lines = new Map<number, { old?: string; new?: string }>();
  const changes = new Map<number, 'delete' | 'add' | 'replace'>();
  for (const row of content) {
    if (row.classList.contains('js-expandable-line')) {
      continue;
    }

    const cells = Array.from(row.querySelectorAll('td'));
    const oldLineNumber = cells[0].getAttribute('data-line-number');
    const newLineNumber = cells[1].getAttribute('data-line-number');

    if (oldLineNumber != null && newLineNumber != null) {
      continue;
    }

    const lineNumberRaw = oldLineNumber ?? newLineNumber;
    if (lineNumberRaw == null) {
      continue;
    }

    const lineNumber = parseInt(lineNumberRaw);
    if (isNaN(lineNumber)) {
      continue;
    }

    const lineSpan = cells[2].querySelectorAll('.blob-code-inner') as NodeListOf<HTMLSpanElement>;
    const line = lineSpan[0].innerText;
    const isLineOld = oldLineNumber != null;
    const lastLine = lines.get(lineNumber);
    lines.set(lineNumber, {
      old: isLineOld ? line : lastLine?.old,
      new: !isLineOld ? line : lastLine?.new,
    });

    const isDelete = cells[0].classList.contains('blob-num-deletion');
    const nextChangeType = isDelete ? 'delete' : 'add';
    const lastChangeType = changes.get(lineNumber);
    if (lastChangeType == null) {
      changes.set(lineNumber, nextChangeType);
    } else if (lastChangeType !== nextChangeType) {
      changes.set(lineNumber, 'replace');
    }
  }

  return Array.from(changes.entries()).map(([lineNumber, changeType]) => ({
    type: changeType,
    lineNumber: lineNumber,
    line: lines.get(lineNumber),
  }));
}

function elementToDiff(element: Element) {
  const content = Array.from(element.querySelectorAll('.js-file-content tbody tr'));
  const changes = parseChanges(content);
  return {
    filePath: element.getAttribute('data-tagsearch-path'),
    changes: changes,
  };
}

// TODO: Don't rely on polling; see below note
let initialized = false;
function init() {
  if (initialized) {
    return;
  }

  if (document.location.hostname === 'github.com') {
    const diffInfo = githubDiffInfo(document.location.pathname);
    if (diffInfo != null) {
      const [startCommit, endCommit] = diffInfo;
      console.log(`GitHub diff viewer ${startCommit}..${endCommit}`);

      const diffFiles = document.body.querySelectorAll('#files .file');
      if (diffFiles.length === 0) {
        return;
      }

      initialized = true;

      console.log(diffFiles);
      console.log(Array.from(diffFiles).map(elementToDiff));
    }
  }
}

// BUG: Sometimes this gets called before the files render, so it finds no elements
setInterval(init, 1000);
