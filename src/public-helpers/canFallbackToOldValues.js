import { ERROR } from '../constants/Statuses';
import isUndefined from '../utils/isUndefined';

/**
 * Whether the last request for an item or list errored, but there is still old values in the store that
 * can be displayed instead.
 * @params {ResourcesItem|ResourcesList} itemOrList The item or list to test for old values
 * @returns {boolean} True if the item or list has errored but has old values that can be displayed
 */
function canFallbackToOldValues({ status: { syncedAt, requestedAt, type } }) {
  return !isUndefined(syncedAt) && (requestedAt > syncedAt) && type === ERROR;
}

export default canFallbackToOldValues;
