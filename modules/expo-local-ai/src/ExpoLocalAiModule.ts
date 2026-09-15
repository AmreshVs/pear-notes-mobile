import { NativeModule, requireOptionalNativeModule } from 'expo'

import { ExpoLocalAiEvents, LocalAiDecodedAudio, LocalAiDiskSpace } from './ExpoLocalAi.types'

declare class ExpoLocalAiModule extends NativeModule<ExpoLocalAiEvents> {
  startPcmStream(): Promise<void>
  stopPcmStream(): Promise<void>
  prepareModelsDirectory(): Promise<string>
  deleteModelsDirectory(): Promise<boolean>
  getDiskSpace(): Promise<LocalAiDiskSpace>
  getDirectorySize(path: string): Promise<number>
  decodeAudioToPcm(inputPath: string, outputPath: string): Promise<LocalAiDecodedAudio>
  getSupportedAbis(): string[]
  is64BitProcess(): boolean
}

export default requireOptionalNativeModule<ExpoLocalAiModule>('ExpoLocalAi')
