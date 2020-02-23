import { ERROR } from '../constants/Statuses';

/**
 * Whether the last request for an item or collection errored, but there is still old values in the store that
 * can be displayed instead.
 * @params {ResourceItem|ResourceCollection} itemOrCollection The item or collection to test for old values
 * @returns {boolean} True if the item or collection has errored but has old values that can be displayed
 */
function canFallbackToOldValues({ status: { syncedAt, requestAt, type } }) {
  return requestAt > syncedAt && type === ERROR;
}

export default canFallbackToOldValues;
