import { NativeModule, requireOptionalNativeModule } from 'expo'

import { ExpoShareIntakeModuleEvents } from './ExpoShareIntake.types'

declare class ExpoShareIntakeModule extends NativeModule<ExpoShareIntakeModuleEvents> {
  importPendingShares(): Promise<number | null>
  isPreparing(): boolean
}

export default requireOptionalNativeModule<ExpoShareIntakeModule>('ExpoShareIntake')
