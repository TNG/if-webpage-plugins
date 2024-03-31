// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen
// SPDX SPDX-License-Identifier: MIT

// for parts marked as originating from Lighthouse:
// SPDX-FileCopyrightText: 2016 Google LLC
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import lighthouse from 'lighthouse/core/index.cjs';
import puppeteer, {
  HTTPRequest,
  HTTPResponse,
  KnownDevices,
  Page,
  PredefinedNetworkConditions,
  ResourceType,
} from 'puppeteer';
import {z} from 'zod';

import {allDefined, validate} from '../../util/validations';

import {buildErrorMessage} from '../../util/helpers';
import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types/common';

type MeasurePageOptions = {
  reload: boolean;
  cacheEnabled: boolean;
  scrollToBottom?: boolean;
};

type ResourceBase = {
  url: string;
  resourceSize: number;
  type: ResourceType;
  fromCache: boolean;
  fromServiceWorker: boolean;
};

type Resource = ResourceBase & {transferSize: number};

type Device = keyof typeof KnownDevices;

// copied from lighthouse https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/url-utils.js#L21
const NON_NETWORK_SCHEMES = [
  'blob', // @see https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
  'data', // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
  'intent', // @see https://developer.chrome.com/docs/multidevice/android/intents/
  'file', // @see https://en.wikipedia.org/wiki/File_URI_scheme
  'filesystem', // @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystem
  'chrome-extension',
];

export const MeasureWebpage = (
  globalConfig?: ConfigParams
): PluginInterface => {
  const errorBuilder = buildErrorMessage(MeasureWebpage.name);
  const metadata = {
    kind: 'execute',
    version: '0.1.0',
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

    return await Promise.all(
      inputs.map(async input => {
        const validatedInput = Object.assign(input, validateSingleInput(input));
        const {
          pageWeight,
          resourceTypeWeights,
          dataReloadRatio,
          lighthouseResult,
        } = await measurePage(
          validatedInput.url,
          !mergedValidatedConfig?.options?.dataReloadRatio,
          mergedValidatedConfig
        );

        let reportPath;
        if (lighthouseResult) {
          reportPath = writeReportToFile(
            lighthouseResult.report,
            validatedInput
          );
        }

        console.log(
          'LIGHTHOUSE AND PUPPETEER WEIGHT: ',
          lighthouseResult?.lhr.audits['total-byte-weight'].numericValue,
          ' ',
          pageWeight
        );

        return {
          ...input,
          'network/data/bytes': pageWeight,
          'network/data/resources/bytes': resourceTypeWeights,
          ...(lighthouseResult ? {'lighthouse-report': reportPath} : {}),
          ...(input.options || dataReloadRatio
            ? {
                options: {
                  ...input.options,
                  dataReloadRatio,
                },
              }
            : {}),
        };
      })
    );
  };

  const measurePage = async (
    url: string,
    computeReloadRatio: boolean,
    config?: ConfigParams
  ) => {
    const requestHandler = (interceptedRequest: HTTPRequest) => {
      const headers = Object.assign({}, interceptedRequest.headers(), {
        ...(config?.headers?.accept && {
          accept: `${config.headers.accept}`,
        }),
        ...(config?.headers?.['accept-encoding'] && {
          'accept-encoding': `${
            Array.isArray(config.headers['accept-encoding'])
              ? config.headers['accept-encoding'].join(', ')
              : config.headers['accept-encoding']
          }`,
        }),
      });
      interceptedRequest.continue({headers});
    };

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
        if (config?.emulateNetworkConditions) {
          await page.emulateNetworkConditions(config.emulateNetworkConditions);
        }
        if (config?.switchOffJavaScript) {
          await page.setJavaScriptEnabled(false);
        }

        await page.setRequestInterception(true);
        page.on('request', requestHandler);

        const initialResources = await loadPageResources(page, url, {
          reload: false,
          cacheEnabled: false,
          scrollToBottom: config?.scrollToBottom,
        });

        const reloadedResources = await loadPageResources(page, url, {
          reload: true,
          cacheEnabled: true,
          scrollToBottom: config?.scrollToBottom,
        });

        let lighthouseResult;
        if (config?.lighthouse) {
          lighthouseResult = await lighthouse(
            url,
            {
              output: 'html',
              logLevel: 'info',
            },
            undefined,
            page
          );
        }

        return {
          ...computeMetrics(
            initialResources,
            reloadedResources,
            computeReloadRatio
          ),
          lighthouseResult,
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

  const loadPageResources = async (
    page: Page,
    url: string,
    {reload, cacheEnabled, scrollToBottom}: MeasurePageOptions
  ) => {
    const pageResources: ResourceBase[] = [];

    const responseHandler = async (response: HTTPResponse) => {
      try {
        if (isNonNetworkRequest(response)) {
          return;
        }

        const resource: ResourceBase = {
          url: response.url(),
          resourceSize: (await response.buffer()).length,
          fromCache: response.fromCache(),
          fromServiceWorker: response.fromServiceWorker(),
          type: response.request().resourceType(),
        };
        pageResources.push(resource);
      } catch (error) {
        console.error(
          `MeasureWebpage: Error accessing response body: ${error}`
        );
      }
    };

    try {
      await page.setCacheEnabled(cacheEnabled);

      const cdpIntermediateStore = new Map<string, {url: string}>();
      const cdpResponses = new Map<string, {encodedDataLength: number}>();
      const cdpSession = await page.createCDPSession();
      await cdpSession.send('Network.enable');
      cdpSession.on('Network.responseReceived', event => {
        cdpIntermediateStore.set(event.requestId, {url: event.response.url});
      });
      cdpSession.on('Network.loadingFinished', event => {
        const response = cdpIntermediateStore.get(event.requestId);
        response &&
          cdpResponses.set(response.url, {
            encodedDataLength: event.encodedDataLength,
          });
      });

      page.on('response', responseHandler);

      if (!reload) {
        await page.goto(url, {waitUntil: 'networkidle0'});
      } else {
        await page.reload({waitUntil: 'networkidle0'});
      }

      page.off('response', responseHandler);

      if (scrollToBottom) {
        // await page.screenshot({path: './TOP.png'});
        await page.evaluate(scrollToBottomOfPage);
        // await page.screenshot({path: './BOTTOM.png'});
      }

      return mergeCdpResponsesIntoResources(pageResources, cdpResponses);
    } catch (error) {
      throw new Error(
        errorBuilder({
          message: `Error during measurement of webpage: ${error}`,
        })
      );
    }
  };

  const mergeCdpResponsesIntoResources = (
    pageResources: ResourceBase[],
    cdpResponses: Map<string, {encodedDataLength: number}>
  ) => {
    return pageResources.map(resource => {
      const cdpResponse = cdpResponses.get(resource.url);
      if (!cdpResponse) {
        console.warn('No encoded data length for resource: ', resource.url);
      }
      return cdpResponse
        ? ({
            ...resource,
            transferSize: cdpResponse.encodedDataLength,
          } as Resource)
        : ({
            ...resource,
            transferSize: 0,
          } as Resource);
    });
  };

  // modified from lighthouse https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/url-utils.js
  const isNonNetworkRequest = (response: HTTPResponse) => {
    const url = response.request().url();
    return NON_NETWORK_SCHEMES.some(scheme => url.startsWith(`${scheme}:`));
  };

  const scrollToBottomOfPage = async () => {
    await new Promise<void>(resolve => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  };

  const computeMetrics = (
    initialResources: Resource[],
    reloadResources: Resource[],
    computeReloadRatio: boolean
  ) => {
    const resourceTypeWeights = initialResources.reduce(
      (acc, resource) => {
        if (resource.type in acc) {
          acc[resource.type] += resource.transferSize;
        } else {
          acc[resource.type] = resource.transferSize;
        }
        return acc;
      },
      {} as Record<ResourceType, number>
    );
    const initialPageWeight = Object.values(resourceTypeWeights).reduce(
      (acc, resourceTypeSize) => acc + resourceTypeSize,
      0
    );

    let dataReloadRatio: number | undefined;
    if (computeReloadRatio) {
      const initialCacheWeight = initialResources.reduce(
        (acc, resource) =>
          acc + (resource.fromCache ? resource.transferSize : 0),
        0
      );
      if (initialCacheWeight > 0) {
        console.warn('Initial page load contained resources from cache.');
      }
      const reloadPageWeight = reloadResources.reduce(
        (acc, resource) => acc + resource.transferSize,
        0
      );

      const assumeFromCache = initialPageWeight - reloadPageWeight;
      const browserCache = reloadResources.reduce(
        (acc, resource) =>
          acc + (resource.fromCache ? resource.transferSize : 0),
        0
      );
      const assumedCacheWeight = assumeFromCache + browserCache;

      dataReloadRatio =
        (initialPageWeight - assumedCacheWeight) / initialPageWeight;
    }

    return {
      pageWeight: initialPageWeight,
      resourceTypeWeights,
      dataReloadRatio,
    };
  };

  const writeReportToFile = (
    lighthouseReport: string | string[],
    validatedInput: PluginParams
  ): string => {
    const timestamp = validatedInput['timer/start']
      ? validatedInput['timer/start']
      : validatedInput.timestamp;
    const unescapedFileName = `lighthouse-report-${validatedInput.url}-${timestamp}.html`;

    const fileName = getEscapedFileName(unescapedFileName);
    fs.writeFileSync(
      fileName,
      Array.isArray(lighthouseReport)
        ? lighthouseReport.join(' ')
        : lighthouseReport,
      'utf8'
    );
    return fileName;
  };

  const getEscapedFileName = (url: string): string => {
    return url.replace(/[/\\?%*:|"<>]/g, '_');
  };

  /**
   * Validates input parameters.
   */
  const validateSingleInput = (input: PluginParams) => {
    const schema = z
      .object({
        url: z.string(),
        'timer/start': z.string().datetime().optional(),
        timestamp: z.string().datetime().optional(),
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
      emulateNetworkConditions: z.string().optional(),
      scrollToBottom: z.boolean().optional(),
      switchOffJavaScript: z.boolean().optional(),
      headers: z
        .object({
          accept: z.string().optional(),
          'accept-encoding': z
            .array(z.enum(ALLOWED_ENCODINGS))
            .or(z.string(z.enum(ALLOWED_ENCODINGS)))
            .optional(),
        })
        .optional(),
      options: z
        .object({
          dataReloadRatio: z.number().optional(),
        })
        .optional(),
      lighthouse: z.boolean().optional(),
    })
    .optional()
    .refine(
      data => {
        return data?.mobileDevice
          ? KnownDevices[data.mobileDevice as Device]
          : true;
      },
      {
        message: `Mobile device must be one of: ${Object.keys(
          KnownDevices
        ).join(', ')}.`,
      }
    )
    .refine(
      data => {
        return data?.emulateNetworkConditions
          ? PredefinedNetworkConditions[
              data.emulateNetworkConditions as keyof typeof PredefinedNetworkConditions
            ]
          : true;
      },
      {
        message: `Network condition must be one of: ${Object.keys(
          PredefinedNetworkConditions
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
