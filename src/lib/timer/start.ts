import {PluginInterface} from '../../interfaces';
import {buildErrorMessage, ERRORS} from '../../util/errors';
import {STRINGS} from '../../config';
import {PluginParams} from '../../types/common';

const {InputValidationError} = ERRORS;
const {TIMER} = STRINGS;

export const TimerStart = (): PluginInterface => {
  const errorBuilder = buildErrorMessage(TimerStart.name);
  const metadata = {
    kind: 'execute',
  };

  const execute = async (inputs: PluginParams[]) => {
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
  };

  return {
    metadata,
    execute,
  };
};
