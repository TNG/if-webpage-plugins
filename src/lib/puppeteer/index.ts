import puppeteer, {ResourceType} from 'puppeteer';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations.js';

import {ModelPluginInterface} from '../../interfaces';
import {ModelParams} from '../../types';
import {buildErrorMessage} from '../../util/helpers.js';

type Resource = {
  url: string;
  size: number;
  type: ResourceType;
  fromCache: boolean;
};

export class PuppeteerModel implements ModelPluginInterface {
  errorBuilder = buildErrorMessage(this.constructor.name);

  /**
   * Configures the puppeteer model.
   */
  public async configure(): Promise<ModelPluginInterface> {
    return this;
  }

  /**
   * Executes the puppeteer model for given url.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return await Promise.all(
      inputs.map(async input => {
        const validInput = Object.assign(input, this.validateInput(input));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {pageWeight, dataReloadRatio} = await this.measurePageSize(validInput.url);
        input['page-weight'] = pageWeight;
        input.options['dataReloadRatio'] = dataReloadRatio;
        //input['page-resources'] = pageResources;
        return input;
      })
    );
  }

  /**
   * Validates the input parameters of the puppeteer model.
   */
  private validateInput(input: ModelParams) {
    const schema = z
      .object({
        url: z.string(),
      })
      .refine(allDefined, {message: '`url` must be provided.'});

    return validate<z.infer<typeof schema>>(schema, input);
  }

  private async measurePageSize(url: string) {
    try {
      const browser = await puppeteer.launch();

      try {
        const page = await browser.newPage();
        const pageResources: Resource[] = [];
        page.on('response', async response => {
          const resource = {
            url: response.url(),
            size: (await response.buffer()).length,
            fromCache: response.fromCache(),
            type: response.request().resourceType(),
          };
          pageResources.push(resource);
        });

        await page.goto(url);

        const pageWeight = pageResources.reduce(
          (acc, resource) => acc + resource.size,
          0
        );
        const cacheWeight = pageResources.reduce(
          (acc, resource) => acc + (resource.fromCache ? resource.size : 0),
          0
        );
        return {
          pageWeight,
          pageResources,
          dataReloadRatio: (pageWeight - cacheWeight) / pageWeight,
        };
      } finally {
        await browser.close();
      }
    } catch (error) {
      throw new Error(
        this.errorBuilder({
          message: `Error during determination of page weight. ${error}`,
        })
      );
    }
  }
}
