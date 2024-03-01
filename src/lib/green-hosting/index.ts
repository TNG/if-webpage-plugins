import {hosting} from '@tgwf/co2';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations.js';

import {ModelPluginInterface} from '../../interfaces';
import {ModelParams} from '../../types';
import {buildErrorMessage} from '../../util/helpers.js';

export class GreenHostingModel implements ModelPluginInterface {
  domain: string = '';
  errorBuilder = buildErrorMessage(this.constructor.name);

  /**
   * Configures the green hosting model.
   */
  public async configure(staticParams: object): Promise<ModelPluginInterface> {
    this.setValidatedParams(staticParams);

    return this;
  }

  /**
   * Executes the green hosting check for given url.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return await Promise.all(
      inputs.map(async input => {
        this.setValidatedParams(input);
        input['green-hosting'] = await hosting.check(this.domain);
        return input;
      })
    );
  }

  private setValidatedParams(params: object) {
    if ('domain' in params) {
      const safeStaticParams = Object.assign(
        params,
        this.validateInput(params)
      );

      this.domain = safeStaticParams.domain;
    }
  }

  /**
   * Validates the input parameters of the green hosting model.
   */
  private validateInput(input: object) {
    const schema = z
      .object({
        domain: z.string(),
      })
      .refine(allDefined, {message: '`domain` must be provided.'});

    return validate<z.infer<typeof schema>>(schema, input);
  }
}
