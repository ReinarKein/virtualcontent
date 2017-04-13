require("babel-polyfill");

describe("Virtual Content JS", function () {
  var VC = require("../src/virtual_content.js");
  var vc;

  beforeEach(function() {
    vc = VC.create();
  });

  describe("Static methods:", function () {
    it(".create() works", function () {
      expect(vc instanceof VC).toBe(true);
    });
  });

  describe("Public methods:", function () {
    it(".setText() accepts String", function () {
      const TEXT = "Text content";

      vc.setText(TEXT);
      expect(vc._chunks.join("")).toBe(TEXT);
    });

    it(".setText() accepts Number", function () {
      const NUMBER = 9999;

      vc.setText(NUMBER);
      expect(vc._chunks.join("")).toBe(`${NUMBER}`);
    })

    it(".setText() accepts undefined, null or NaN as an empty string", function () {
      vc.setText(undefined);
      expect(vc._chunks.join("")).toBe("");

      vc.setText(null);
      expect(vc._chunks.join("")).toBe("");

      vc.setText(NaN);
      expect(vc._chunks.join("")).toBe("");
    });

    it(".setText() throws when Object or Array are passed", function () {
      var passObject = function () {vc.setText({});};
      var passArray  = function () {vc.setText([]);};

      expect(passObject).toThrow();
      expect(passArray).toThrow();
    });

    it(".setText() returns self", function () {
      expect(vc.setText()).toBe(vc);
    });


    it(".setHtml() accepts String", function () {
      const TEXT = "Text content";

      vc.setHtml(TEXT);
      expect(vc._chunks.join("")).toBe(TEXT);
    });

    it(".setHtml() accepts Number", function () {
      const NUMBER = 9999;

      vc.setHtml(NUMBER);
      expect(vc._chunks.join("")).toBe(`${NUMBER}`);
    })

    it(".setHtml() accepts undefined, null or NaN as an empty string", function () {
      vc.setHtml(undefined);
      expect(vc._chunks.join("")).toBe("");

      vc.setHtml(null);
      expect(vc._chunks.join("")).toBe("");

      vc.setHtml(NaN);
      expect(vc._chunks.join("")).toBe("");
    });

    it(".setHtml() throws when Object or Array are passed", function () {
      var passObject = function () {vc.setHtml({});};
      var passArray  = function () {vc.setHtml([]);};

      expect(passObject).toThrow();
      expect(passArray).toThrow();
    });

    it(".setHtml() returns self", function () {
      expect(vc.setHtml()).toBe(vc);
    });


    it(".isHtmlContent() works", function () {
      vc.setText("");
      expect(vc.isHtmlContent()).toBe(false);

      vc.setHtml("");
      expect(vc.isHtmlContent()).toBe(true);
    });


    it(".renderTo() works", function () {
      const TEXT  = "Text content";
      var el      = document.createElement("div");

      vc.setText(TEXT);
      vc.renderTo(el);

      expect(vc._el.parentNode).toBe(el);
      expect(el.textContent).toContain(TEXT);
    });

    it(".renderTo() accepts DOM Element or jQueryEl", function () {
      var el = document.createElement("div");
      var $el = {0: document.createElement("div"), length: 1, jquery: "2.1.1"};

      vc.setText("text");

      vc.renderTo(el);
      expect(vc._el.parentNode).toBe(el);

      vc.renderTo($el);
      expect(vc._el.parentNode).toBe($el[0]);
    });

    it(".renderTo() throws with unsupported argument", function () {
      function failOnNull () {
        vc.renderTo(null);
      }

      function failOnUndefined () {
        vc.renderTo(undefined);
      }

      function failOnObject () {
        vc.renderTo({0: "some data"});
      }

      expect(failOnNull).toThrow();
      expect(failOnUndefined).toThrow();
      expect(failOnObject).toThrow();
    });

    it(".renderTo() returns self", function () {
      expect(vc.renderTo(document.createElement("div"))).toBe(vc);
    });


    it(".destroy() works", function () {
      var el = document.createElement("div");

      vc.setText("random").renderTo(el);

      vc.destroy();

      expect(vc._scrollableEl).toBe(null);
      expect(vc._el.parentNode).toBe(null);
      expect(VC.instances.indexOf(vc)).toBe(-1);
      expect(el.children.length).toBe(0);
    });
  });

  describe("Private methods:", function () {
    it("._splitString(str, chunkSize) works", function () {
      const length    = 9999;
      const chunkSize = 100;
      var str         = Array(9999).fill("s").join("");
      var chunks      = vc._splitString(str, chunkSize);

      expect(chunks.length).toBe(Math.ceil(length/chunkSize));
      expect(chunks.every(function(chunk) {return chunk.length <= chunkSize})).toBe(true);
    });
  });
})
