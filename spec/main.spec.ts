import { VirtualContent } from '../src/main';

const chunkLength = 10240;

type VC = {
  [K in keyof VirtualContent]: VirtualContent[K];
} & {
  chunks: VirtualContent['chunks'];
  el: VirtualContent['el'];
  scrollableEl: VirtualContent['scrollableEl'];
  splitString: VirtualContent['splitString'];
};

describe('Virtual Content JS', function () {
  let vc: VC;

  beforeEach(function () {
    vc = (VirtualContent.create({
      chunkSize: chunkLength,
    }) as unknown) as VC;
  });

  describe('Static methods:', function () {
    it('.create() works', function () {
      expect((vc as any) instanceof VirtualContent).toBe(true);
    });
  });

  describe('Public methods:', function () {
    it('.setText() accepts String', function () {
      const TEXT = 'Text content';

      vc.setText(TEXT);
      expect(vc.chunks.join('')).toBe(TEXT);
    });

    it('.setText() accepts Number', function () {
      const NUMBER = 9999;

      vc.setText(NUMBER as any);
      expect(vc.chunks.join('')).toBe(`${NUMBER}`);
    });

    it('.setText() accepts undefined, null or NaN as an empty string', function () {
      vc.setText(undefined);
      expect(vc.chunks.join('')).toBe('');

      vc.setText(null);
      expect(vc.chunks.join('')).toBe('');

      vc.setText(NaN as any);
      expect(vc.chunks.join('')).toBe('');
    });

    it('.setText() throws when Object or Array are passed', function () {
      let passObject = function () {
        vc.setText({} as any);
      };
      let passArray = function () {
        vc.setText([] as any);
      };

      expect(passObject).toThrow();
      expect(passArray).toThrow();
    });

    it('.setText() returns self', function () {
      expect(vc.setText()).toBe(vc);
    });

    it('.setHtml() accepts String', function () {
      const TEXT = 'Text content';

      vc.setHtml(TEXT);
      expect(vc.chunks.join('')).toBe(TEXT);
    });

    it('.setHtml() accepts Number', function () {
      const NUMBER = 9999;

      vc.setHtml(NUMBER as any);
      expect(vc.chunks.join('')).toBe(`${NUMBER}`);
    });

    it('.setHtml() accepts undefined, null or NaN as an empty string', function () {
      vc.setHtml(undefined);
      expect(vc.chunks.join('')).toBe('');

      vc.setHtml(null);
      expect(vc.chunks.join('')).toBe('');

      vc.setHtml(NaN as any);
      expect(vc.chunks.join('')).toBe('');
    });

    it('.setHtml() throws when Object or Array are passed', function () {
      let passObject = function () {
        vc.setHtml({} as any);
      };
      let passArray = function () {
        vc.setHtml([] as any);
      };

      expect(passObject).toThrow();
      expect(passArray).toThrow();
    });

    it('.setHtml() returns self', function () {
      expect(vc.setHtml()).toBe(vc);
    });

    it('.isHtmlContent() works', function () {
      vc.setText('');
      expect(vc.isHtmlContent()).toBe(false);

      vc.setHtml('');
      expect(vc.isHtmlContent()).toBe(true);
    });

    it('.renderTo() works', function () {
      const TEXT = 'Text content';
      let el = document.createElement('div');

      vc.setText(TEXT);
      vc.renderTo(el);

      expect(vc.el.parentNode).toBe(el);
      expect(el.textContent).toContain(TEXT);
    });

    it('.renderTo() accepts DOM Element or jQueryEl', function () {
      let el = document.createElement('div');
      let $el = {
        0: document.createElement('div'),
        length: 1,
        jquery: '2.1.1',
      };

      vc.setText('text');

      vc.renderTo(el);
      expect(vc.el.parentNode).toBe(el);

      vc.renderTo($el);
      expect(vc.el.parentNode).toBe($el[0]);
    });

    it('.renderTo() throws with unsupported argument', function () {
      function failOnNull() {
        vc.renderTo(null);
      }

      function failOnUndefined() {
        vc.renderTo(undefined);
      }

      function failOnObject() {
        vc.renderTo({ 0: 'some data' });
      }

      expect(failOnNull).toThrow();
      expect(failOnUndefined).toThrow();
      expect(failOnObject).toThrow();
    });

    it('.renderTo() returns self', function () {
      expect(vc.renderTo(document.createElement('div'))).toBe(vc);
    });

    it('.destroy() works', function () {
      let el = document.createElement('div');

      vc.setText('random').renderTo(el);

      vc.destroy();

      expect(vc.scrollableEl).toBe(null);
      expect(vc.el.parentNode).toBe(null);
      expect(
        VirtualContent.instances.indexOf((vc as unknown) as VirtualContent),
      ).toBe(-1);
      expect(el.children.length).toBe(0);
    });
  });

  describe('Private methods:', function () {
    it('._splitString(str, chunkSize) works', function () {
      const length = 9999;
      const chunkSize = 100;
      let str = Array(9999).fill('s').join('');
      let chunks = vc.splitString(str, chunkSize);

      expect(chunks.length).toBe(Math.ceil(length / chunkSize));
      expect(
        chunks.every(function (chunk) {
          return chunk.length <= chunkSize;
        }),
      ).toBe(true);
    });
  });

  describe('Parsing HTML', () => {
    it('.setHtml does not break single tag apart', () => {
      /**
       * Html string that should not be split
       */
      const htmlString = '<a href="/some/url" class="html string"></a>';

      /**
       * String of chunk size - 1/2 htmlString length
       */
      const chunkString = new Array(
        chunkLength - Math.ceil(htmlString.length / 2),
      )
        .fill(null)
        .map((_) => '_')
        .join('');

      /**
       * This is the html string to be processed (2 chunks length)
       */
      const content = `${chunkString}${htmlString}${chunkString}`;

      /**
       * String + html + string - 2 chunks with html between
       */
      vc.setHtml(content);

      /**
       * Check that test was written correctly
       */
      expect(vc.chunks.length).toBe(2);

      /**
       * Check that we have html string split correctly
       */
      expect(
        vc.chunks[0].includes(htmlString) || vc.chunks[1].includes(htmlString),
      ).toBeTruthy();

      /**
       * Check that split was done correct and we have same content
       */
      expect(vc.chunks.join('')).toBe(content);
    });

    it('.setHtml does not break single tag apart (shift value to the next tag)', () => {
      /**
       * Html string that should not be split
       */
      const htmlString = '<a href="/some/url" class="html string"></a>';

      /**
       * String of chunk size - 1/2 htmlString length
       */
      const chunkString = new Array(
        chunkLength - Math.ceil(htmlString.length / 2),
      )
        .fill(null)
        .map((_) => '_')
        .join('');

      /**
       * This is the html string to be processed (2 chunks length)
       */
      const content = `${chunkString}---${htmlString}${chunkString}`;

      /**
       * String + html + string - 2 chunks with html between
       */
      vc.setHtml(content);

      /**
       * Check that we have html string split correctly
       */
      expect(
        vc.chunks[0].includes(htmlString) || vc.chunks[1].includes(htmlString),
      ).toBeTruthy();

      /**
       * Check that split was done correct and we have same content
       */
      expect(vc.chunks.join('')).toBe(content);
    });
  });
});
