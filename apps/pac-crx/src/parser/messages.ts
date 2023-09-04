interface ParseCodeEventArgs {
  code: string;
}

interface GetParseStringEventArgs {
  id: string;
}

export type ParserEvent =
  | {
      event: 'parseCode';
      value: ParseCodeEventArgs;
    }
  | {
      event: 'getParseString';
      value: GetParseStringEventArgs;
    };
