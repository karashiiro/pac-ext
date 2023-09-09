import { TaggedUnionCase, TaggedUnionTags } from './union';

export type SyntaxId = number;

interface SingleLineSpan {
  line: number;
  startCol: number;
  endCol: number;
}

enum AtomKind {
  Normal,
  String,
  Type,
  Comment,
  Keyword,
  TreeSitterError,
}

interface List {
  info: SyntaxInfo;
  openPosition: SingleLineSpan[];
  openContent: string;
  children: Syntax[];
  closePosition: SingleLineSpan[];
  closeContent: string;
  numDescendents: number;
}

interface Atom {
  info: SyntaxInfo;
  position: SingleLineSpan[];
  content: string;
  kind: AtomKind;
}

interface SyntaxMethods {
  parent(): Syntax | undefined;
  nextSibling(): Syntax | undefined;
  id(): number;
  contentId(): number;
  contentIsUnique(): boolean;
  numAncestors(): number;
}

export type Syntax = (TaggedUnionCase<'list', List> | TaggedUnionCase<'atom', Atom>) &
  SyntaxMethods;

interface SyntaxInfo {
  previousSibling?: Syntax;
  nextSibling?: Syntax;
  prev?: Syntax;
  parent?: Syntax;
  numAncestors: number;
  numAfter: number;
  uniqueId: SyntaxId;
  contentId: number;
  contentIsUnique: boolean;
}

const DEFAULT_SYNTAX_INFO = Object.freeze<SyntaxInfo>({
  previousSibling: undefined,
  nextSibling: undefined,
  prev: undefined,
  parent: undefined,
  numAncestors: 0,
  numAfter: 0,
  uniqueId: Number.MAX_SAFE_INTEGER,
  contentId: 0,
  contentIsUnique: false,
});

class SyntaxImpl<Tag extends TaggedUnionTags<Syntax>> implements SyntaxMethods {
  info: SyntaxInfo = { ...DEFAULT_SYNTAX_INFO };

  constructor(public type: Tag) {}

  parent(): Syntax | undefined {
    return this.info.parent;
  }

  nextSibling(): Syntax | undefined {
    return this.info.nextSibling;
  }

  id(): number {
    return this.info.uniqueId;
  }

  contentId(): number {
    return this.info.contentId;
  }

  contentIsUnique(): boolean {
    return this.info.contentIsUnique;
  }

  numAncestors(): number {
    return this.info.numAncestors;
  }
}

class ListImpl extends SyntaxImpl<'list'> implements List {
  private constructor(
    public openPosition: SingleLineSpan[],
    public openContent: string,
    public children: Syntax[],
    public closePosition: SingleLineSpan[],
    public closeContent: string,
    public numDescendents: number,
  ) {
    super('list');
  }

  static from(
    openPosition: SingleLineSpan[],
    openContent: string,
    children: Syntax[],
    closePosition: SingleLineSpan[],
    closeContent: string,
  ): Syntax {
    // Skip empty atoms: they aren't displayed, so there's no
    // point making our syntax tree bigger. These occur when we're
    // parsing incomplete or malformed programs.
    children = children.filter((n) => n.type === 'list' || n.content.length !== 0);

    // Don't bother creating a list if we have no open/close and
    // there's only one child. This occurs in small files with
    // thorough tree-sitter parsers: you get parse trees like:
    //
    // (compilation-unit (top-level-def (function ...)))
    //
    // This is a small performance win as it makes the difftastic
    // syntax tree smaller. It also really helps when looking at
    // debug output for small inputs.
    if (children.length === 1 && openContent === '' && closeContent === '') {
      return children[0];
    }

    let numDescendents = 0;
    for (const child of children) {
      numDescendents += child.type === 'list' ? child.numDescendents + 1 : 1;
    }

    return new ListImpl(
      openPosition,
      openContent,
      children,
      closePosition,
      closeContent,
      numDescendents,
    );
  }
}

class AtomImpl extends SyntaxImpl<'atom'> implements Atom {
  private constructor(
    public position: SingleLineSpan[],
    public content: string,
    public kind: AtomKind,
  ) {
    super('atom');
  }

  static from(position: SingleLineSpan[], content: string, kind: AtomKind): Syntax {
    // If a parser hasn't cleaned up \r on CRLF files with
    // comments, discard it.
    if (content.endsWith('\r')) {
      content = content.slice(0, content.length - 1);
    }

    if (kind === AtomKind.Comment && content.endsWith('\n')) {
      position = position.slice(0, position.length - 1);
      content = content.slice(0, content.length - 1);
    }

    return new AtomImpl(position, content, kind);
  }
}

export function commentPositions(nodes: Syntax[]): SingleLineSpan[] {
  function walkCommentPositions(node: Syntax, positions: SingleLineSpan[]) {
    if (node.type === 'list') {
      for (const child of node.children) {
        walkCommentPositions(child, positions);
      }
    } else if (node.kind === AtomKind.Comment) {
      positions.push(...node.position);
    }
  }

  const res: SingleLineSpan[] = [];
  for (const node of nodes) {
    walkCommentPositions(node, res);
  }

  return res;
}

export function initAllInfo(lhsRoots: Syntax[], rhsRoots: Syntax[]) {
  initInfo(lhsRoots, rhsRoots);
  initNextPrev(lhsRoots);
  initNextPrev(rhsRoots);
}

type ContentKey = [string | undefined, string | undefined, number[], boolean, boolean];

type RefSyntaxId = { value: SyntaxId };

function initInfo(lhsRoots: Syntax[], rhsRoots: Syntax[]) {
  const id: RefSyntaxId = { value: 1 };
  initInfoOnSide(lhsRoots, id);
  initInfoOnSide(rhsRoots, id);

  const existing = new Map<ContentKey, number>();
  setContentId(lhsRoots, existing);
  setContentId(rhsRoots, existing);

  setContentIsUnique(lhsRoots);
  setContentIsUnique(rhsRoots);
}

function setContentId(nodes: Syntax[], existing: Map<ContentKey, number>) {
  for (const node of nodes) {
    const key = ((): ContentKey => {
      if (node.type === 'list') {
        // Recurse first, so children all have their content_id set.
        setContentId(node.children, existing);

        const childrenContentIds = node.children.map((c) => c.info.contentId);

        return [node.openContent, node.closeContent, childrenContentIds, true, true];
      } else {
        const isComment = node.kind === AtomKind.Comment;
        const lines = node.content.split(/\r|\n/g);
        const cleanContent =
          isComment && lines.length > 1 ? lines.map((l) => l.trimStart()).join('\n') : node.content;
        return [cleanContent, undefined, [], false, isComment];
      }
    })();

    // Ensure the ID is always greater than zero, so we can
    // distinguish an uninitialised SyntaxInfo value.
    const nextId = existing.size + 1;
    if (!existing.has(key)) {
      existing.set(key, nextId);
    }
    const contentId = existing.get(key) ?? nextId;
    node.info.contentId = contentId;
  }
}

function setNumAfter(nodes: Syntax[], parentNumAfter: number) {
  nodes.forEach((node, i) => {
    const numAfter = parentNumAfter + nodes.length - 1 - i;
    node.info.numAfter = numAfter;

    if (node.type === 'list') {
      setNumAfter(node.children, numAfter);
    }
  });
}

function initNextPrev(roots: Syntax[]) {
  setPrevSibling(roots);
  setNextSibling(roots);
  setPrev(roots, undefined);
}

// Set all the `SyntaxInfo` values for all the `roots` on a single
// side (LHS or RHS).
function initInfoOnSide(roots: Syntax[], nextId: RefSyntaxId) {
  setParent(roots, undefined);
  setNumAncestors(roots, 0);
  setNumAfter(roots, 0);
  setUniqueId(roots, nextId);
}

function setUniqueId(nodes: Syntax[], nextId: RefSyntaxId) {
  for (const node of nodes) {
    node.info.uniqueId = nextId.value;
    nextId.value++;

    if (node.type === 'list') {
      setUniqueId(node.children, nextId);
    }
  }
}

function findNodesWithUniqueContent(nodes: Syntax[], counts: Map<number, number>) {
  for (const node of nodes) {
    const contentId = node.contentId();
    const count = counts.get(contentId) ?? 0;
    counts.set(contentId, count + 1);

    if (node.type === 'list') {
      findNodesWithUniqueContent(node.children, counts);
    }
  }
}

function setContentIsUniqueFromCounts(nodes: Syntax[], counts: Map<number, number>) {
  for (const node of nodes) {
    const contentId = node.contentId();
    const count = counts.get(contentId);
    if (!count) {
      throw new Error('Count should be present');
    }

    node.info.contentIsUnique = count === 1;

    if (node.type === 'list') {
      setContentIsUniqueFromCounts(node.children, counts);
    }
  }
}

function setContentIsUnique(nodes: Syntax[]) {
  const counts = new Map<number, number>();
  findNodesWithUniqueContent(nodes, counts);
  setContentIsUniqueFromCounts(nodes, counts);
}

function setPrevSibling(nodes: Syntax[]) {
  let prev: Syntax | undefined = undefined;
  for (const node of nodes) {
    node.info.previousSibling = prev;
    prev = node;

    if (node.type === 'list') {
      setPrevSibling(node.children);
    }
  }
}

function setNextSibling(nodes: Syntax[]) {
  nodes.forEach((node, i) => {
    const sibling = Object.create(nodes[i + 1]);
    node.info.nextSibling = sibling;

    if (node.type === 'list') {
      setNextSibling(node.children);
    }
  });
}

function setPrev(nodes: Syntax[], parent: Syntax | undefined) {
  nodes.forEach((node, i) => {
    const nodePrev = i === 0 ? parent : nodes[i - 1];
    node.info.prev = nodePrev;

    if (node.type === 'list') {
      setPrev(node.children, node);
    }
  });
}

function setParent(nodes: Syntax[], parent: Syntax | undefined) {
  for (const node of nodes) {
    node.info.parent = parent;

    if (node.type === 'list') {
      setParent(node.children, node);
    }
  }
}

function setNumAncestors(nodes: Syntax[], numAncestors: number) {
  for (const node of nodes) {
    node.info.numAncestors = numAncestors;

    if (node.type === 'list') {
      setNumAncestors(node.children, numAncestors + 1);
    }
  }
}

type TokenKind = TaggedUnionCase<'delimiter', object> | TaggedUnionCase<'atom', { kind: AtomKind }>;

interface Highlight {
  highlight: TokenKind;
}

interface UnchangedToken extends Highlight {
  selfPos: SingleLineSpan[];
  oppositePos: SingleLineSpan[];
}

interface NovelLinePart extends Highlight {
  selfPos: SingleLineSpan[];
  oppositePos: SingleLineSpan[];
}

type MatchKind =
  | TaggedUnionCase<'unchanged-token', UnchangedToken>
  | TaggedUnionCase<'novel', Highlight>
  | TaggedUnionCase<'novel-line-part', NovelLinePart>
  | TaggedUnionCase<'novel-word', Highlight>
  | TaggedUnionCase<'ignored', Highlight>;

function isNovel(match: MatchKind) {
  return match.type === 'novel' || match.type === 'novel-word' || match.type === 'novel-line-part';
}

interface MatchedPos {
  kind: MatchKind;
  pos: SingleLineSpan;
}
