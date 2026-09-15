Pod::Spec.new do |s|
  s.name           = 'ExpoLocalAi'
  s.version        = '1.0.0'
  s.summary        = 'On-device AI storage helpers for Pear Notes'
  s.description    = 'Prepares a backup-excluded model directory and reports disk space for on-device AI models.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
