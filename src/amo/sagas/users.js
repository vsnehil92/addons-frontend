import { call, put, select, takeLatest } from 'redux-saga/effects';
import {
  DELETE_USER_ACCOUNT,
  DELETE_USER_PICTURE,
  EDIT_USER_ACCOUNT,
  FETCH_USER_ACCOUNT,
  FETCH_USER_NOTIFICATIONS,
  finishEditUserAccount,
  loadCurrentUserAccount,
  loadUserAccount,
  loadUserNotifications,
  unloadUserAccount,
} from 'amo/reducers/users';
import * as api from 'amo/api/users';
import { SET_AUTH_TOKEN } from 'core/constants';
import log from 'core/logger';
import { createErrorHandler, getState } from 'core/sagas/utils';


// This saga is not triggered by the UI but on the server side, hence do not
// have a `errorHandler`. We do not want to miss any error because it would
// mean no ways for the users to log in, so we let the errors bubble up.
export function* fetchCurrentUserAccount({ payload }) {
  const { token } = payload;

  const state = yield select(getState);

  const response = yield call(api.currentUserAccount, {
    api: {
      ...state.api,
      token,
    },
  });

  yield put(loadCurrentUserAccount({ user: response }));
}

export function* editUserAccount({
  payload: {
    errorHandlerId,
    notifications,
    picture,
    userFields,
    userId,
  },
}) {
  const errorHandler = createErrorHandler(errorHandlerId);

  yield put(errorHandler.createClearingAction());

  try {
    const state = yield select(getState);

    const user = yield call(api.editUserAccount, {
      api: state.api,
      picture,
      userId,
      ...userFields,
    });

    yield put(loadUserAccount({ user }));

    if (Object.keys(notifications).length) {
      const allNotifications = yield call(api.updateUserNotifications, {
        api: state.api,
        notifications,
        userId,
      });

      yield put(loadUserNotifications({
        notifications: allNotifications,
        username: user.username,
      }));
    }
  } catch (error) {
    log.warn(`Could not edit user account: ${error}`);
    yield put(errorHandler.createErrorAction(error));
  } finally {
    yield put(finishEditUserAccount());
  }
}

export function* fetchUserAccount({
  payload: {
    errorHandlerId,
    username,
  },
}) {
  const errorHandler = createErrorHandler(errorHandlerId);

  yield put(errorHandler.createClearingAction());

  try {
    const state = yield select(getState);

    const user = yield call(api.userAccount, {
      api: state.api,
      username,
    });

    yield put(loadUserAccount({ user }));
  } catch (error) {
    log.warn(`User account failed to load: ${error}`);
    yield put(errorHandler.createErrorAction(error));
  }
}

export function* fetchUserNotifications({
  payload: {
    errorHandlerId,
    username,
  },
}) {
  const errorHandler = createErrorHandler(errorHandlerId);

  yield put(errorHandler.createClearingAction());

  try {
    const state = yield select(getState);

    const notifications = yield call(api.userNotifications, {
      api: state.api,
      username,
    });

    yield put(loadUserNotifications({ notifications, username }));
  } catch (error) {
    log.warn(`User notifications failed to load: ${error}`);
    yield put(errorHandler.createErrorAction(error));
  }
}

export function* deleteUserPicture({
  payload: {
    errorHandlerId,
    userId,
  },
}) {
  const errorHandler = createErrorHandler(errorHandlerId);

  yield put(errorHandler.createClearingAction());

  try {
    const state = yield select(getState);

    const user = yield call(api.deleteUserPicture, {
      api: state.api,
      userId,
    });

    yield put(loadUserAccount({ user }));
  } catch (error) {
    log.warn(`Could not delete user picture: ${error}`);
    yield put(errorHandler.createErrorAction(error));
  }
}

export function* deleteUserAccount({
  payload: {
    errorHandlerId,
    userId,
  },
}) {
  const errorHandler = createErrorHandler(errorHandlerId);

  yield put(errorHandler.createClearingAction());

  try {
    const state = yield select(getState);

    yield call(api.deleteUserAccount, {
      api: state.api,
      userId,
    });

    yield put(unloadUserAccount({ userId }));
  } catch (error) {
    log.warn(`Could not delete user account: ${error}`);
    yield put(errorHandler.createErrorAction(error));
  }
}

export default function* usersSaga() {
  yield takeLatest(DELETE_USER_ACCOUNT, deleteUserAccount);
  yield takeLatest(DELETE_USER_PICTURE, deleteUserPicture);
  yield takeLatest(EDIT_USER_ACCOUNT, editUserAccount);
  yield takeLatest(FETCH_USER_ACCOUNT, fetchUserAccount);
  yield takeLatest(FETCH_USER_NOTIFICATIONS, fetchUserNotifications);
  yield takeLatest(SET_AUTH_TOKEN, fetchCurrentUserAccount);
}
