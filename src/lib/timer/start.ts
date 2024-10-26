import {STRINGS} from '../../config';
import {PluginFactory} from '@grnsft/if-core/interfaces';
import {ConfigParams, PluginParams} from '@grnsft/if-core/types';
import {ERRORS} from '@grnsft/if-core/utils/errors';

const {InputValidationError} = ERRORS;
const {TIMER} = STRINGS;

export const TimerStart = PluginFactory({
  metadata: {
    outputs: {
      'timer/start': {
        description:
          'Timestamp, usually set by a prior invocation of `TimerStart`. (But that is no requirement.)',
        unit: 'ISO date string',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
  },
  implementation: async (inputs: PluginParams[], _config: ConfigParams) => {
    return inputs.map(input => {
      if (input['timer/start']) {
        throw new InputValidationError(
          `TimerStart: ${TIMER.ERROR_MESSAGE_EXISTING_START}`
        );
      }
      const startTime = new Date(Date.now()).toISOString();
      return {
        ...input,
        'timer/start': startTime,
      };
    });
  },
});
