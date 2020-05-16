import fetchMock from 'fetch-mock';
import { resources, RESOURCES, CREATING, ERROR, NEW, SUCCESS } from '../../../index';
import nop from '../../../utils/function/nop';
import {
  expectToNotChangeResourcesCollection,
  expectToChangeNewItemKeyTo,
  expectToChangeResourcesItemStatusErrorOccurredAtToBeSet,
  expectToChangeResourcesItemStatusTo,
  expectToChangeResourcesItemValuesTo,
  setupInitialState, expectToChangeResourceCollectionPositionsTo
} from '../../helpers/resourceAssertions';
import EmptyKey from '../../../constants/EmptyKey';
import getCollectionKey from '../../../action-creators/helpers/getCollectionKey';

const RESOURCE_NAME = 'users';

describe('Create reducer:', function () {
  beforeAll(function() {
    const { reducers, actionCreators: { createUser } } = resources({
      name: 'users',
      url: 'http://test.com/users/:id?',
      keyBy: 'id'
    }, {
      create: true
    });

    this.createUser = createUser;
    this.reducers = reducers;

    this.newValues = { username: 'Bob' };
    this.responseValues = { ...this.newValues, id: 1 };
  });

  describe('Given no actions have come before it', () => {
    describe('and only the item\'s id is passed to the action creator', () => {
      expectToHandleSuccessAndFailedRequests({ ...RESOURCES }, 'temp');
    });
  });

  describe('Given a NEW action has come before it', () => {
    describe('and the item\'s id is passed as an object to the action creator', () => {
      expectToHandleSuccessAndFailedRequests({
        items: {
          temp: {
            values: { username: 'Robert' },
            status: { type: NEW }
          }
        },
        collections: { },
        newItemKey: 'temp'
      }, { id: 'temp' });
    });
  });

  describe('when there is already an item in the store with the same key', function () {
    describe('before the request has completed', function () {
      beforeAll(function(){
        spyOn(console, 'warn');

        setUpBeforeRequest(this, {
          items: {
            1: {
              values: { username: 'Robert' },
              status: { type: SUCCESS }
            }
          },
          collections: {
            [EmptyKey]: {
              positions: [ 1 ],
              status: { type: null }
            }
          },
          newItemKey: null
        }, 1, this.newValues);
      });

      it('then warns about the collision', function() {
        // eslint-disable-next-line no-console
        expect(console.warn).toHaveBeenCalledWith('Redux and the REST: CREATE_USER has the same key \'1\' as an existing item. Use updateUser() to update an existing item, or ensure the new item has a unique temporary key. (The create request was still sent to the server.)');
      });

      it('then replaces the existing item\'s values', function() {
        expectToChangeResourcesItemValuesTo(this, RESOURCE_NAME, 1, this.newValues);
      });

      it('then sets the status of the existing item to CREATING', function() {
        expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 1, 'type', CREATING);
      });

      it('then sets the newItemKey to the temporary key', function() {
        expectToChangeNewItemKeyTo(this, RESOURCE_NAME, 1);
      });

      afterAll(() => tearDown(this));
    });

    describe('when the request has completed', () => {
      beforeAll(function () {

        /**
         * Spy isn't actually used - just prevents warning from showing in test output
         */
        spyOn(console, 'warn');

        this.responseValues = { id: 2, username: 'Bob' };

        setUpAfterRequestSuccess(this, {
          users: {
            items: {
              1: {
                values: { username: 'Robert' },
                status: { type: SUCCESS }
              }
            },
            collections: {
              [EmptyKey]: {
                positions: [ 1 ],
                status: { type: null }
              }
            },
            newItemKey: null
          }
        }, 1, this.newValues, this.responseValues);
      });

      afterAll(() => tearDown(this));

      it('then moves the item to the new ID and merges in values from the server', function() {
        expectToChangeResourcesItemValuesTo(this, RESOURCE_NAME, this.responseValues.id, this.responseValues);
      });

      it('then sets the items status type to SUCCESS', function() {
        expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, this.responseValues.id, 'type', SUCCESS);
      });

      it('then updates the newItemKey ', function() {
        expectToChangeNewItemKeyTo(this, RESOURCE_NAME, this.responseValues.id);
      });
    });
  });

  describe('when the push collections operator is used', () => {
    expectToCorrectlyApplyOperator('push', ['temp'], [2], [1, 'temp'], [1, 2]);
  });

  describe('when the unshift collections operator is used', () => {
    expectToCorrectlyApplyOperator('unshift', ['temp'], [2], ['temp', 1], [2, 1]);
  });

  describe('when the invalidate collections operator is used', () => {
    expectToCorrectlyApplyOperator('invalidate', [], [], [], []);
  });

  describe('Given a create action that will succeed with a response that specifies \'errors\' at the top level', () => {
    describe('when the request has completed', () => {
      expectToCorrectlySetErrors(404);
    });
  });

  describe('Given a create action that will fail with a response that specifies \'errors\' at the top level', () => {
    describe('when the request has completed', () => {
      expectToCorrectlySetErrors(200);
    });
  });

  /**
   * Helpers
   */

  function expectToHandleSuccessAndFailedRequests(initialState, idArgs) {
    describe('and the API request succeeds', function () {
      describe('before the request has completed', function () {
        beforeAll(function () {
          setUpBeforeRequest(this, initialState, idArgs, this.newValues);
        });

        expectToRecordPendingCreate();

        afterAll(() => tearDown(this));
      });

      describe('when the request has completed', () => {
        beforeAll(function () {
          setUpAfterRequestSuccess(this, initialState, idArgs, this.newValues, this.responseValues);
        });

        expectToRecordCreateSuccess();

        afterAll(() => tearDown(this));
      });
    });

    describe('and the API request errors', function () {
      describe('before the request has completed', function () {
        beforeAll(function () {
          setUpBeforeRequest(this, initialState, idArgs, this.newValues);
        });

        expectToRecordPendingCreate();

        afterAll(() => tearDown(this));
      });

      describe('when the request has completed', () => {
        beforeAll(function () {
          setUpAfterRequestFailure(this, initialState, idArgs, this.newValues);
        });

        expectToRecordCreateError();

        afterAll(() => tearDown(this));
      });
    });
  }

  function expectToRecordCreateSuccess() {
    it('then moves the item to the new ID and merges in values from the server', function() {
      expectToChangeResourcesItemValuesTo(this, RESOURCE_NAME, 1, {
        id: 1,
        username: 'Bob',
      });
    });

    it('then sets the items status type to SUCCESS', function() {
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 1, 'type', SUCCESS);
    });

    it('then updates the newItemKey ', function() {
      expectToChangeNewItemKeyTo(this, RESOURCE_NAME, 1);
    });
  }

  function expectToRecordPendingCreate() {
    it('then adds a new item with the correct values', function() {
      expectToChangeResourcesItemValuesTo(this, RESOURCE_NAME, 'temp', { username: 'Bob' });
    });

    it('then adds a new item with a status type of CREATING', function() {
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 'temp', 'type', CREATING);
    });

    it('then does NOT add the temporary key to the default collection', function() {
      expectToNotChangeResourcesCollection(this, RESOURCE_NAME, EmptyKey);
    });

    it('then sets the newItemKey to the temporary key', function() {
      expectToChangeNewItemKeyTo(this, RESOURCE_NAME, 'temp');
    });
  }

  function expectToRecordCreateError() {
    it('then DOES NOT move the item from its temporary key', function() {
      expectToChangeResourcesItemValuesTo(this, RESOURCE_NAME, 'temp', this.newValues);
    });

    it('then sets the items status type to ERROR', function() {
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 'temp', 'type', ERROR);
    });

    it('then sets the items status httpCode', function() {
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 'temp', 'httpCode', 404);
    });

    it('then sets the syncedAt attribute', function() {
      expectToChangeResourcesItemStatusErrorOccurredAtToBeSet(this, RESOURCE_NAME, 'temp');
    });

    it('then merges in the server\'s response into the status', function() {
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 'temp', 'error', { message: 'Not Found' });
    });

    it('then DOES NOT update the newItemKey', function() {
      expectToChangeNewItemKeyTo(this, RESOURCE_NAME, 'temp');
    });
  }

  function expectToCorrectlyApplyOperator(operator, expectedIsolatedStateBefore, expectedIsolatedStateAfter, expectedCumulativeStateBefore, expectedCumulativeStateAfter) {
    beforeAll(function () {
      this.newValues = { username: 'Bob' };
      this.responseValues = { id: 2, username: 'Bob' };
      this.collectionKey = { order: 'newest' };
    });

    describe('and there are NO MATCHING collections', () => {
      describe('before the request has completed', function () {
        beforeAll(function () {
          setUpBeforeRequest(this, {
            items: {},
            collections: {
              'active=true': {
                positions: [],
                status: { type: SUCCESS }
              }
            },
            newItemKey: null
          }, 'temp', this.newValues, { [operator]: this.collectionKey });
        });

        afterAll(() => tearDown(this));

        it('then creates a new collection with the specified temp key and places the item in it', function () {
          expectToChangeResourceCollectionPositionsTo(
            this, RESOURCE_NAME, getCollectionKey(this.collectionKey), expectedIsolatedStateBefore
          );
        });

        it('then doesn\'t add the new temp key to any other existing collections', function () {
          expectToChangeResourceCollectionPositionsTo(this, RESOURCE_NAME, 'active=true', []);
        });
      });

      expectToReplaceTempKeyInCollections(operator, expectedIsolatedStateAfter);
    });

    describe('and there are collections with keys that exactly match', function () {
      describe('before the request has completed', function () {
        beforeAll(function () {
          setUpBeforeRequest(this, {
            items: {
              1: { id: 1, username: 'Jane' }
            },
            collections: {
              'active=true': {
                positions: [],
                status: { type: null }
              },
              'order=newest': {
                positions: [1],
                status: { type: null }
              },
            },
            newItemKey: null
          }, 'temp', this.newValues, { [operator]: this.collectionKey });
        });

        afterAll(() => tearDown(this));

        it('then adds the new item\'s temp key to the matching collections', function () {
          expectToChangeResourceCollectionPositionsTo(
            this, RESOURCE_NAME, getCollectionKey(this.collectionKey), expectedCumulativeStateBefore
          );
        });

        it('then doesn\'t add the new temp key to any other existing collections', function () {
          expectToChangeResourceCollectionPositionsTo(this, RESOURCE_NAME, 'active=true', []);
        });
      });

      expectToReplaceTempKeyInCollections(operator, expectedCumulativeStateAfter);
    });
  }

  function expectToReplaceTempKeyInCollections(operator, expectedIsolatedStateAfter) {
    describe('when the request has completed', function() {
      beforeAll(function () {
        setUpAfterRequestSuccess(this, this.initialState, 'temp', this.newValues, this.responseValues, { [operator]: this.collectionKey });
      });

      afterAll(() => tearDown(this));

      it('then replaces all references to the temporary key with the new item key', function () {
        expectToChangeResourceCollectionPositionsTo(
          this, RESOURCE_NAME, getCollectionKey(this.collectionKey), expectedIsolatedStateAfter
        );
      });
    });
  }

  function expectToCorrectlySetErrors(status = 200) {
    beforeAll(function () {
      this.newValues = { username: 'Bob' };

      setUpAfterRequestFailure(this, { ...RESOURCES }, 'temp', this.newValues, {
        body: { errors: [{ message: 'Not Found' }] },
        status
      });
    });

    afterAll(function(){
      tearDown(this);
    });

    it('then DOES NOT move the item from its temporary key', function () {
      expect(this.store.getState().users.items.temp.values).toEqual(this.newValues);
    });

    it('then sets the items status type to ERROR', function () {
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 'temp', 'type', ERROR);
    });

    it('then sets the items status httpCode', function () {
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 'temp', 'httpCode', status);
    });

    it('then does NOT set the syncedAt attribute', function () {
      expectToChangeResourcesItemStatusErrorOccurredAtToBeSet(this, RESOURCE_NAME, 'temp');
    });

    it('then merges in the server\'s response into the status', function () {
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 'temp', 'error', { message: 'Not Found' });
      expectToChangeResourcesItemStatusTo(this, RESOURCE_NAME, 'temp', 'errors', [{ message: 'Not Found' }]);
    });

    it('then DOES NOT update the newItemKey', function () {
      expectToChangeNewItemKeyTo(this, RESOURCE_NAME, 'temp');
    });
  }

  function setUpBeforeRequest(context, initialState, id, newValues, actionCreatorOptions = {}) {
    fetchMock.post('http://test.com/users', new Promise(nop));

    setupState(context, initialState, id, newValues, actionCreatorOptions);
  }

  function setUpAfterRequestSuccess(context, initialState, id, initialValues,
                                    responseValues = initialValues, actionCreatorOptions = {}) {
    fetchMock.post('http://test.com/users', {
      body: responseValues,
    });

    setupState(context, initialState, id, initialValues, actionCreatorOptions);
  }

  function setUpAfterRequestFailure(context, initialState, id, newValues, options = { body: { error: 'Not Found' }, status: 404 }) {
    fetchMock.post('http://test.com/users', options);

    setupState(context, initialState, id, newValues);
  }

  function setupState(context, initialState, id, newValues, actionCreatorOptions = {}) {
    setupInitialState(context, RESOURCE_NAME, initialState);

    context.store.dispatch(context.createUser(id, newValues, actionCreatorOptions));
  }

  function tearDown(context) {
    fetchMock.restore();
    context.store = null;
  }
});
