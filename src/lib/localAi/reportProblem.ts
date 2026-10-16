import { Linking } from 'react-native'

const REPORT_EMAIL = 'vsamreshpro@gmail.com'

export function openReportProblem(subject: string) {
  Linking.openURL(`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {})
}
