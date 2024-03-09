import puppeteer, {
  HTTPResponse,
  KnownDevices,
  Page,
  ResourceType,
} from 'puppeteer';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations.js';

import {buildErrorMessage} from '../../util/helpers.js';
import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types/common';

type Resource = {
  url: string;
  size: number;
  type: ResourceType;
  fromCache: boolean;
};

type Device = keyof typeof KnownDevices;

// TODO dataReloadRation doesn't work... Not sure what I am doing wrong.
// TODO Cookies?
// TODO manipulate timestamp?
// TODO Page.setJavaScriptEnabled() method
export const MeasureWebpage = (
  globalConfig?: ConfigParams
): PluginInterface => {
  const errorBuilder = buildErrorMessage(MeasureWebpage.name);
  const metadata = {
    kind: 'execute',
  };

  /**
   * Executes the measure webpage model for given inputs.
   */
  const execute = async (
    inputs: PluginParams[],
    config?: ConfigParams
  ): Promise<PluginParams[]> => {
    const mergedValidatedConfig = Object.assign(
      {},
      validateGlobalConfig(),
      validateConfig(config)
    );
    console.log('VALIDATED CONFIG: ', validateConfig(config));
    return await Promise.all(
      inputs.map(async input => {
        const validInput = Object.assign(input, validateSingleInput(input));
        const {pageWeight, resourceTypeWeights, dataReloadRatio} =
          await measurePageWithReloadRatio(
            validInput.url,
            mergedValidatedConfig
          );

        return {
          ...input,
          'network/data/bytes': pageWeight,
          'network/data/resources/bytes': resourceTypeWeights,
          options: {
            ...input.options,
            dataReloadRatio: dataReloadRatio,
          },
        };
      })
    );
  };

  const measurePageWithReloadRatio = async (
    url: string,
    config?: ConfigParams
  ) => {
    try {
      const browser = await puppeteer.launch();

      try {
        const page = await browser.newPage();
        if (config?.timeout) {
          page.setDefaultNavigationTimeout(config.timeout);
        }
        if (config?.mobileDevice) {
          await page.emulate(KnownDevices[config.mobileDevice as Device]);
        }
        await page.setRequestInterception(true);

        page.on('request', interceptedRequest => {
          const headers = Object.assign({}, interceptedRequest.headers(), {
            'cache-control': 'no-cache', // force loading from server to get most recent state
            pragma: 'no-cache',
            ...(config?.headers?.accept && {
              accept: `${config.headers.accept}`,
            }),
            ...(config?.headers['accept-encoding'] && {
              'accept-encoding': `${
                Array.isArray(config.headers['accept-encoding'])
                  ? config.headers['accept-encoding'].join(', ')
                  : config.headers['accept-encoding']
              }`,
            }),
          });
          interceptedRequest.continue({headers});
        });

        const {
          pageWeight: pageWeightInitial,
          resourceTypeWeights: resourceTypeWeightsInitial,
          cacheWeight: cacheWeightInitial,
        } = await measurePage(page, url, {
          reload: false,
          cacheEnabled: false,
          scrollToBottom: config?.scrollToBottom,
        });

        const {pageWeight: pageWeightReload, cacheWeight: cacheWeightReload} =
          await measurePage(page, url, {
            reload: true,
            cacheEnabled: true,
            scrollToBottom: config?.scrollToBottom,
          });
        console.log('cacheWeightInitial: ', cacheWeightInitial);
        console.log('cacheWeightReload: ', cacheWeightReload);

        const dataReloadRatio =
          (pageWeightReload - cacheWeightReload) / pageWeightReload;
        if (cacheWeightInitial > 0) {
          console.warn('Initial page load contained resources from cache.');
        }
        return {
          pageWeight: pageWeightInitial,
          resourceTypeWeights: resourceTypeWeightsInitial,
          dataReloadRatio,
        };
      } finally {
        await browser.close();
      }
    } catch (error) {
      throw new Error(
        errorBuilder({
          message: `Error during measurement of webpage: ${error}`,
        })
      );
    }
  };

  const measurePage = async (
    page: Page,
    url: string,
    {
      reload,
      cacheEnabled,
      scrollToBottom,
    }: {reload: boolean; cacheEnabled: boolean; scrollToBottom?: boolean}
  ) => {
    try {
      await page.setCacheEnabled(cacheEnabled);
      const pageResources: Resource[] = [];

      page.on('response', async (response: HTTPResponse) => {
        try {
          // attempt to handle errors of possible preflight requests
          // example www.tagesschau.de
          // ProtocolError: Could not load body for this request. This might happen if the request is a preflight request.
          if (
            response.status() !== 204 &&
            response.status() !== 304 &&
            response.request().method() !== 'OPTIONS'
          ) {
            const resource = {
              url: response.url(),
              size: (await response.buffer()).length,
              fromCache: response.fromCache(),
              type: response.request().resourceType(),
            };
            pageResources.push(resource);
          }
        } catch (error) {
          console.error(
            `MeasureWebpage: Error accessing response body: ${error}`
          );
        }
      });

      if (!reload) {
        await page.goto(url, {waitUntil: 'networkidle0'});
      } else {
        await page.reload({waitUntil: 'networkidle0'});
      }

      if (scrollToBottom) {
        // await page.screenshot({path: './TOP.png'});
        await page.evaluate(async () => {
          await new Promise<void>(resolve => {
            let totalHeight = 0;
            const distance = 100; // Distance to scroll each time
            const timer = setInterval(() => {
              // attempted to load dom lib only locally, but doesn't work yet -> activated globally
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                resolve();
              }
            }, 100);
          });
        });
        // await page.screenshot({path: './BOTTOM.png'});
      }

      const resourceTypeWeights = pageResources.reduce(
        (acc, resource) => {
          if (resource.type in acc) {
            acc[resource.type] += resource.size;
          } else {
            acc[resource.type] = resource.size;
          }
          return acc;
        },
        {} as Record<ResourceType, number>
      );
      const pageWeight = Object.values(resourceTypeWeights).reduce(
        (acc, resourceTypeSize) => acc + resourceTypeSize,
        0
      );
      const cacheWeight = pageResources.reduce(
        (acc, resource) => acc + (resource.fromCache ? resource.size : 0),
        0
      );

      return {
        pageWeight,
        resourceTypeWeights,
        cacheWeight,
      };
    } catch (error) {
      throw new Error(
        errorBuilder({
          message: `Error during measurement of webpage: ${error}`,
        })
      );
    }
  };

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
  };

  const ALLOWED_ENCODINGS = [
    'gzip',
    'compress',
    'deflate',
    'br',
    'zstd',
    'identity',
    '*',
  ] as const;
  const configSchema = z
    .object({
      timeout: z.number().gte(0).optional(),
      mobileDevice: z.string().optional(),
      scrollToBottom: z.boolean().optional(),
      headers: z
        .object({
          accept: z.string().optional(),
          'accept-encoding': z
            .array(z.enum(ALLOWED_ENCODINGS))
            .or(z.string(z.enum(ALLOWED_ENCODINGS)))
            .optional(),
        })
        .optional(),
    })
    .optional()
    .refine(
      data => {
        if (data?.mobileDevice) {
          return KnownDevices[data?.mobileDevice as Device];
        }
        return true;
      },
      {
        message: `Mobile device must be one of: ${Object.keys(
          KnownDevices
        ).join(', ')}.`,
      }
    );

  /**
   * Validates config parameters.
   */
  const validateConfig = (config?: ConfigParams) => {
    return validate<z.infer<typeof configSchema>>(configSchema, config);
  };

  /**
   * Validates Global config parameters.
   */
  const validateGlobalConfig = () => {
    return validate<z.infer<typeof configSchema>>(
      configSchema,
      globalConfig || {}
    );
  };

  return {
    metadata,
    execute,
  };
};
