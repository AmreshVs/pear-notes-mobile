import { AlertCircle, RotateCcw } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'

import { Text, Theme, View, useThemedStyles } from './Themed'

interface ErrorScreenProps {
  message: string
  onRetry: () => void
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ message, onRetry }) => {
  const styles = useThemedStyles(createStyles)

  return (
    <View style={styles.container}>
      <AlertCircle size={64} color={styles.icon.color} strokeWidth={1.5} style={styles.icon} />
      <Text style={styles.title}>Initialization Failed</Text>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.7}>
        <RotateCcw size={20} color={styles.buttonText.color} style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    icon: {
      color: theme.colors.error,
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 10,
    },
    message: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 22,
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonIcon: {
      marginRight: 8,
    },
    buttonText: {
      color: theme.isDark ? '#000' : '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  })
