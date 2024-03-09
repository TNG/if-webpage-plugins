import {PluginParams} from '../../types/common';
import {PluginInterface} from '../../interfaces';
import {z} from 'zod';
import {validate} from '../../util/validations';
import {buildErrorMessage} from '../../util/helpers';
import {ERRORS} from '../../util/errors';

const {InputValidationError} = ERRORS;

const ERROR_MESSAGE_RESETS =
  'Seems like `resets` is too short and all its values have been consumed by previous calls to `TimerStart`.';
export const TimerStart = (): PluginInterface => {
  const errorBuilder = buildErrorMessage(TimerStart.name);
  const metadata = {
    kind: 'execute',
  };

  const execute = async (inputs: PluginParams[]) => {
    return inputs.map(input => {
      const {resets} = validateInput(input);
      const reset = resets.shift();
      if (reset === undefined) {
        throw new InputValidationError(
          errorBuilder({
            message: ERROR_MESSAGE_RESETS,
          })
        );
      }
      const startTime = new Date(Date.now()).toISOString();
      return {
        ...input,
        ...(reset
          ? {timestamp: startTime, duration: 0}
          : {'timer/start': startTime}),
        resets,
      };
    });
  };

  const validateInput = (input: PluginParams) => {
    const schema = z
      .object({
        resets: z.array(z.boolean()),
      })
      .refine(data => data.resets.length > 0, {message: ERROR_MESSAGE_RESETS});

    return validate<z.infer<typeof schema>>(schema, input);
  };

  return {
    metadata,
    execute,
  };
};
