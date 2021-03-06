/**
 * Whether the item or list has a defined status (whether that be fetching, new, editing, etc)
 * @param {ResourcesItem|ResourcesList} itemOrList The item or list to consider
 * @returns {boolean} True if the resource item or list has started.
 */
function hasDefinedStatus(itemOrList) {
  return itemOrList.status && itemOrList.status.type !== null;
}

export default hasDefinedStatus;
