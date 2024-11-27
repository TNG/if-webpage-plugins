// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen <alexander.zur.bonsen@tngtech.com>
// SPDX SPDX-License-Identifier: Apache-2.0

import {z} from 'zod';

import {validate} from '../../util/validations';
import {STRINGS} from '../../config';

import {PluginFactory} from '@grnsft/if-core/interfaces';
import {ConfigParams, PluginParams} from '@grnsft/if-core/types';

const {TIMER} = STRINGS;

export const TimerStop = PluginFactory({
  metadata: {
    inputs: {
      'timer/start': {
        description:
          'Timestamp, set to the time of invocation of `TimerStart`.',
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
      resets: {
        description:
          'An array of booleans indicating whether the time should be reset. The length of the array has to be identical to the number of invocations of `TimerStop`.',
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
    outputs: {
      timestamp: {
        description:
          'Only if corresponding reset is set to true: timestamp set to the value of the input `timer/start`. Unmodified if corresponding reset is false.',
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
      duration: {
        description:
          'If corresponding reset is set to true: Set to the difference: time of invocation of `TimerStop` - time of invocation of `TimerStart`. If corresponding reset is false: Set to: `duration` + time of invocation of `TimerStop` - time of invocation of `TimerStart`',
        unit: 'seconds',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inputValidation: (input: PluginParams | undefined, _config: ConfigParams) => {
    const schema = z.object({
      resets: z
        .array(z.boolean())
        .min(1, {message: TIMER.ERROR_MESSAGE_RESETS}),
      'timer/start': z
        .string({required_error: TIMER.ERROR_MESSAGE_MISSING_START})
        .datetime(),
    });

    return validate<z.infer<typeof schema>>(schema, input);
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  implementation: async (inputs: PluginParams[], _config: ConfigParams) => {
    return inputs.map(input => {
      const {resets, 'timer/start': startTimeISOString} = input;
      const startTime = new Date(startTimeISOString).getTime();

      const reset = resets.shift();
      const durationInSeconds = (Date.now() - startTime) / 1000;
      delete input['timer/start'];
      if (resets.length === 0) delete input.resets;

      return {
        ...input,
        ...(reset && {timestamp: startTimeISOString}),
        ...(reset
          ? {duration: durationInSeconds}
          : {duration: input.duration + durationInSeconds}),
        ...(resets.length > 0 && {resets}),
      };
    });
  },
});
