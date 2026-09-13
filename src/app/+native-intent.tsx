import { isShareIntakeUrl } from '@/utils/shareIntakeUrl'

type SystemPathEvent = {
  path: string
  initial: boolean
}

export function redirectSystemPath({ path }: SystemPathEvent): string | null {
  try {
    return isShareIntakeUrl(path) ? null : path
  } catch {
    return path
  }
}
