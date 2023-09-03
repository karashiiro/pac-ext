/* @refresh reload */
import { render } from 'solid-js/web';
import { Options } from '@goatcorp-pac/core-ui';

render(() => <Options />, document.getElementById('app') ?? document.body);
