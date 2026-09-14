import { NativeModule, requireOptionalNativeModule } from 'expo'

import { LocalAiDecodedAudio, LocalAiDiskSpace } from './ExpoLocalAi.types'

declare class ExpoLocalAiModule extends NativeModule {
  prepareModelsDirectory(): Promise<string>
  deleteModelsDirectory(): Promise<boolean>
  getDiskSpace(): Promise<LocalAiDiskSpace>
  getDirectorySize(path: string): Promise<number>
  decodeAudioToPcm(inputPath: string, outputPath: string): Promise<LocalAiDecodedAudio>
  getSupportedAbis(): string[]
  is64BitProcess(): boolean
}

export default requireOptionalNativeModule<ExpoLocalAiModule>('ExpoLocalAi')
