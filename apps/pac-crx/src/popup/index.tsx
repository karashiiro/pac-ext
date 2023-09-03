/* @refresh reload */
import { render } from 'solid-js/web';
import { Popup } from '@goatcorp-pac/core-ui';

render(() => <Popup />, document.getElementById('app') ?? document.body);
