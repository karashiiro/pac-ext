import { defineManifest } from '@crxjs/vite-plugin';
import meta from '../package.json';

const packageNameParts = meta.name.split('/');
const packageName = packageNameParts[packageNameParts.length - 1];

export default defineManifest({
  name: 'goatcorp PAC extension',
  short_name: packageName,
  author: meta.author.name,
  description: meta.description,
  version: meta.version,
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-34.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: 'img/logo-48.png',
  },
  options_page: 'src/options/index.html',
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        'img/logo-16.png',
        'img/logo-34.png',
        'img/logo-48.png',
        'img/logo-128.png',
        'parser/index.html',
      ],
      matches: [],
    },
  ],
  permissions: ['storage'],
});
