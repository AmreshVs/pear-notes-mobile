import { Keyboard } from 'react-native'

import type { VoiceTypingMode } from '@/components/useVoiceTypingSheet'

export type AiToolScope = 'note' | 'selection'
export type AiToolGroup = 'edit' | 'understand' | 'note'

export interface AiTool {
  id: string
  mode: VoiceTypingMode
  scope: AiToolScope
  group: AiToolGroup
  labelKey: string
}

export const AI_TOOL_GROUPS: { id: AiToolGroup; labelKey: string }[] = [
  { id: 'edit', labelKey: 'localAi.writingTools.editGroup' },
  { id: 'understand', labelKey: 'localAi.writingTools.understandGroup' },
  { id: 'note', labelKey: 'localAi.writingTools.noteGroup' },
]

const REWRITE_TOOL_MODES: VoiceTypingMode[] = [
  'fixGrammar',
  'rewrite',
  'makeShorter',
  'makeProfessional',
  'makeFriendly',
]

const KEYBOARD_HIDE_TIMEOUT_MS = 450

const tool = (
  mode: VoiceTypingMode,
  scope: AiToolScope,
  group: AiToolGroup,
  labelKey: string,
): AiTool => ({ id: `${scope}:${mode}`, mode, scope, group, labelKey })

export function buildAiTools({
  summarizeReady,
  translateReady,
  hasSelection,
}: {
  summarizeReady: boolean
  translateReady: boolean
  hasSelection: boolean
}): AiTool[] {
  const tools: AiTool[] = []
  if (hasSelection && summarizeReady) {
    for (const mode of REWRITE_TOOL_MODES) {
      tools.push(tool(mode, 'selection', 'edit', `localAi.${mode}.menuLabel`))
    }
    tools.push(
      tool('summarizeNote', 'selection', 'understand', 'localAi.summarizeSelection.menuLabel'),
      tool('keyPoints', 'selection', 'understand', 'localAi.keyPointsSelection.menuLabel'),
    )
  }
  if (hasSelection && translateReady) {
    tools.push(tool('translate', 'selection', 'understand', 'localAi.translateSelection.menuLabel'))
  }
  if (summarizeReady) {
    tools.push(
      tool('summarizeNote', 'note', 'note', 'localAi.summarizeNote.menuLabel'),
      tool('suggestTitle', 'note', 'note', 'localAi.suggestTitle.menuLabel'),
      tool('keyPoints', 'note', 'note', 'localAi.keyPoints.menuLabel'),
    )
  }
  if (translateReady) {
    tools.push(tool('translate', 'note', 'note', 'localAi.translateNote.menuLabel'))
  }
  return tools
}

export function hideKeyboard(blur: () => void): Promise<void> {
  blur()
  if (!Keyboard.isVisible()) return Promise.resolve()
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      subscription.remove()
      resolve()
    }
    const subscription = Keyboard.addListener('keyboardDidHide', finish)
    const timer = setTimeout(finish, KEYBOARD_HIDE_TIMEOUT_MS)
    Keyboard.dismiss()
  })
}
