import { Keyboard } from 'react-native'

import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'

import type { VoiceTypingMode } from '@/components/useVoiceTypingSheet'
import { dismissKeyboard, KEYBOARD_HIDE_TIMEOUT_MS } from '@/lib/keyboard'

export type AiToolScope = 'note' | 'selection'
export type AiToolGroup = 'ask' | 'edit' | 'understand' | 'note'
export type AiToolMode = VoiceTypingMode | 'ask'

export interface AiTool {
  id: string
  mode: AiToolMode
  scope: AiToolScope
  group: AiToolGroup
  labelKey: string
  feature: string
}

export const AI_TOOL_GROUPS: { id: AiToolGroup; labelKey: string }[] = [
  { id: 'ask', labelKey: 'localAi.ask.group' },
  { id: 'edit', labelKey: 'localAi.writingTools.editGroup' },
  { id: 'understand', labelKey: 'localAi.writingTools.understandGroup' },
  { id: 'note', labelKey: 'localAi.writingTools.noteGroup' },
]

const REWRITE_TOOL_MODES: VoiceTypingMode[] = [
  'fixGrammar',
  'cleanUp',
  'rewrite',
  'makeShorter',
  'makeProfessional',
  'makeFriendly',
  'myStyle',
]

const WRITING = LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS as string
const TRANSLATE = LOCAL_AI_FEATURE.TRANSLATE_NOTES as string

const tool = (
  mode: AiToolMode,
  scope: AiToolScope,
  group: AiToolGroup,
  labelKey: string,
  feature: string,
): AiTool => ({ id: `${scope}:${mode}`, mode, scope, group, labelKey, feature })

export function buildAiTools({ hasSelection }: { hasSelection: boolean }): AiTool[] {
  if (hasSelection) {
    return [
      tool('ask', 'selection', 'ask', 'localAi.ask.menuLabelSelection', WRITING),
      ...REWRITE_TOOL_MODES.map((mode) =>
        tool(mode, 'selection', 'edit', `localAi.${mode}.menuLabel`, WRITING),
      ),
      tool(
        'summarizeNote',
        'selection',
        'understand',
        'localAi.summarizeSelection.menuLabel',
        WRITING,
      ),
      tool('keyPoints', 'selection', 'understand', 'localAi.keyPointsSelection.menuLabel', WRITING),
      tool(
        'translate',
        'selection',
        'understand',
        'localAi.translateSelection.menuLabel',
        TRANSLATE,
      ),
    ]
  }
  return [
    tool('ask', 'note', 'ask', 'localAi.ask.menuLabelNote', WRITING),
    tool('summarizeNote', 'note', 'note', 'localAi.summarizeNote.menuLabel', WRITING),
    tool('suggestTitle', 'note', 'note', 'localAi.suggestTitle.menuLabel', WRITING),
    tool('keyPoints', 'note', 'note', 'localAi.keyPoints.menuLabel', WRITING),
    tool('translate', 'note', 'note', 'localAi.translateNote.menuLabel', TRANSLATE),
  ]
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
    dismissKeyboard()
  })
}
