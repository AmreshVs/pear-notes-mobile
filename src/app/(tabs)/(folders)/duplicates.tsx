import { Redirect } from 'expo-router'

import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'

import { DuplicatesPane } from '@/components/tools/DuplicatesPane'
import { useAiSuggestionOn } from '@/hooks/useAiSuggestionOn'

export default function DuplicatesScreen() {
  const on = useAiSuggestionOn(AI_SUGGESTION.RELATED)
  if (!on) return <Redirect href="/" />
  return <DuplicatesPane />
}
