
import test from 'zopf'
import proxyquire from 'proxyquire'

import AppConstants from '../../app/constants/app-constants'

import electron from '../stubs/electron'

import AppDispatcher from '../stubs/app-dispatcher'
import AppActions from '../stubs/app-actions'
import CredentialsStore from '../stubs/credentials-store'
import defer from '../stubs/defer'

test('AppStore', t => {
  const GameStore = test.module({
    add_change_listener: t.spy(),
    get_state: () => {}
  })

  const os = test.module({
    process_type: () => 'renderer'
  })

  const Store = proxyquire('../../app/stores/store', Object.assign({
    '../util/os': os
  }, electron)).default

  const subscriptions = {}
  t.stub(Store, 'subscribe', (name, cb) => subscriptions[name] = cb)

  const stubs = Object.assign({
    './credentials-store': CredentialsStore,
    '../actions/app-actions': AppActions,
    '../dispatcher/app-dispatcher': AppDispatcher,
    '../util/defer': defer,
    '../util/os': os,
    './game-store': GameStore,
    './store': Store
  }, electron)

  const AppStore = proxyquire('../../app/stores/app-store', stubs).default
  const handler = AppDispatcher.get_handler('app-store')

  t.stub(CredentialsStore.get_current_user(), 'my_collections').resolves({collections: []})

  const get_state = () => AppStore.get_state()

  t.case('setup_status', t => {
    const message = 'Hold on to your ifs'
    handler({ action_type: AppConstants.SETUP_STATUS, message })
    t.is(get_state().login.setup.message, message)
  })

  t.case('focus_panel', t => {
    const panel = 'library'
    handler({ action_type: AppConstants.LIBRARY_FOCUS_PANEL, panel })
    t.is(get_state().library.panel, '')
    handler({ action_type: AppConstants.READY_TO_ROLL })
    handler({ action_type: AppConstants.LIBRARY_FOCUS_PANEL, panel })
    t.is(get_state().library.panel, panel)
  })

  t.case('no_stored_credentials', t => {
    handler({ action_type: AppConstants.NO_STORED_CREDENTIALS })
    t.is(get_state().page, 'login')
  })

  t.case('login flow', t => {
    handler({ action_type: AppConstants.ATTEMPT_LOGIN })
    t.ok(get_state().login.loading, 'loading after login_attempt')

    handler({ action_type: AppConstants.LOGIN_FAILURE, errors: ['ha!'] })
    t.notOk(get_state().login.loading, 'not loading after failure')

    handler({ action_type: AppConstants.ATTEMPT_LOGIN })
    t.ok(get_state().login.loading, 'loading after login_attempt')

    handler({ action_type: AppConstants.READY_TO_ROLL })
    t.notOk(get_state().login.loading, 'not loading after ready-to-roll')
    t.is(get_state().page, 'library', 'library after ready-to-roll')

    handler({ action_type: AppConstants.LOGOUT })
    t.is(get_state().page, 'login')
  })
})
