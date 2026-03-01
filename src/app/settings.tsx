import { router, Stack } from 'expo-router'
import {
    Copy,
    Plus,
    Settings as SettingsIcon,
    ShieldCheck,
    Smartphone,
    X,
} from 'lucide-react-native'
import React, { useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native'

import { Text, useTheme, View } from '@/components/Themed'

type SettingsTab = 'General' | 'Link & Sync'

export default function SettingsScreen() {
  const { colors, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>('General')
  const [syncTab, setSyncTab] = useState<'Link' | 'Devices'>('Link')

  const renderSidebarItem = (title: SettingsTab, icon: any) => {
    const isActive = activeTab === title
    const Icon = icon
    return (
      <Pressable
        onPress={() => setActiveTab(title)}
        style={({ pressed }) => [
          styles.sidebarItem,
          {
            backgroundColor: isActive
              ? isDark
                ? 'rgba(220, 163, 35, 0.15)'
                : 'rgba(220, 163, 35, 0.1)'
              : pressed
                ? colors.surfaceSecondary
                : 'transparent',
          },
        ]}
      >
        <Icon size={18} color={isActive ? colors.primary : colors.textSecondary} />
        <Text
          variant="bodyBold"
          style={[styles.sidebarText, { color: isActive ? colors.primary : colors.textSecondary }]}
        >
          {title}
        </Text>
      </Pressable>
    )
  }

  const renderGeneral = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          INTERFACE
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.cardRow}>
            <View>
              <Text variant="bodyBold">App Theme</Text>
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                Select your preferred aesthetic.
              </Text>
            </View>
            <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={[styles.segment, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>System</Text>
              </View>
              <View style={styles.segment}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  Light
                </Text>
              </View>
              <View style={styles.segment}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  Dark
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          NOTES LIST
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable style={styles.cardRow}>
            <View>
              <Text variant="bodyBold">Sort notes by</Text>
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                Choose your preferred sorting order.
              </Text>
            </View>
            <View style={styles.dropdown}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                Date Edited
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="caption" style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          EDITOR
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.cardRow}>
            <View>
              <Text variant="bodyBold">Font Family</Text>
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                Primary typeface for notes.
              </Text>
            </View>
            <View style={styles.dropdown}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Inter</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border, opacity: 0.1 }]} />
          <View style={styles.cardRow}>
            <View>
              <Text variant="bodyBold">Default text size</Text>
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                Adjust the editor's base font size.
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>16px</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  )

  const renderSync = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.syncTabHeader}>
        <View style={[styles.tabSwitcher, { backgroundColor: colors.surfaceSecondary }]}>
          <Pressable
            onPress={() => setSyncTab('Link')}
            style={[styles.tabButton, syncTab === 'Link' && { backgroundColor: colors.primary }]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: syncTab === 'Link' ? '#FFF' : colors.textSecondary },
              ]}
            >
              Link Device
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSyncTab('Devices')}
            style={[styles.tabButton, syncTab === 'Devices' && { backgroundColor: colors.primary }]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: syncTab === 'Devices' ? '#FFF' : colors.textSecondary },
              ]}
            >
              My Devices
            </Text>
          </Pressable>
        </View>
      </View>

      {syncTab === 'Link' ? (
        <View style={styles.syncContent}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.heroLayout}>
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: isDark ? 'rgba(220,163,35,0.1)' : 'rgba(220,163,35,0.05)' },
                ]}
              >
                <ShieldCheck size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyBold" style={{ fontSize: 18 }}>
                  Invitation Ready
                </Text>
                <Text variant="caption" style={{ color: colors.textSecondary, opacity: 0.7 }}>
                  Permanent Link
                </Text>
              </View>
            </View>

            <View style={styles.codeContainer}>
              <Text variant="caption" style={[styles.codeLabel, { color: colors.textSecondary }]}>
                SECURE PAIR CODE
              </Text>
              <View style={[styles.codeBox, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}>
                <Text numberOfLines={1} style={styles.codeText}>
                  0101d6afb7278b45878cf53fea3b501f5ecf20c4d288312073c675a...
                </Text>
              </View>
            </View>

            <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Copy size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Copy Invite Code</Text>
            </Pressable>
          </View>

          <View style={styles.inviteSection}>
            <View style={styles.inviteHeader}>
              <Plus size={14} color={colors.primary} />
              <Text style={[styles.inviteHeaderText, { color: colors.text }]}>
                Already have an invite?
              </Text>
            </View>
            <View style={styles.inviteInputRow}>
              <TextInput
                placeholder="Paste invite code here..."
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.inviteInput,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
              <Pressable style={[styles.linkBtn, { borderColor: colors.textSecondary }]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>
                  Link Device
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.devicesContent}>
          <Text
            variant="caption"
            style={[styles.sectionHeader, { color: colors.textSecondary, marginLeft: 0 }]}
          >
            THIS DEVICE
          </Text>
          <View
            style={[
              styles.deviceCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.deviceIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Smartphone size={24} color={colors.text} />
              <View style={[styles.onlineIndicator, { backgroundColor: '#34c759' }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">iPhone 15 Pro</Text>
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                IOS
              </Text>
            </View>
          </View>

          <Text
            variant="caption"
            style={[
              styles.sectionHeader,
              { color: colors.textSecondary, marginLeft: 0, marginTop: 24 },
            ]}
          >
            OTHER DEVICES
          </Text>
          <View style={styles.emptyDevices}>
            <Smartphone
              size={32}
              color={colors.textSecondary}
              style={{ opacity: 0.2, marginBottom: 12 }}
            />
            <Text style={{ color: colors.textSecondary, opacity: 0.5, fontSize: 14 }}>
              No other devices connected yet.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.sidebar, { borderRightColor: colors.border }]}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.title}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>PREFERENCE HUB</Text>
        </View>

        <View style={styles.sidebarContent}>
          {renderSidebarItem('General', SettingsIcon)}
          {renderSidebarItem('Link & Sync', Smartphone)}
        </View>

        <Pressable
          onPress={() => router.back()}
          style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]}
        >
          <X size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>{activeTab}</Text>
          <Text variant="caption" style={{ color: colors.textSecondary }}>
            {activeTab === 'General'
              ? 'Customize your personal workspace experience.'
              : 'Manage your secure peer-to-peer network and linked devices.'}
          </Text>
        </View>

        {activeTab === 'General' ? renderGeneral() : renderSync()}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 140,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 60,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  sidebarHeader: {
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  sidebarContent: {
    gap: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 10,
  },
  sidebarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    bottom: 40,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  contentHeader: {
    marginBottom: 32,
  },
  contentTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  contentScroll: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(220,163,35,0.1)',
  },
  syncTabHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  syncContent: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 32,
  },
  heroLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeContainer: {
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  codeBox: {
    padding: 14,
    borderRadius: 12,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#DCA323',
    fontWeight: '700',
    opacity: 0.9,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inviteSection: {
    marginTop: 8,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inviteHeaderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteInput: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  linkBtn: {
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devicesContent: {
    flex: 1,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1c1c1e',
  },
  emptyDevices: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
    borderRadius: 20,
  },
})
