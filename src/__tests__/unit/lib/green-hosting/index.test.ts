// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen <alexander.zur.bonsen@tngtech.com>
// SPDX SPDX-License-Identifier: Apache-2.0

import {GreenHosting} from '../../../../lib';
import {hosting} from '@tgwf/co2';

describe('lib/green-hosting', () => {
  describe('GreenHosting:', () => {
    describe('init green-hosting: ', () => {
      it('initializes GreenHosting with required properties', () => {
        const greenHosting = GreenHosting(undefined, {}, {});

        expect.assertions(2);

        expect(greenHosting).toHaveProperty('metadata');
        expect(greenHosting).toHaveProperty('execute');
      });
    });

    describe('execute():', () => {
      it.each([[true], [false]])(
        'outputs the correct result if green hosting is %s',
        async checkValue => {
          const inputs = [
            {
              timestamp: '2020-01-01T00:00:00Z',
              duration: 3600,
              url: 'https://example.com',
            },
          ];

          jest.spyOn(hosting, 'check').mockImplementation(() => checkValue);

          const {execute} = GreenHosting(undefined, {}, {});
          const actual_result = await execute(inputs);
          expect(actual_result).toEqual([
            {
              timestamp: '2020-01-01T00:00:00Z',
              duration: 3600,
              url: 'https://example.com',
              'green-web-host': checkValue,
            },
          ]);
        },
      );

      it('outputs undefined if the domain is not valid', async () => {
        const inputs = [
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
            url: 'https://ex%%%ample.com',
          },
        ];

        const {execute} = GreenHosting(undefined, {}, {});
        const actual_result = await execute(inputs);
        expect(actual_result).toEqual([
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
            url: 'https://ex%%%ample.com',
            'green-web-host': undefined,
          },
        ]);
      });

      it('adds timestamp and duration if both are missing', async () => {
        const timestamp = 1609459200000;
        const timestampISO = new Date(timestamp).toISOString();

        jest.spyOn(Date, 'now').mockImplementation(() => timestamp);

        const inputs = [
          {
            url: 'https://example.com',
          },
        ];

        const {execute} = GreenHosting(undefined, {}, {});
        const actual_result = await execute(inputs);
        expect(actual_result).toEqual([
          {
            timestamp: timestampISO,
            duration: 0,
            url: 'https://example.com',
            'green-web-host': false,
          },
        ]);
      });
    });
  });
});
