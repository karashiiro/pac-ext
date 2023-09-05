import Parser from 'web-tree-sitter';
import treeSitter from '../wasm/tree-sitter.wasm?url';
import csharp from '../wasm/tree-sitter-c_sharp.wasm?url';
import { ParserEvent } from './messages';

// TODO: Move this to the bottom and add some kind of synchronization between this and the content script (can't use chrome.tabs in content scripts)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const event = request as ParserEvent;
  const eventType = event.event;
  switch (eventType) {
    case 'parseCode':
      sendResponse(parseCode(event.value.code));
      break;
    case 'getParseString':
      sendResponse(parseResults.get(event.value.id)?.rootNode.toString());
      break;
    default:
      ((x: never) => x)(eventType);
      throw new Error(`Unknown parser event: "${eventType}"`);
  }
});

await Parser.init({
  locateFile(scriptName: string) {
    if (scriptName === 'tree-sitter.wasm') {
      return new URL(treeSitter, import.meta.url).href;
    }

    return scriptName;
  },
});

const CSharp = await Parser.Language.load(new URL(csharp, import.meta.url).href);

const parser = new Parser();
parser.setLanguage(CSharp);

const parseResults = new Map<string, Parser.Tree>();

interface ParseCodeResult {
  id: string;
}

function parseCode(code: string): ParseCodeResult {
  const id = crypto.randomUUID();
  const tree = parser.parse(code);
  parseResults.set(id, tree);
  return { id };
}
