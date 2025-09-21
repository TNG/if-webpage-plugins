// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen <alexander.zur.bonsen@tngtech.com>
// SPDX SPDX-License-Identifier: Apache-2.0

import puppeteer, {
  HTTPRequest,
  KnownDevices,
  Page,
  PredefinedNetworkConditions,
  Protocol,
  TimeoutError,
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
  status: number;
  type: Protocol.Network.ResourceType;
};

type Resource = ResourceBase & {transferSize: number};

type Device = keyof typeof KnownDevices;

const LOGGER_PREFIX = 'WebpageImpact';

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _input: PluginParams | undefined,
  ) => {
    const {validateConfig} = WebpageImpactUtils();

    return validateConfig(config);
  },
  implementation: async (inputs: PluginParams[], config: ConfigParams) => {
    const {measurePageImpactMetrics} = WebpageImpactUtils();

    if (inputs.length === 0) {
      inputs.push({});
    }

    return await Promise.all(
      inputs.map(async input => {
        const startTime = Date.now();

        const {pageWeight, resourceTypeWeights, dataReloadRatio} =
          await measurePageImpactMetrics(config.url, config);

        const durationInSeconds = (Date.now() - startTime) / 1000;

        return {
          ...input,
          timestamp: new Date(startTime).toISOString(),
          duration: durationInSeconds,
          url: config.url,
          'network/data/bytes': pageWeight,
          'network/data/resources/bytes': resourceTypeWeights,
          ...(config.computeReloadRatio && dataReloadRatio
            ? {
                options: {
                  ...input.options,
                  dataReloadRatio,
                },
              }
            : {}),
        };
      }),
    );
  },
});

const WebpageImpactUtils = () => {
  const DEFAULT_VIEWPORT_WIDTH = 1440;
  const DEFAULT_VIEWPORT_HEIGHT = 900;

  const measurePageImpactMetrics = async (
    url: string,
    config?: ConfigParams,
  ) => {
    const requestHandler = async (interceptedRequest: HTTPRequest) => {
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
      await interceptedRequest.continue({headers});
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
            ],
          );
        } else {
          // set viewport to a reasonable size for laptops. I hope that is a sensible default.
          await page.setViewport({
            width: DEFAULT_VIEWPORT_WIDTH,
            height: DEFAULT_VIEWPORT_HEIGHT,
          });
        }

        await page.setRequestInterception(true);
        page.on('request', requestHandler);

        const initialResources = await loadPageResources(page, url, {
          reload: false,
          cacheEnabled: false,
          scrollToBottom: config?.scrollToBottom,
        });

        let reloadedResources: Resource[] | undefined;
        if (config?.computeReloadRatio) {
          reloadedResources = await loadPageResources(page, url, {
            reload: true,
            cacheEnabled: true,
            scrollToBottom: config?.scrollToBottom,
          });
        }

        return {
          ...computeMetrics(initialResources, reloadedResources),
        };
      } finally {
        await browser.close();
      }
    } catch (error) {
      throw new Error(
        `${LOGGER_PREFIX}: Error during measurement of webpage impact metrics: ${error}`,
      );
    }
  };

  const loadPageResources = async (
    page: Page,
    url: string,
    {reload, cacheEnabled, scrollToBottom}: WebpageImpactOptions,
  ): Promise<Resource[]> => {
    try {
      await page.setCacheEnabled(cacheEnabled);

      // The transfer size of a resource is not available from puppeteer's reponse object.
      // Need to take the detour via a Chrome devtools protcol session to get it.
      // https://chromedevtools.github.io/devtools-protocol/tot/Network/
      const cdpResponses: Record<string, ResourceBase> = {};
      const cdpTransferSizes: Record<string, {transferSize: number}> = {};
      const cdpSession = await page.createCDPSession();
      await cdpSession.send('Network.enable');
      cdpSession.on('Network.responseReceived', event => {
        cdpResponses[event.requestId] = {
          url: event.response.url,
          status: event.response.status,
          type: event.type,
        };
      });
      // Transfer size
      // 1) Response served from web
      // Network.responseReceived event only contains the number of bytes received for
      // the request so far / when the initial response is received.
      // The final number can is sent with Network.loadingFinished.
      //
      // 2) Response served from cache
      // If the resource is served from cache, Network.responseReceived contains the
      // size of the cached response, while Network.loadingFinished reports size of 0.
      cdpSession.on('Network.loadingFinished', event => {
        cdpTransferSizes[event.requestId] = {
          transferSize: event.encodedDataLength,
        };
      });

      // TODO: Currently, the amount of cached resources is determined by
      // relying on `encodedDataLength` of the `Network.loadingFinished` event.
      // It is 0 if the response was served from cache, which corresponds to
      // `Network.requestServedFromCache` being true.
      // Potentially this can be improved to excluded prefetched responses.
      //
      // Furter Notes:
      // I haven't found good documentation about this event yet, but I assume it also includes prefetch cache
      // which I would want to exclude ideally, because it does not reuse data.
      // Network.responseReceived event contains two values,
      // fromDiskCache and fromPrefetchCache, that allow to derive
      // if an item was served from cache. But that misses memory cache.
      // (There is also fromServiceWorker, but I don't think that allows a conclusion about caching,
      // depends on what the service worker does.)

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

      await cdpSession.detach();

      return mergeCdpData(cdpResponses, cdpTransferSizes);
    } catch (error) {
      throw new Error(
        `${LOGGER_PREFIX}: Error while loading webpage: ${error}`,
      );
    }
  };

  const mergeCdpData = (
    cdpResponses: Record<string, ResourceBase>,
    cdpTransferSizes: Record<string, {transferSize: number}>,
  ): Resource[] => {
    const pageResources: Resource[] = [];
    for (const [requestId, response] of Object.entries(cdpResponses)) {
      const transferSize = cdpTransferSizes[requestId]?.transferSize;
      if (transferSize === undefined) {
        console.debug(
          `${LOGGER_PREFIX}: No transfer size found for resource ${response.url}, status: ${response.status}`,
        );
      }
      pageResources.push({
        ...response,
        transferSize: transferSize ?? 0,
      });
    }
    return pageResources;
  };

  const scrollToBottomOfPage = async () => {
    await new Promise<void>((resolve, reject) => {
      const SCROLL_DISTANCE = 100;
      const SCROLL_INTERVAL_MS = 100;
      const SCROLL_TIMEOUT_MS = 30000;

      let totalHeight = 0;
      const distance = SCROLL_DISTANCE;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, SCROLL_INTERVAL_MS);

      setTimeout(() => {
        clearInterval(timer);
        reject(
          new TimeoutError(
            `${LOGGER_PREFIX}: Scrolling to bottom of page timed out after ${SCROLL_TIMEOUT_MS / 1000} seconds.`,
          ),
        );
      }, SCROLL_TIMEOUT_MS);
    });
  };

  const computeMetrics = (
    initialResources: Resource[],
    reloadResources: Resource[] | undefined,
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
      {} as Record<Protocol.Network.ResourceType, number>,
    );
    const initialPageWeight = Object.values(resourceTypeWeights).reduce(
      (acc, resourceTypeSize) => acc + resourceTypeSize,
      0,
    );

    // dataReloadRatio: this is an attempt to get a heuristic value

    // Caveats:
    // 1) the older pre-fetch syntax (<link rel="prefetch">) stored
    //    responses in disk cache as well (https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules)
    // 2) dynamic content loading, see README
    let dataReloadRatio: number | undefined;
    if (reloadResources !== undefined) {
      const reloadPageWeight = reloadResources.reduce(
        (acc, resource) => acc + resource.transferSize,
        0,
      );

      const fromCache = initialPageWeight - reloadPageWeight;

      dataReloadRatio = roundToDecimalPlaces(
        (initialPageWeight - fromCache) / initialPageWeight,
        2,
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

  const validateConfig = (config: ConfigParams) => {
    if (!config || !Object.keys(config)?.length) {
      throw new ConfigError(MISSING_CONFIG);
    }

    const optionalConfigs = z.object({
      computeReloadRatio: z.boolean().optional(),
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
            KnownDevices,
          ).join(', ')}.`,
        },
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
            PredefinedNetworkConditions,
          ).join(', ')}.`,
        },
      );

    return validate<z.infer<typeof configSchema>>(configSchema, config);
  };

  return {
    measurePageImpactMetrics,
    validateConfig,
  };
};
