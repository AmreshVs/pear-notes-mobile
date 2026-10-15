Pod::Spec.new do |s|
  s.name           = 'ExpoBackgroundService'
  s.version        = '1.0.0'
  s.summary        = 'Background sync status for Pear Notes'
  s.description    = 'Reports whether iOS Background App Refresh is allowed for the app.'
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
