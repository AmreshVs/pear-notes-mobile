import { Linking } from 'react-native'

const REPORT_URL = 'https://amreshvs.github.io/pear-notes/contact/?topic=ai-result'

export function openReportProblem() {
  Linking.openURL(REPORT_URL).catch(() => {})
}
