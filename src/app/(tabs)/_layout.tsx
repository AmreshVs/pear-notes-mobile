import { NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'

import { useTheme } from '@/components/Themed'

export default function TabsLayout() {
  const { isDark } = useTheme()

  return (
    <NativeTabs tintColor="#DCA323">
      <NativeTabs.Trigger name="(folders)">
        <NativeTabs.Trigger.Icon sf="folder" />
        <NativeTabs.Trigger.Label>Folders</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(search)" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
