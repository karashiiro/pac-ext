export type TaggedUnionCase<Tag extends string, Value> = Value & {
  type: Tag;
};

export type TaggedUnionTags<T extends TaggedUnionCase<string, unknown>> = T extends TaggedUnionCase<
  infer Tag,
  unknown
>
  ? Tag
  : never;
