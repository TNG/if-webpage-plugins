import {hosting} from '@tgwf/co2';
import {getDomain} from 'tldjs';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations';

import {PluginFactory} from '@grnsft/if-core/interfaces';
import {PluginParams, ConfigParams} from '@grnsft/if-core/types';

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
          'True, false or undefined, indicating that the domain is or is not hosted green. If the return value is undefined, no domain could be extracted from the provided url.',
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
  },
  inputValidation: (
    input: PluginParams,
    _config: ConfigParams,
    _index: number | undefined
  ) => {
    const schema = z
      .object({
        url: z.string(),
      })
      .refine(allDefined, {message: '`url` must be provided.'});

    return validate<z.infer<typeof schema>>(schema, input);
  },
  implementation: async (inputs: PluginParams[], _config: ConfigParams) => {
    return await Promise.all(
      inputs.map(async input => {
        const domain = getDomain(input.url);
        if (domain === null) {
          console.warn(
            `GreenHosting: Could not extract domain from url ${input.url}`
          );
        }
        // generate timestamp and duration if they do not exist in input
        if (!('timestamp' in input) && !('duration' in input)) {
          input = {
            timestamp: new Date().toISOString(),
            duration: 0, // We are getting information from an API. No need to know how long we waited.
            ...input,
          };
        }
        return {
          ...input,
          'green-web-host': domain ? await hosting.check(domain) : undefined,
        };
      })
    );
  },
});
