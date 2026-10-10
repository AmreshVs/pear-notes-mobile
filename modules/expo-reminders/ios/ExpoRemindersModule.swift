import AVFoundation
import ExpoModulesCore
import UIKit
import UserNotifications

private let reminderPrefix = "pearnotes-reminder-"
private let maxPending = 50

private enum ReminderLaunch {
  static let center = ReminderCenterDelegate()
  static var pendingURL: String?
  static var jsReady = false

  static func install() {
    let current = UNUserNotificationCenter.current()
    if current.delegate !== center {
      center.previous = current.delegate
      current.delegate = center
    }
  }
}

public class ReminderAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    ReminderLaunch.install()
    return true
  }
}

private final class SpeechEndDelegate: NSObject, AVSpeechSynthesizerDelegate {
  private func release(_ synthesizer: AVSpeechSynthesizer) {
    guard !synthesizer.isSpeaking else { return }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
    release(synthesizer)
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
    release(synthesizer)
  }
}

private final class ReminderCenterDelegate: NSObject, UNUserNotificationCenterDelegate {
  weak var previous: UNUserNotificationCenterDelegate?

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    guard notification.request.identifier.hasPrefix(reminderPrefix) else {
      if previous?.userNotificationCenter?(
        center, willPresent: notification, withCompletionHandler: completionHandler) == nil
      {
        completionHandler([])
      }
      return
    }
    completionHandler([.banner, .sound])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    guard response.notification.request.identifier.hasPrefix(reminderPrefix) else {
      if previous?.userNotificationCenter?(
        center, didReceive: response, withCompletionHandler: completionHandler) == nil
      {
        completionHandler()
      }
      return
    }
    if let link = response.notification.request.content.userInfo["url"] as? String, let url = URL(string: link) {
      DispatchQueue.main.async {
        if ReminderLaunch.jsReady {
          UIApplication.shared.open(url)
        } else {
          ReminderLaunch.pendingURL = link
        }
      }
    }
    completionHandler()
  }
}

public class ExpoRemindersModule: Module {
  private let synthesizer = AVSpeechSynthesizer()
  private let speechDelegate = SpeechEndDelegate()

  public func definition() -> ModuleDefinition {
    Name("ExpoReminders")

    OnCreate {
      ReminderLaunch.install()
      self.synthesizer.delegate = self.speechDelegate
    }

    Function("getInitialUrl") { () -> String? in
      ReminderLaunch.jsReady = true
      let url = ReminderLaunch.pendingURL
      ReminderLaunch.pendingURL = nil
      return url
    }

    AsyncFunction("requestPermission") { () async -> Bool in
      let center = UNUserNotificationCenter.current()
      do {
        return try await center.requestAuthorization(options: [.alert, .sound])
      } catch {
        return false
      }
    }

    AsyncFunction("schedule") { (items: [[String: Any]]) async -> Int in
      let center = UNUserNotificationCenter.current()
      let pending = await center.pendingNotificationRequests()
      center.removePendingNotificationRequests(
        withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(reminderPrefix) }
      )
      let now = Date().timeIntervalSince1970
      var added = 0
      let upcoming = items
        .compactMap { item -> (String, String, String, Double, String)? in
          guard let id = item["id"] as? String, let title = item["title"] as? String,
            let atMs = (item["atMs"] as? NSNumber)?.doubleValue
          else { return nil }
          return (id, title, item["body"] as? String ?? "", atMs / 1000, item["url"] as? String ?? "")
        }
        .filter { $0.3 > now }
        .sorted { $0.3 < $1.3 }
        .prefix(maxPending)
      for (id, title, body, at, url) in upcoming {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.userInfo = ["url": url]
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, at - now), repeats: false)
        let request = UNNotificationRequest(identifier: reminderPrefix + id, content: content, trigger: trigger)
        if (try? await center.add(request)) != nil { added += 1 }
      }
      return added
    }

    AsyncFunction("cancelAll") { () async in
      let center = UNUserNotificationCenter.current()
      let pending = await center.pendingNotificationRequests()
      center.removePendingNotificationRequests(
        withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(reminderPrefix) }
      )
    }

    AsyncFunction("speak") { (text: String, language: String?) -> Bool in
      self.synthesizer.stopSpeaking(at: .immediate)
      let session = AVAudioSession.sharedInstance()
      try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
      try? session.setActive(true)
      let utterance = AVSpeechUtterance(string: text)
      if let language, let voice = AVSpeechSynthesisVoice(language: language) {
        utterance.voice = voice
      }
      self.synthesizer.speak(utterance)
      return true
    }.runOnQueue(.main)

    Function("stopSpeaking") {
      self.synthesizer.stopSpeaking(at: .immediate)
    }

    Function("isSpeaking") { () -> Bool in
      self.synthesizer.isSpeaking
    }
  }
}
