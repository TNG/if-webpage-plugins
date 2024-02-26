import {hosting} from '@tgwf/co2';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations.js';

import {ModelPluginInterface} from '../../interfaces';
import {ModelParams} from '../../types';
import {buildErrorMessage} from '../../util/helpers.js';

export class GreenHostingModel implements ModelPluginInterface {
  errorBuilder = buildErrorMessage(this.constructor.name);

  /**
   * Configures the green hosting model.
   */
  public async configure(): Promise<ModelPluginInterface> {
    return this;
  }

  /**
   * Executes the green hosting check for given url.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return await Promise.all(
      inputs.map(async input => {
        const validInput = Object.assign(input, this.validateInput(input));

        input['green-hosting'] = await hosting.check(validInput.domain);
        return input;
      })
    );
  }

  /**
   * Validates the input parameters of the green hosting model.
   */
  private validateInput(input: ModelParams) {
    const schema = z
      .object({
        domain: z.string(),
      })
      .refine(allDefined, {message: '`domain` must be provided.'});

    return validate<z.infer<typeof schema>>(schema, input);
  }
}
