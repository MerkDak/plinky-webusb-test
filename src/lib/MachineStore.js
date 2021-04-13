import {
  Machine,
  SendFunction,
  action,
  createMachine,
  guard,
  immediate,
  interpret,
  reduce,
  state,
  transition,
} from 'robot3';
import { Writable, writable } from 'svelte/store';

/**
 * Wrap an FSM in a Svelte store
 * @param machine Robot3 state machine
 */
export const MachineStore = (
  machine,
  initialContext
) => {
  const service = interpret(
    machine,
    (_service) => {
      if(service === _service) {
        console.log('state', _service.machine.current, 'context', _service.context);
        store.set({ state: _service.machine.current, context: _service.context });
      }
      else {
        // this is an inner state machine
      }
    },
    initialContext,
  );

  const store = writable({
    state: machine.current,
    context: service.context,
  });

  const send = service.send;

  return [store, send, machine];
};
