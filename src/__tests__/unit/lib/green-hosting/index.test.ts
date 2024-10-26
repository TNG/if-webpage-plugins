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
        checkValue => {
          const inputs = [
            {
              timestamp: '2020-01-01T00:00:00Z',
              duration: 3600,
              url: 'https://example.com',
            },
          ];

          jest.spyOn(hosting, 'check').mockImplementation(() => checkValue);

          const {execute} = GreenHosting(undefined, {}, {});
          expect(execute(inputs)).resolves.toEqual([
            {
              timestamp: '2020-01-01T00:00:00Z',
              duration: 3600,
              url: 'https://example.com',
              'green-web-host': checkValue,
            },
          ]);
        }
      );

      it('outputs undefined if the domain is not valid', () => {
        const inputs = [
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
            url: 'https://ex%%%ample.com',
          },
        ];

        const {execute} = GreenHosting(undefined, {}, {});
        expect(execute(inputs)).resolves.toEqual([
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 3600,
            url: 'https://ex%%%ample.com',
            'green-web-host': undefined,
          },
        ]);
      });

      it('adds timestamp and duration if both are missing', () => {
        const timestamp = 1609459200000;
        const timestampISO = new Date(timestamp).toISOString();

        jest.spyOn(Date, 'now').mockImplementation(() => timestamp);

        const inputs = [
          {
            url: 'https://ex%%%ample.com',
          },
        ];

        const {execute} = GreenHosting(undefined, {}, {});
        expect(execute(inputs)).resolves.toEqual([
          {
            timestamp: timestampISO,
            duration: 0,
            url: 'https://ex%%%ample.com',
            'green-web-host': undefined,
          },
        ]);
      });
    });
  });
});
