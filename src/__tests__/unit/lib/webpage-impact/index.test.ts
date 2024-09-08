import http from 'http';
import express, {Express} from 'express';
import {WebpageImpact} from '../../../../lib';

describe('lib/webpage-impact', () => {
  describe('WebpageImpact:', () => {
    describe('init: ', () => {
      it('initializes WebpageImpact with required properties', () => {
        const webpageImpact = WebpageImpact();

        expect.assertions(2);

        expect(webpageImpact).toHaveProperty('metadata');
        expect(webpageImpact).toHaveProperty('execute');
      });
    });
    describe('execute: ', () => {
      let server: http.Server;
      let app: Express;

      beforeEach(() => {
        app = express();
        const port = 3000;

        const mockData1 = [
          {id: 1, name: 'Data A'},
          {id: 2, name: 'Data B'},
        ];

        const mockData2 = {
          username: 'testuser',
          email: 'test@example.com',
        };

        // Routes to simulate different requests
        app.get('/api/mockData1', (_request, response) => {
          response.json(mockData1);
        });

        app.get('/api/mockData2', (_request, response) => {
          response.json(mockData2);
        });

        app.get('/', (_request, response) => {
          response.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Mock Webpage</title>
            </head>
            <body>
              <h1>Welcome</h1>
              <script>
                fetch('/api/products')
                  .then(response => response.json())
                  .then(data => console.log('mockData1: ', data));

                fetch('/api/user')
                  .then(response => response.json())
                  .then(data => console.log('mockData2: ', data));
              </script>
            </body>
            </html>
          `);
        });

        server = http.createServer(app);
        server.listen(port, () => {
          console.log(`Mock server listening at http://localhost:${port}`);
        });
      });

      afterEach(() => {
        server.close();
      });

      // This is not an exact test. It checks for plausibility.
      // To check whether the values are plausible I checked the return values
      // for the three routes independently and also commented out the script code
      // in the html to be able to add up the three parts.
      // The total size seems plausible.
      // The split into resources is hard to judge, document seems plausible, the rest I am not sure of.
      // The dataReloadRatio is also hard to judge.
      // I did a lot of manual testing on this, comparing dev tool request sizes against results
      // from the plugin, so I am fairly confident that the values are plausible with a margin of error.
      // I also compared against other online tools, like ecograder.com, which returned similar values in my tests
      it('computes transfer sizes that seem plausible for the mock page', async () => {
        const webpageImpact = WebpageImpact();
        const inputs = [
          {
            timestamp: '2020-01-01T00:00:00Z',
            duration: 10,
            url: 'http://localhost:3000',
          },
        ];

        const {timestamp, duration, url, ...data} = (
          await webpageImpact.execute(inputs)
        )[0];

        expect(timestamp).toEqual('2020-01-01T00:00:00Z');
        expect(duration).toEqual(10);
        expect(url).toEqual('http://localhost:3000');
        expect(data['network/data/bytes']).toBeGreaterThanOrEqual(2000);
        expect(data['network/data/bytes']).toBeLessThanOrEqual(2200);
        expect(
          data['network/data/resources/bytes'].document
        ).toBeGreaterThanOrEqual(800);
        expect(
          data['network/data/resources/bytes'].document
        ).toBeLessThanOrEqual(850);
        expect(
          data['network/data/resources/bytes'].fetch
        ).toBeGreaterThanOrEqual(800);
        expect(data['network/data/resources/bytes'].fetch).toBeLessThanOrEqual(
          850
        );
        expect(data['network/data/resources/bytes'].other).toEqual(422);
        expect(data.options.dataReloadRatio).toBeGreaterThanOrEqual(0.45);
        expect(data.options.dataReloadRatio).toBeLessThanOrEqual(0.5);
      }, 10000);
    });
  });
});
