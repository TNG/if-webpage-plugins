// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen <alexander.zur.bonsen@tngtech.com>
// SPDX SPDX-License-Identifier: Apache-2.0

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  implementation: async (inputs: PluginParams[], _config: ConfigParams) => {
    return inputs.map(input => {
      if (input['timer/start']) {
        throw new InputValidationError(
          `TimerStart: ${TIMER.ERROR_MESSAGE_EXISTING_START}`,
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
