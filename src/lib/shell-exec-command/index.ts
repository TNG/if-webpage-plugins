// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen <alexander.zur.bonsen@tngtech.com>
// SPDX SPDX-License-Identifier: Apache-2.0

import {exec} from 'child_process';
import {z} from 'zod';

import {validate} from '../../util/validations';
import * as util from 'util';
import {ConfigParams, PluginParams} from '@grnsft/if-core/types';
import {PluginFactory} from '@grnsft/if-core/interfaces';
import {addCurrentTimestampAndDurationIfMissing} from '../../util/helpers';

export const execAsync = util.promisify(exec);

export const ShellExecCommand = PluginFactory({
  metadata: {
    outputs: {
      stdout: {
        description:
          'Stdout of the executed command. Errors are logged instead of returned.',
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
  },
  configValidation: (
    config: ConfigParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _input: PluginParams | undefined,
  ) => {
    const schema = z.object({
      command: z.string(),
    });

    return validate<z.infer<typeof schema>>(schema, config);
  },
  implementation: async (inputs: PluginParams[], config: ConfigParams) => {
    const {command} = config;
    if (inputs.length === 0) {
      inputs.push({});
    }
    return await Promise.all(
      inputs.map(async input => {
        try {
          const start = Date.now();
          const {stdout} = await execAsync(command);
          const durationInSeconds = (Date.now() - start) / 1000;
          input = addCurrentTimestampAndDurationIfMissing(
            input,
            durationInSeconds,
          );
          return {...input, stdout: stdout.trim()};
        } catch (error) {
          console.error(`Error running the command: ${error}`); // the promisfied version rejects the promise if return code != 0
          return input;
        }
      }),
    );
  },
});
