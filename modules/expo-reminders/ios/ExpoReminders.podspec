Pod::Spec.new do |s|
  s.name           = 'ExpoReminders'
  s.version        = '1.0.0'
  s.summary        = 'Local reminders and read aloud for Pear Notes'
  s.description    = 'Schedules local notifications for dated to-dos and reads text with the system voice.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
