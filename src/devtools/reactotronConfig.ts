import Reactotron from 'reactotron-react-native'

import {
  BACKGROUND_SYNC_TASK_NAME,
  triggerBackgroundSyncForTesting,
} from '@/lib/backgroundSyncTask'

const REACTOTRON_APP_NAME = 'Pear Notes'
const TRIGGER_BACKGROUND_SYNC_COMMAND = 'Trigger background sync'
const IGNORED_NETWORK_URLS = /symbolicate|\/logs|\/hot|\/inspector/

Reactotron.configure({ name: REACTOTRON_APP_NAME })
  .useReactNative({
    asyncStorage: false,
    networking: { ignoreUrls: IGNORED_NETWORK_URLS },
    editor: false,
    errors: true,
    overlay: false,
    log: true,
  })
  .connect()

Reactotron.onCustomCommand({
  command: TRIGGER_BACKGROUND_SYNC_COMMAND,
  title: TRIGGER_BACKGROUND_SYNC_COMMAND,
  description:
    'Runs ' + BACKGROUND_SYNC_TASK_NAME + ' now instead of waiting for the OS to schedule it',
  handler: () => {
    triggerBackgroundSyncForTesting()
  },
})
