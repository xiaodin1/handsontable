describe('Core.spliceCellsMeta', () => {
  const id = 'testContainer';

  beforeEach(function() {
    this.$container = $(`<div id="${id}"></div>`).appendTo('body');
  });

  afterEach(function() {
    if (this.$container) {
      destroy();
      this.$container.remove();
    }
  });

  it('should splice the cell meta array analogously to the native `splice` method', () => {
    handsontable();

    let allMeta = getCellsMeta();

    expect(allMeta.length).toBe(25);

    spliceCellsMeta(3, 1);
    allMeta = getCellsMeta();

    expect(allMeta.length).toBe(20);

    let metaAtRow = getCellMetaAtRow(2);

    expect(metaAtRow[0].row).toEqual(2);

    metaAtRow = getCellMetaAtRow(3);

    expect(metaAtRow[0].row).toEqual(4);
  });

  it('should remove cell meta objects from the collection', () => {
    handsontable();

    getCellMeta(0, 1)._test = 'foo-0x1';
    getCellMeta(0, 10)._test = 'foo-0x10';
    getCellMeta(3, 1)._test = 'foo-3x1';
    getCellMeta(3, 10)._test = 'foo-3x10';

    spliceCellsMeta(1, 2);

    expect(getCellMeta(0, 1)._test).toBe('foo-0x1');
    expect(getCellMeta(0, 10)._test).toBe('foo-0x10');
    expect(getCellMeta(1, 1)._test).toBe('foo-3x1');
    expect(getCellMeta(1, 10)._test).toBe('foo-3x10');
    expect(getCellMeta(2, 1)._test).toBeUndefined();
    expect(getCellMeta(2, 10)._test).toBeUndefined();
  });

  it('should add new cell meta object to the collection', () => {
    handsontable();

    getCellMeta(0, 1)._test = 'foo-0x1';
    getCellMeta(0, 10)._test = 'foo-0x10';
    getCellMeta(3, 1)._test = 'foo-3x1';
    getCellMeta(3, 10)._test = 'foo-3x10';

    spliceCellsMeta(1, 2, [{ _test: 'a' }, { _test: 'b' }]);

    expect(getCellMeta(0, 1)._test).toBe('foo-0x1');
    expect(getCellMeta(0, 10)._test).toBe('foo-0x10');
    expect(getCellMeta(1, 0)._test).toBe('a');
    expect(getCellMeta(1, 1)._test).toBe('b');
    expect(getCellMeta(1, 2)._test).toBeUndefined();
    expect(getCellMeta(2, 1)._test).toBe('foo-3x1');
    expect(getCellMeta(2, 10)._test).toBe('foo-3x10');
    expect(getCellMeta(3, 1)._test).toBeUndefined();
    expect(getCellMeta(3, 10)._test).toBeUndefined();
  });

  it('should add new cell meta objects to the collection', () => {
    handsontable();

    getCellMeta(0, 1)._test = 'foo-0x1';
    getCellMeta(0, 10)._test = 'foo-0x10';
    getCellMeta(3, 1)._test = 'foo-3x1';
    getCellMeta(3, 10)._test = 'foo-3x10';

    spliceCellsMeta(1, 2, [{ _test: 'a' }, { _test: 'b' }], [{ _test: 'c' }, { _test: 'd' }], [{ _test: 'e' }, { _test: 'f' }]);

    expect(getCellMeta(0, 1)._test).toBe('foo-0x1');
    expect(getCellMeta(0, 10)._test).toBe('foo-0x10');
    expect(getCellMeta(1, 0)._test).toBe('a');
    expect(getCellMeta(1, 1)._test).toBe('b');
    expect(getCellMeta(2, 0)._test).toBe('c');
    expect(getCellMeta(2, 1)._test).toBe('d');
    expect(getCellMeta(3, 0)._test).toBe('e');
    expect(getCellMeta(3, 1)._test).toBe('f');
    expect(getCellMeta(4, 1)._test).toBe('foo-3x1');
    expect(getCellMeta(4, 10)._test).toBe('foo-3x10');
    expect(getCellMeta(5, 1)._test).toBeUndefined();
    expect(getCellMeta(5, 10)._test).toBeUndefined();
  });
});
