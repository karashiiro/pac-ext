# Turborepo starter

This is an official starter Turborepo.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `ui`: a stub React component library shared by both `web` and `docs` applications
- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo
pnpm dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```
cd my-turborepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)

## Tree-sitter Notes

### WASM Build
Tree-sitter ships with a WASM binary, which is stored at `node_modules/web-tree-sitter/tree-sitter.wasm`.
The JS bindings dynamically load this file, which Vite can't handle automatically. This file has therefore
been copied to `apps/pac-crx/wasm/tree-sitter.wasm` and needs to be kept updated until this can be handled
by the build config or otherwise be imported statically by the extension
([vite-plugin-static-copy](https://www.npmjs.com/package/vite-plugin-static-copy) doesn't work for some
reason).

### Language Grammars
The C# grammar is prebuilt for convenience, this section can generally be ignored.

Tree-sitter can build language grammars using either a system Emscripten install or in Docker.
Docker builds seem to fail on Windows no matter what, so a system Emscripten install might be
required.

Additionally, Tree-sitter and the language grammar must have been built with the same
Emscripten version. Currently, this extension uses Tree-sitter 0.20.3, which was built
with Emscripten 2.0.24. Additional version mappings can be found
[here](https://github.com/sogaiu/ts-questions/blob/master/questions/which-version-of-emscripten-should-be-used-for-the-playground/README.md#versions).

The language grammar can be built with the following command from the repository root:
```sh
npx tree-sitter build-wasm lib/tree-sitter-c-sharp
```

Alternatively, at the time of writing, the following command will also work ([source](https://github.com/tree-sitter/tree-sitter/blob/524bf7e2c664d4a5dbd0c20d4d10f1e58f99e8ce/cli/src/wasm.rs#L21)):
```sh
emcc -o tree-sitter-c_sharp.wasm -Os -s WASM=1 -s SIDE_MODULE=1 -s TOTAL_MEMORY=33554432 -s NODEJS_CATCH_EXIT=0 -s NODEJS_CATCH_REJECTION=0 -s 'EXPORTED_FUNCTIONS=["_tree_sitter_c_sharp_"]' -fno-exceptions -I lib/tree-sitter-c-sharp/src lib/tree-sitter-c-sharp/src/scanner.c lib/tree-sitter-c-sharp/src/parser.c
```

The output file should be placed at `apps/pac-crx/wasm/tree-sitter-c_sharp.wasm`.
