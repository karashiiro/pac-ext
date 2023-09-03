/* @refresh reload */
import { render } from 'solid-js/web';
import { Popup } from '@goatcorp-pac/core-ui';
import { getPAT, setPAT } from '../storage';

render(
  () => (
    <Popup
      settings={{
        getPAT,
        setPAT,
      }}
    />
  ),
  document.getElementById('app') ?? document.body,
);
