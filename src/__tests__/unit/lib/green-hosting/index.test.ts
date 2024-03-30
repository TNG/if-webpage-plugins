import {GreenHosting} from '../../../../lib';

describe('lib/green-hosting', () => {
  describe('GreenHosting:', () => {
    describe('init green-hosting: ', () => {
      it('', () => {
        const greenHosting = GreenHosting();

        expect.assertions(2);

        expect(greenHosting).toHaveProperty('metadata');
        expect(greenHosting).toHaveProperty('execute');
      });
    });

    describe('execute():', () => {});
  });
});
