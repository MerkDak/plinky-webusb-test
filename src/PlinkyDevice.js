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
export const createMachineStore = (
  machine,
  initialContext
) => {
  const service = interpret(
    machine,
    (service) => {
      console.log('state', service.machine.current, 'context', service.context);
      store.set({ state: service.machine.current, context: service.context });
    },
    initialContext,
  );

  const store = writable({
    state: machine.current,
    context: service.context,
  });

  const send = service.send;

  return [store, send];
};

export function createQuestionnaireStateMachine(interviewData) {
  function hasNextQuestion(ctx) {
    return ctx.currentQuestion < ctx.questions.length;
  }

  function nextQuestion(ctx) {
    ctx.currentQuestion++;
    return ctx;
  }

  function finishInterview(ctx) {
    console.log('finishInterview', ctx);
    return ctx;
  }

  const states = {
    beforeQuestion: state(transition('proceed', 'question')),
    question: state(transition('proceed', 'afterQuestion')),
    afterQuestion: state(transition('proceed', 'beforeAnswer')),
    beforeAnswer: state(transition('proceed', 'answer')),
    answer: state(transition('proceed', 'processAnswer')),
    processAnswer: state(
      transition('proceed', 'afterAnswer', reduce(nextQuestion)),
    ),
    afterAnswer: state(
      immediate('beforeQuestion', guard(hasNextQuestion)),
      immediate('afterInterview', action(finishInterview)),
    ),
    afterInterview: state(),
  };

  const context = (ctx) => {
    return { ...ctx };
  };

  const initialContext = Object.assign(interviewData, {
    currentQuestion: 0,
  });

  const machine = createMachine(states, context);

  return createMachineStore(machine, initialContext);
}

export function createInterviewStateMachine(interviewData) {
  const states = {
    start: state(transition('proceed', 'volumeWarning')),
    volumeWarning: state(transition('proceed', 'welcome')),
    welcome: state(
      transition('proceed', interviewData.intro ? 'intro' : 'interview'),
    ),
    intro: state(transition('proceed', 'interview')),
    interview: state(
      transition(
        'proceed',
        interviewData.askForDocument
          ? 'uploadDocument'
          : interviewData.outro
          ? 'outro'
          : 'finish',
      ),
    ),
    uploadDocument: state(
      transition('proceed', interviewData.outro ? 'outro' : 'finish'),
    ),
    outro: state(transition('proceed', 'finish')),
    finish: state(),
  };

  return createMachineStore(createMachine(states));

  /*
  const machine = createMachine({
    preview: state(
      transition(
        'edit',
        'editMode',
        // Save the current title as oldTitle so we can reset later.
        reduce((ctx) => ({ ...ctx, oldTitle: ctx.title })),
      ),
    ),
    editMode: state(
      transition(
        'input',
        'editMode',
        reduce((ctx, ev) => ({ ...ctx, title: ev.target.value })),
      ),
      transition('cancel', 'cancel'),
      transition('save', 'validate'),
    ),
    cancel: state(
      immediate(
        'preview',
        // Reset the title back to oldTitle
        reduce((ctx) => ({ ...ctx, title: ctx.oldTitle })),
      ),
    ),
    validate: state(
      // Check if the title is valid. If so go
      // to the save state, otherwise go back to editMode
      immediate('save', guard(titleIsValid)),
      immediate('editMode'),
    ),
    save: invoke(saveTitle, transition('done', 'preview'), transition('error', 'error')),
    error: state(),
    // Should we provide a retry or...?
  });

  */
}
