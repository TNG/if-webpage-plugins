import {buildErrorMessage, ERRORS} from '../../util/errors';
import {STRINGS} from '../../config';
import {PluginFactory} from '@grnsft/if-core/interfaces';
import {ConfigParams, PluginParams} from '@grnsft/if-core/types';

const {InputValidationError} = ERRORS;
const {TIMER} = STRINGS;

export const TimerStart = PluginFactory({
  metadata: {
    outputs: {
      'timer/start': {
        description:
          'Timestamp, usually set by a prior invocation of `TimerStart`. (But that is no requirement.)',
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
  },
  implementation: async (inputs: PluginParams[], _config: ConfigParams) => {
    const errorBuilder = buildErrorMessage(TimerStart.name);

    return inputs.map(input => {
      if (input['timer/start']) {
        throw new InputValidationError(
          errorBuilder({
            message: TIMER.ERROR_MESSAGE_EXISTING_START,
          })
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
