declare const __DEV__: boolean
;(globalThis as { __PEAR_DEV__?: boolean }).__PEAR_DEV__ = __DEV__ === true

export {}
