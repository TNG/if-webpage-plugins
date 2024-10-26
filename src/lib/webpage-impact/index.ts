// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen
// SPDX SPDX-License-Identifier: Apache-2.0

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

import {STRINGS} from '../../config';
import {allDefined, validate} from '../../util/validations';

import {ERRORS} from '@grnsft/if-core/utils';
import {PluginFactory} from '@grnsft/if-core/interfaces';
import {ConfigParams, PluginParams} from '@grnsft/if-core/types';

const {ConfigError} = ERRORS;
const {MISSING_CONFIG} = STRINGS;

type WebpageImpactOptions = {
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

const LOGGER_PREFIX = 'WebpageImpact';

// copied from lighthouse https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/url-utils.js#L21
// because it is not exported there
const NON_NETWORK_SCHEMES = [
  'blob', // @see https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
  'data', // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
  'intent', // @see https://developer.chrome.com/docs/multidevice/android/intents/
  'file', // @see https://en.wikipedia.org/wiki/File_URI_scheme
  'filesystem', // @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystem
  'chrome-extension',
];

const ALLOWED_ENCODINGS = [
  'gzip',
  'compress',
  'deflate',
  'br',
  'zstd',
  'identity',
  '*',
] as const;

export const WebpageImpact = PluginFactory({
  metadata: {
    outputs: {
      'network/data/bytes': {
        description:
          'Weight of the webpage measured in number of bytes transferred for loading the page.',
        unit: 'bytes',
        'aggregation-method': {time: 'none', component: 'none'},
      },
      'network/data/resources/bytes': {
        description:
          'Weights of resources categories (e.g. script, stylesheet, image) measured in number of bytes transferred for loading the page.',
        unit: 'bytes',
        'aggregation-method': {time: 'none', component: 'none'},
      },
      dataReloadRatio: {
        description:
          "Percentage of data that is downloaded by returning visitors (can be used as input for CO2.JS plugin). If options.dataReloadRatio is provided as input alreadz, the plugin won't calculate it.",
        unit: 'none',
        'aggregation-method': {time: 'none', component: 'none'},
      },
      timestamp: {
        description: 'Time of the observation / webpage load.',
        unit: 'ISO date string',
        'aggregation-method': {time: 'none', component: 'none'},
      },
      duration: {
        description: 'Time that the measurement took',
        unit: 'seconds',
        'aggregation-method': {time: 'none', component: 'none'},
      },
    },
  },
  configValidation: (
    config: ConfigParams,
    _input: PluginParams | undefined
  ) => {
    const {validateConfig} = WebpageImpactUtils();

    return validateConfig(config);
  },
  implementation: async (inputs: PluginParams[], config: ConfigParams) => {
    const {measurePageImpactMetrics, writeReportToFile} = WebpageImpactUtils();

    if (inputs.length === 0) {
      inputs.push({});
    }

    return await Promise.all(
      inputs.map(async input => {
        const startTime = Date.now();

        const {
          pageWeight,
          resourceTypeWeights,
          dataReloadRatio,
          lighthouseResult,
        } = await measurePageImpactMetrics(config.url, config);

        const durationInSeconds = (Date.now() - startTime) / 1000;

        let reportPath;
        if (lighthouseResult) {
          reportPath = writeReportToFile(lighthouseResult.report, input);
        }

        return {
          ...input,
          timestamp: new Date(startTime).toISOString(),
          duration: durationInSeconds,
          url: config.url,
          'network/data/bytes': pageWeight,
          'network/data/resources/bytes': resourceTypeWeights,
          ...(lighthouseResult ? {'lighthouse-report': reportPath} : {}),
          ...(config.options || dataReloadRatio // TODO not sure it is necessary to copy input.options here in every case instead of referencing them
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
  },
});

const WebpageImpactUtils = () => {
  const measurePageImpactMetrics = async (
    url: string,
    config?: ConfigParams
  ) => {
    const computeReloadRatio = !config?.options?.dataReloadRatio;
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
        if (config?.timeout && config?.timeout >= 0) {
          page.setDefaultNavigationTimeout(config.timeout);
        }
        if (config?.mobileDevice) {
          await page.emulate(KnownDevices[config.mobileDevice as Device]);
        }
        if (config?.emulateNetworkConditions) {
          await page.emulateNetworkConditions(
            PredefinedNetworkConditions[
              config.emulateNetworkConditions as keyof typeof PredefinedNetworkConditions
            ]
          );
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
        `${LOGGER_PREFIX}: Error during measurement of webpage impact metrics: ${error}`
      );
    }
  };

  const loadPageResources = async (
    page: Page,
    url: string,
    {reload, cacheEnabled, scrollToBottom}: WebpageImpactOptions
  ) => {
    const pageResources: ResourceBase[] = [];

    const responseHandler = async (response: HTTPResponse) => {
      try {
        if (isFromNonNetworkRequest(response) || hasNoResponseBody(response)) {
          return;
        }
        const resource = {
          url: response.url(),
          resourceSize: (await response.buffer()).length,
          fromCache: response.fromCache(),
          fromServiceWorker: response.fromServiceWorker(),
          type: response.request().resourceType(),
        };
        pageResources.push(resource);
      } catch (error) {
        console.debug(
          `${LOGGER_PREFIX}: Couldn't load ${response.url()}, status: ${response.status()}: ${error}`
        );
      }
    };

    try {
      await page.setCacheEnabled(cacheEnabled);

      // the transfer size of a resource is not available from puppeteer's reponse object
      // need to take the detour via a Chrome devtools protcol session to read it out
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

      if (scrollToBottom) {
        // await page.screenshot({path: './TOP.png'});
        await page.evaluate(scrollToBottomOfPage);
        // await page.screenshot({path: './BOTTOM.png'});
      }

      page.off('response', responseHandler);
      await cdpSession.detach();

      return mergeCdpResponsesIntoResources(pageResources, cdpResponses);
    } catch (error) {
      throw new Error(
        `${LOGGER_PREFIX}: Error while loading webpage: ${error}`
      );
    }
  };

  // modified from lighthouse https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/url-utils.js
  const isFromNonNetworkRequest = (response: HTTPResponse) => {
    const url = response.request().url();
    return NON_NETWORK_SCHEMES.some(scheme => url.startsWith(`${scheme}:`));
  };

  const hasNoResponseBody = (response: HTTPResponse) => {
    return (
      response.status() === 204 || // no content
      (response.status() >= 300 && response.status() < 400) || // redirect
      response.request().method() === 'OPTIONS' // request for options https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/OPTIONS
    );
  };

  const mergeCdpResponsesIntoResources = (
    pageResources: ResourceBase[],
    cdpResponses: Map<string, {encodedDataLength: number}>
  ) => {
    return pageResources.map(resource => {
      const cdpResponse = cdpResponses.get(resource.url);
      if (!cdpResponse) {
        console.debug(
          `${LOGGER_PREFIX}: No encoded data length for resource: ${resource.url}`
        );
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
        console.warn(
          `${LOGGER_PREFIX}: Initial page load contained resources from cache.`
        );
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

      dataReloadRatio = roundToDecimalPlaces(
        (initialPageWeight - assumedCacheWeight) / initialPageWeight,
        2
      );
    }

    return {
      pageWeight: initialPageWeight,
      resourceTypeWeights,
      dataReloadRatio,
    };
  };

  const roundToDecimalPlaces = (num: number, decimalPlaces: number) => {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
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

  const validateConfig = (config: ConfigParams) => {
    if (!config || !Object.keys(config)?.length) {
      throw new ConfigError(MISSING_CONFIG);
    }

    const optionalConfigs = z.object({
      timeout: z.number().gte(0).optional(),
      mobileDevice: z.string().optional(),
      emulateNetworkConditions: z.string().optional(),
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
      options: z
        .object({
          dataReloadRatio: z.number().optional(),
        })
        .optional(),
      lighthouse: z.boolean().optional(),
    });

    const configSchema = z
      .object({
        url: z.string(),
      })
      .merge(optionalConfigs)
      .refine(allDefined, {message: '`url` must be provided.'})
      .refine(
        data => {
          return data?.mobileDevice
            ? !!KnownDevices[data.mobileDevice as Device]
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
            ? !!PredefinedNetworkConditions[
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

    return validate<z.infer<typeof configSchema>>(configSchema, config);
  };

  return {
    measurePageImpactMetrics,
    writeReportToFile,
    validateConfig,
  };
};
