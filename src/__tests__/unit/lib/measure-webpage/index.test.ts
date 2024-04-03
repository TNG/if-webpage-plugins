import {MeasureWebpage} from '../../../../lib';
describe('lib/measure-webpage', () => {
  describe('MeasureWebpage:', () => {
    describe('init measure-webpage: ', () => {
      it('initializes MeasureWebpage with required properties', () => {
        const measureWebpage = MeasureWebpage();

        expect.assertions(2);

        expect(measureWebpage).toHaveProperty('metadata');
        expect(measureWebpage).toHaveProperty('execute');
      });
    });
  });
});
