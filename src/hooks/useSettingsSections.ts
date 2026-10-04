import type React from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'

import type { IconName } from '@/components/SymbolIcon'

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

export type SettingsGroup = 'vault' | 'device'

export type SettingsSection = {
  key: string
  group: SettingsGroup
  route: string
  label: string
  iosIcon: IconName
  androidIcon: MaterialIconName
}

const SETTINGS_GROUP_ORDER: SettingsGroup[] = ['vault', 'device']

export function useSettingsSections(): SettingsSection[] {
  const { t } = useTranslation()
  return useMemo(
    () => [
      {
        key: 'general',
        group: 'vault' as SettingsGroup,
        route: '/settings/general',
        label: t('layouts.general'),
        iosIcon: 'slider.horizontal.3' as IconName,
        androidIcon: 'tune-variant' as MaterialIconName,
      },
      {
        key: 'privacy',
        group: 'vault' as SettingsGroup,
        route: '/settings/privacy',
        label: t('settings.privacy.rowTitle'),
        iosIcon: 'checkmark.shield' as IconName,
        androidIcon: 'shield-check-outline' as MaterialIconName,
      },
      {
        key: 'devices',
        group: 'vault' as SettingsGroup,
        route: '/settings/devices',
        label: t('settings.devices.rowTitle'),
        iosIcon: 'laptopcomputer.and.iphone' as IconName,
        androidIcon: 'devices' as MaterialIconName,
      },
      {
        key: 'sync',
        group: 'vault' as SettingsGroup,
        route: '/settings/sync',
        label: t('settings.sync.rowTitle'),
        iosIcon: 'arrow.clockwise' as IconName,
        androidIcon: 'sync' as MaterialIconName,
      },
      {
        key: 'activity',
        group: 'vault' as SettingsGroup,
        route: '/settings/activity',
        label: t('layouts.activity'),
        iosIcon: 'clock.arrow.circlepath' as IconName,
        androidIcon: 'history' as MaterialIconName,
      },
      {
        key: 'backup',
        group: 'vault' as SettingsGroup,
        route: '/settings/backup',
        label: t('settings.backup.backupAndRestore'),
        iosIcon: 'square.and.arrow.down' as IconName,
        androidIcon: 'cloud-download-outline' as MaterialIconName,
      },
      {
        key: 'vaultStorage',
        group: 'vault' as SettingsGroup,
        route: '/settings/vault-storage',
        label: t('layouts.vaultStorage'),
        iosIcon: 'chart.pie' as IconName,
        androidIcon: 'chart-donut' as MaterialIconName,
      },
      ...(LOCAL_AI_ENABLED
        ? [
            {
              key: 'onDeviceAi',
              group: 'device' as SettingsGroup,
              route: '/settings/on-device-ai',
              label: t('settings.onDeviceAi.rowTitle'),
              iosIcon: 'sparkles' as IconName,
              androidIcon: 'creation-outline' as MaterialIconName,
            },
          ]
        : []),
      {
        key: 'storage',
        group: 'device' as SettingsGroup,
        route: '/settings/storage',
        label: t('settings.storage.storageTitle'),
        iosIcon: 'cylinder.split.1x2' as IconName,
        androidIcon: 'database-outline' as MaterialIconName,
      },
      ...(isMultiVaultEnabled()
        ? [
            {
              key: 'vaults',
              group: 'device' as SettingsGroup,
              route: '/settings/vaults',
              label: t('vaults.rowTitle'),
              iosIcon: 'square.stack.3d.up' as IconName,
              androidIcon: 'layers-outline' as MaterialIconName,
            },
          ]
        : []),
    ],
    [t],
  )
}

export function useSettingsSectionGroups(): SettingsSection[][] {
  const sections = useSettingsSections()
  return useMemo(
    () =>
      SETTINGS_GROUP_ORDER.map((group) =>
        sections.filter((section) => section.group === group),
      ).filter((groupSections) => groupSections.length > 0),
    [sections],
  )
}
