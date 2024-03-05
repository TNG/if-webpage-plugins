import puppeteer, {HTTPResponse, ResourceType} from 'puppeteer';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations.js';

import {buildErrorMessage} from '../../util/helpers.js';
import {PluginInterface} from "../../interfaces";
import {PluginParams} from "../../types/common";

type Resource = {
  url: string;
  size: number;
  type: ResourceType;
  fromCache: boolean;
};

export const MeasureWebpage = (): PluginInterface => {
  const errorBuilder = buildErrorMessage(MeasureWebpage.name);
  const metadata = {
    kind: 'execute',
  };

  /**
   * Executes the puppeteer model for given url.
   */
  const execute = async (inputs: PluginParams[]): Promise<PluginParams[]> => {
    return await Promise.all(
      inputs.map(async input => {
        const validInput = Object.assign(input, validateSingleInput(input));
        const {pageWeight, dataReloadRatio} = await measurePageSize(validInput.url);
        input['bytes'] = pageWeight;
        input.options['dataReloadRatio'] = dataReloadRatio;
        //input['page-resources'] = pageResources;
        return input;
      })
    );
  }

  /**
   * Validates the input parameters of the puppeteer model.
   */
  const validateSingleInput = (input: PluginParams) => {
    const schema = z
      .object({
        url: z.string(),
      })
      .refine(allDefined, {message: '`url` must be provided.'});

    return validate<z.infer<typeof schema>>(schema, input);
  }

  const measurePageSize = async (url: string) => {
    try {
      const browser = await puppeteer.launch();

      try {
        const page = await browser.newPage();
        const pageResources: Resource[] = [];
        page.on('response', async (response: HTTPResponse) => {
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
        // TODO setTimeout or a better solution
        await browser.close();
      }
    } catch (error) {
      throw new Error(
        errorBuilder({
          message: `Error during determination of page weight. ${error}`,
        })
      );
    }
  }

  return {
    metadata,
    execute,
  }
}
