import AVFoundation
import ExpoModulesCore
import Foundation

private let modelsDirectoryName = "local-ai"
private let targetSampleRate: Double = 16000
private let decodeInputFrames: AVAudioFrameCount = 16384

internal final class ModelsDirectoryUnavailableException: Exception {
  override var reason: String {
    "The application support directory is unavailable"
  }
}

internal final class AudioDecodeException: Exception {
  override var reason: String {
    "The recording could not be decoded"
  }
}

private func applicationSupportDirectory() throws -> URL {
  guard let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
    throw ModelsDirectoryUnavailableException()
  }
  return directory
}

private func preparedModelsDirectory() throws -> URL {
  var directory = try applicationSupportDirectory().appendingPathComponent(modelsDirectoryName, isDirectory: true)
  try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  var backupExclusion = URLResourceValues()
  backupExclusion.isExcludedFromBackup = true
  try directory.setResourceValues(backupExclusion)
  return directory
}

private func allocatedSize(of directory: URL) -> Double {
  let keys: [URLResourceKey] = [.isRegularFileKey, .totalFileAllocatedSizeKey, .fileAllocatedSizeKey]
  guard let enumerator = FileManager.default.enumerator(
    at: directory,
    includingPropertiesForKeys: keys,
    options: [.skipsHiddenFiles]
  ) else { return 0 }

  var total: Double = 0
  for case let url as URL in enumerator {
    guard let values = try? url.resourceValues(forKeys: Set(keys)), values.isRegularFile == true else { continue }
    total += Double(values.totalFileAllocatedSize ?? values.fileAllocatedSize ?? 0)
  }
  return total
}

private func decodeToMonoPcm(inputPath: String, outputPath: String) throws -> [String: Double] {
  let file = try AVAudioFile(forReading: URL(fileURLWithPath: inputPath))
  let sourceFormat = file.processingFormat
  guard
    let outputFormat = AVAudioFormat(
      commonFormat: .pcmFormatInt16,
      sampleRate: targetSampleRate,
      channels: 1,
      interleaved: true
    ),
    let converter = AVAudioConverter(from: sourceFormat, to: outputFormat)
  else {
    throw AudioDecodeException()
  }

  FileManager.default.createFile(atPath: outputPath, contents: nil)
  guard let handle = FileHandle(forWritingAtPath: outputPath) else { throw AudioDecodeException() }
  defer { try? handle.close() }

  let outputCapacity = AVAudioFrameCount(Double(decodeInputFrames) * targetSampleRate / sourceFormat.sampleRate) + 1024
  var reachedEnd = false
  var writtenFrames: Double = 0

  while true {
    guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputCapacity) else {
      throw AudioDecodeException()
    }
    var conversionError: NSError?
    let status = converter.convert(to: outputBuffer, error: &conversionError) { _, inputStatus in
      if reachedEnd {
        inputStatus.pointee = .endOfStream
        return nil
      }
      guard let inputBuffer = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: decodeInputFrames) else {
        reachedEnd = true
        inputStatus.pointee = .endOfStream
        return nil
      }
      do {
        try file.read(into: inputBuffer)
      } catch {
        reachedEnd = true
        inputStatus.pointee = .endOfStream
        return nil
      }
      if inputBuffer.frameLength == 0 {
        reachedEnd = true
        inputStatus.pointee = .endOfStream
        return nil
      }
      inputStatus.pointee = .haveData
      return inputBuffer
    }

    if status == .error || conversionError != nil { throw AudioDecodeException() }
    if outputBuffer.frameLength > 0, let channel = outputBuffer.int16ChannelData {
      let byteCount = Int(outputBuffer.frameLength) * MemoryLayout<Int16>.size
      handle.write(Data(bytes: channel[0], count: byteCount))
      writtenFrames += Double(outputBuffer.frameLength)
    }
    if status == .endOfStream { break }
  }

  return [
    "durationMs": writtenFrames / targetSampleRate * 1000,
    "bytes": writtenFrames * Double(MemoryLayout<Int16>.size)
  ]
}

public class ExpoLocalAiModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoLocalAi")

    AsyncFunction("prepareModelsDirectory") { () throws -> String in
      try preparedModelsDirectory().path
    }

    AsyncFunction("deleteModelsDirectory") { () throws -> Bool in
      let directory = try applicationSupportDirectory().appendingPathComponent(modelsDirectoryName, isDirectory: true)
      guard FileManager.default.fileExists(atPath: directory.path) else { return false }
      try FileManager.default.removeItem(at: directory)
      return true
    }

    AsyncFunction("getDiskSpace") { () throws -> [String: Double] in
      let home = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)
      let values = try home.resourceValues(forKeys: [
        .volumeAvailableCapacityForImportantUsageKey,
        .volumeTotalCapacityKey
      ])
      return [
        "freeBytes": Double(values.volumeAvailableCapacityForImportantUsage ?? 0),
        "totalBytes": Double(values.volumeTotalCapacity ?? 0)
      ]
    }

    AsyncFunction("getDirectorySize") { (path: String) -> Double in
      allocatedSize(of: URL(fileURLWithPath: path, isDirectory: true))
    }

    AsyncFunction("decodeAudioToPcm") { (inputPath: String, outputPath: String) throws -> [String: Double] in
      try decodeToMonoPcm(inputPath: inputPath, outputPath: outputPath)
    }

    Function("getSupportedAbis") { () -> [String] in
      ["arm64"]
    }

    Function("is64BitProcess") { () -> Bool in
      MemoryLayout<Int>.size == 8
    }
  }
}
