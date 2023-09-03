import { Suspense, createResource } from 'solid-js';
import { ExtensionSettings } from './settings';
import './Popup.module.css';

/**
 * Popup component.
 */
export const Popup = ({ settings }: { settings: ExtensionSettings }) => {
  const [pat, { mutate }] = createResource(settings.getPAT);
  return (
    <main>
      <Suspense fallback={<p>Loading extension settings...</p>}>
        <h1>GitHub PAT</h1>
        <input
          placeholder="Enter your GitHub PAT"
          value={pat()}
          onChange={(ev) => {
            mutate(ev.currentTarget.value);
            settings.setPAT(ev.currentTarget.value);
          }}
        />
      </Suspense>
    </main>
  );
};

export default Popup;
