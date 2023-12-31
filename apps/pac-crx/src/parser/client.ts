import type Parser from 'web-tree-sitter';
import { ParseCodeResult, ParserEvent } from './messages';

export function injectParser(element: Element) {
  // tree-sitter must be injected into the page in an iframe to circumvent GitHub's CSP configuration.
  // This content script can communicate with the parser using Chrome's runtime messaging API.
  const src = chrome.runtime.getURL('parser/index.html');
  const iframe = new DOMParser().parseFromString(`<iframe src="${src}"></iframe>`, 'text/html').body
    .firstElementChild!;
  iframe.setAttribute('hidden', '');
  element.append(iframe);
}

export function parseCode(code: string): Promise<ParseCodeResult> {
  return chrome.runtime.sendMessage<ParserEvent>({
    event: 'parseCode',
    value: {
      code,
    },
  });
}

export function diffTrees(base: string, head: string): Promise<Parser.Range[]> {
  return chrome.runtime.sendMessage<ParserEvent>({
    event: 'diffTrees',
    value: {
      base,
      head,
    },
  });
}

export function getTreeString(id: string): Promise<string> {
  return chrome.runtime.sendMessage<ParserEvent>({
    event: 'getTreeString',
    value: {
      id,
    },
  });
}
