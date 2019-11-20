import { arrayFilter, arrayMap } from '../../helpers/array';
import { assert, isFiniteSignedNumber, isNullish } from './utils';

/**
 * The LazyFactoryMap object holds key-value pairs in the structure similar to the
 * 2D grid. Once created, items can be moved around a grid depending on the operations
 * performed on that grid - adding or removing rows. The collection requires "key"
 * to be a zero-based index.
 *
 * It's essential to notice that the "key" index under which the item was created
 * is volatile. After altering the grid, the "key" index can change.
 *
 * Having created N items with corresponding data
 * +------+------+------+------+------+
 * | 0/10 | 1/11 | 2/12 | 3/13 | 4/14 |  Keys (volatile zero-based index / internal storage index)
 * +------+------+------+------+------+
 *    │      │      │      │      │
 * +------+------+------+------+------+
 * | AAA  | BBB  | CCC  | DDD  | EEE  |  Data
 * +------+------+------+------+------+
 *
 * map.obtain(0) // returns "AAA"
 * map.obtain(2) // returns "CCC"
 *
 * after inserting new 2 rows, keys that hold the data positioned after the place
 * where the new rows are added are upshifted by 2.
 *               │
 *               │ Insert 2 rows
 *              \│/
 * +------+------+------+------+------+
 * | 0/10 | 1/11 | 2/12 | 3/13 | 4/14 |  Keys before
 * +------+------+------+------+------+
 *
 *                / 2 new rows \
 * +------+------+------+------+------+------+------+
 * | 0/10 | 1/11 | 2/12 | 3/13 | 4/14 | 5/15 | 6/16 |  Keys after
 * +------+------+------+------+------+------+------+
 *    │       │      │      │      │      │     │
 *    │       │      └──────┼──────┼──────┼┐    │
 *    │       │             └──────┼──────┼┼────┼┐
 *    │       │      ┌─────────────┘      ││    ││
 *    │       │      │      ┌─────────────┘│    ││
 *    │       │      │      │      ┌───────┼────┘│
 *    │       │      │      │      │       │     │
 * +------+------+------+------+------+------+------+
 * | AAA  | BBB  | CCC  | DDD  | EEE  | FFF  | GGG  |  Data
 * +------+------+------+------+------+------+------+
 *
 * Now at index 2 and 3 we have access to new items.
 *
 * map.obtain(2) // returns new value "FFF" for newly created row.
 * map.obtain(4) // index shifted by 2 has access to the old "CCC" value, as before inserting.
 *
 * after removing 2 rows, keys that hold the data positioned after the place where the
 * rows are removed are downshifted by 2.
 *               │
 *               │ Remove 2 rows
 *               ├─────────────┐
 *              \│/            │
 * +------+------+------+------+------+
 * | 0/10 | 1/11 | 2/12 | 3/13 | 4/14 |  Keys before
 * +------+------+------+------+------+
 *
 * +------+------+------+
 * | 0/10 | 1/11 | 2/14 |  Keys after
 * +------+------+------+
 *    │       │      │
 *    │       │      └─────────────┐
 *    │       │                    │
 *    │       │                    │
 *    │       │                    │
 *    │       │                    │
 *    │       │                    │
 * +------+------+------+------+------+
 * | AAA  | BBB  | CCC  | DDD  | EEE  |  Data
 * +------+------+------+------+------+
 *                  /│\   /|\
 *                   └──┬──┘
 *         This data is marked as "hole" which
 *         means that can be replaced by new item
 *         when that will be created.
 *
 * map.obtain(2) // returns the old value ("EEE") as it should
 */
export default class LazyFactoryMap {
  constructor(valueFactory) {
    this.valueFactory = valueFactory;
    /**
     * An array which contains data.
     *
     * @type {Array}
     */
    this.data = [];
    /**
     * An array of indexes where the key of the array is mapped to the value which points to the
     * specific position of the data array.
     *
     * @type {Number[]}
     */
    this.index = [];
    /**
     * An array of indexes where points to the data items which can be replaced by obtaining new
     * ones. The "holes" are a side effect of deleting entries.
     *
     * @type {Number[]}
     */
    this.holes = [];
  }

  /**
   * Gets or if data not exist creates and returns new data.
   *
   * @param {Number} key The item key as zero-based index.
   * @returns {*}
   */
  obtain(key) {
    assert(() => isFiniteSignedNumber(key), 'Expecting a signed finite number.');

    const dataIndex = this._getStorageIndexByKey(key);
    let result;

    if (dataIndex >= 0) {
      result = this.data[dataIndex];

      if (result === void 0) {
        result = this.valueFactory(key);
        this.data[dataIndex] = result;
      }
    } else {
      result = this.valueFactory(key);

      if (this.holes.length > 0) {
        const reuseIndex = this.holes.pop();

        this.data[reuseIndex] = result;
        this.index[key] = reuseIndex;
      } else {
        this.data.push(result);
        this.index[key] = this.data.length - 1;
      }
    }

    return result;
  }

  /**
   * Inserts an empty data to the map. This method creates an empty space for obtaining
   * new data.
   *
   * @param {Number} key The key as volatile zero-based index at which to begin inserting space for new data.
   * @param {Number} [amount=1] Ammount data to insert.
   */
  insert(key, amount = 1) {
    assert(() => (isFiniteSignedNumber(key) || isNullish(key)), 'Expecting a signed finite number or null/undefined argument.');

    const newIndexes = [];
    const dataLength = this.data.length;

    for (let i = 0; i < amount; i++) {
      newIndexes.push(dataLength + i);
      this.data.push(void 0);
    }

    this.index.splice(isNullish(key) ? this.index.length : key, 0, ...newIndexes);
  }

  /**
   * Removes (soft remove) data from "index" and according to the amount of data.
   *
   * @param {Number} key The key as volatile zero-based index at which to begin removing the data.
   * @param {Number} [amount=1] Ammount data to remove.
   */
  remove(key, amount = 1) {
    assert(() => (isFiniteSignedNumber(key) || isNullish(key)), 'Expecting a signed finite number or null/undefined argument.');

    const removed = this.index.splice(isNullish(key) ? this.index.length - amount : key, amount);

    for (let i = 0; i < removed.length; i++) {
      const removedIndex = removed[i];

      if (typeof removedIndex === 'number') {
        this.holes.push(removedIndex);
      }
    }
  }

  /**
   * Returns the size of the data which this map holds.
   *
   * @returns {Number}
   */
  size() {
    return this.data.length - this.holes.length;
  }

  /**
   * Returns a new Iterator object that contains the values for each item in the LazyMap object.
   *
   * @returns {Iterator}
   */
  values() {
    return arrayFilter(this.data, (_, index) => !this.holes.includes(index))[Symbol.iterator]();
  }

  /**
   * Returns a new Iterator object that contains an array of `[index, value]` for each item in the LazyMap object.
   *
   * @returns {Iterator}
   */
  entries() {
    const entries = arrayMap(this.data, (value, dataIndex) => [this._getKeyByStorageIndex(dataIndex), value]);
    const validEntries = arrayFilter(entries, ([dataIndex]) => dataIndex !== -1);
    let dataIndex = 0;

    return {
      next: () => {
        if (dataIndex < validEntries.length) {
          const value = validEntries[dataIndex];

          dataIndex += 1;

          return { value, done: false };
        }

        return { done: true };
      }
    };
  }

  /**
   * Clears the map.
   */
  clear() {
    this.data = [];
    this.index = [];
    this.holes = [];
  }

  /**
   * Gets storage index calculated from the key associated with the specified value.
   *
   * @param {Number} key Volatile zero-based index.
   * @returns {Number} Returns index 0-N or -1 if no storage index found.
   */
  _getStorageIndexByKey(key) {
    return this.index.length > key ? this.index[key] : -1;
  }

  /**
   * Gets the key associated with the specified value calculated from storage index.
   *
   * @param {Number} dataIndex Zero-based storage index.
   * @returns {Number} Returns index 0-N or -1 if no key found.
   */
  _getKeyByStorageIndex(dataIndex) {
    return this.index.indexOf(dataIndex);
  }

  /**
   * Makes this object iterable.
   */
  [Symbol.iterator]() {
    return this.entries();
  }
}
