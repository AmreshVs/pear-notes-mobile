import { router } from 'expo-router'

export function openAskVaultScreen(question: string) {
  router.push({ pathname: '/ask', params: question ? { question } : {} })
}
