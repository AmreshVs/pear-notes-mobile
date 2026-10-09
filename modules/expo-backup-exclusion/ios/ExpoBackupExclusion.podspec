Pod::Spec.new do |s|
  s.name           = 'ExpoBackupExclusion'
  s.version        = '1.0.0'
  s.summary        = 'Keeps app folders out of iCloud and computer backups'
  s.description    = 'Sets isExcludedFromBackup on a directory so iOS backups skip it.'
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
