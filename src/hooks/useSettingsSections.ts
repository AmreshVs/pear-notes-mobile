import type React from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'

import type { IconName } from '@/components/SymbolIcon'

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

export type SettingsSection = {
  key: string
  route: string
  label: string
  iosIcon: IconName
  androidIcon: MaterialIconName
}

export function useSettingsSections(): SettingsSection[] {
  const { t } = useTranslation()
  return useMemo(
    () => [
      {
        key: 'general',
        route: '/settings/general',
        label: t('layouts.general'),
        iosIcon: 'slider.horizontal.3' as IconName,
        androidIcon: 'tune-variant' as MaterialIconName,
      },
      {
        key: 'privacy',
        route: '/settings/privacy',
        label: t('settings.privacy.rowTitle'),
        iosIcon: 'checkmark.shield' as IconName,
        androidIcon: 'shield-check-outline' as MaterialIconName,
      },
      ...(LOCAL_AI_ENABLED
        ? [
            {
              key: 'onDeviceAi',
              route: '/settings/on-device-ai',
              label: t('settings.onDeviceAi.rowTitle'),
              iosIcon: 'sparkles' as IconName,
              androidIcon: 'creation-outline' as MaterialIconName,
            },
          ]
        : []),
      ...(isMultiVaultEnabled()
        ? [
            {
              key: 'vaults',
              route: '/settings/vaults',
              label: t('vaults.rowTitle'),
              iosIcon: 'square.stack.3d.up' as IconName,
              androidIcon: 'layers-outline' as MaterialIconName,
            },
          ]
        : []),
      {
        key: 'devices',
        route: '/settings/devices',
        label: t('settings.devices.rowTitle'),
        iosIcon: 'laptopcomputer.and.iphone' as IconName,
        androidIcon: 'devices' as MaterialIconName,
      },
      {
        key: 'sync',
        route: '/settings/sync',
        label: t('settings.sync.rowTitle'),
        iosIcon: 'arrow.clockwise' as IconName,
        androidIcon: 'sync' as MaterialIconName,
      },
      {
        key: 'activity',
        route: '/settings/activity',
        label: t('layouts.activity'),
        iosIcon: 'clock.arrow.circlepath' as IconName,
        androidIcon: 'history' as MaterialIconName,
      },
      {
        key: 'backup',
        route: '/settings/backup',
        label: t('settings.backup.backupAndRestore'),
        iosIcon: 'square.and.arrow.down' as IconName,
        androidIcon: 'cloud-download-outline' as MaterialIconName,
      },
      {
        key: 'storage',
        route: '/settings/storage',
        label: t('settings.storage.storageTitle'),
        iosIcon: 'cylinder.split.1x2' as IconName,
        androidIcon: 'database-outline' as MaterialIconName,
      },
    ],
    [t],
  )
}
