import { Syntax, SyntaxId } from './syntax';
import { TaggedUnionCase } from './union';

interface UnchangedSyntax {
  syntax: Syntax;
}

interface ReplacedSyntax {
  before: Syntax;
  after: Syntax;
}

type ChangeKind =
  | TaggedUnionCase<'unchanged', UnchangedSyntax>
  | TaggedUnionCase<'replaced-comment', ReplacedSyntax>
  | TaggedUnionCase<'replaced-string', ReplacedSyntax>
  | TaggedUnionCase<'novel', object>;

type ChangeMap = Map<SyntaxId, ChangeKind>;
