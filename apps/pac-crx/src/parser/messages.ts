interface ParseCodeEventArgs {
  code: string;
}

export type ParserEvent =
  | {
      event: 'parseCode';
      value: ParseCodeEventArgs;
    }
  | {
      event: 'ready';
      value: object;
    };
