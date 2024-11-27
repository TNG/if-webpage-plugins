// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen <alexander.zur.bonsen@tngtech.com>
// SPDX SPDX-License-Identifier: Apache-2.0

import {hosting} from '@tgwf/co2';
import {getDomain} from 'tldjs';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations';

import {PluginFactory} from '@grnsft/if-core/interfaces';
import {PluginParams, ConfigParams} from '@grnsft/if-core/types';
import {addCurrentTimestampAndDurationIfMissing} from '../../util/helpers';

export const GreenHosting = PluginFactory({
  metadata: {
    inputs: {
      url: {
        description:
          'The url of the web page whose domain is checked for green hosting.',
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
    outputs: {
      'green-web-host': {
        description:
          'True, false or undefined, indicating that the domain is or is not hosted green. If undefined, no valid domain could be extracted from the provided url.',
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
  },
  inputValidation: (
    input: PluginParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: ConfigParams,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _index: number | undefined,
  ) => {
    const schema = z
      .object({
        url: z.string(),
      })
      .refine(allDefined, {message: '`url` must be provided.'});

    return validate<z.infer<typeof schema>>(schema, input);
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  implementation: async (inputs: PluginParams[], _config: ConfigParams) => {
    return await Promise.all(
      inputs.map(async input => {
        const domain = getDomain(input.url);
        if (domain === null) {
          console.warn(
            `GreenHosting: Could not extract domain from url ${input.url}`,
          );
        }
        input = addCurrentTimestampAndDurationIfMissing(input, 0); // We are making a web request. No need to know how long we waited.
        return {
          ...input,
          'green-web-host': domain ? await hosting.check(domain) : undefined,
        };
      }),
    );
  },
});
