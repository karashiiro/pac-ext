interface ParseCodeEventArgs {
  code: string;
}

export interface ParseCodeResult {
  id: string;
}

interface DiffTreesEventArgs {
  base: string;
  head: string;
}

interface GetTreeStringEventArgs {
  id: string;
}

export type ParserEvent =
  | {
      event: 'parseCode';
      value: ParseCodeEventArgs;
    }
  | {
      event: 'diffTrees';
      value: DiffTreesEventArgs;
    }
  | {
      event: 'getTreeString';
      value: GetTreeStringEventArgs;
    };
