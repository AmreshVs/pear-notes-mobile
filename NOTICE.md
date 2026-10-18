# Notices

Pear Notes for iOS and Android is source-available under the PolyForm Strict License 1.0.0 (see `LICENSE`). It includes third-party software, fonts and models, each under its own license.

## Fonts

Bundled fonts are licensed under the SIL Open Font License 1.1. Their copyright lines and the full license text are in `assets/fonts/OFL.txt`.

- Space Mono
- Plus Jakarta Sans (installed from `@expo-google-fonts/plus-jakarta-sans`, license in that package)

## On-device AI models

Models are not part of this repository or the app package. When the user turns on an on-device AI feature, the app downloads the model through the QVAC SDK registry (https://qvac.tether.io).

| Model | Used for | License |
|---|---|---|
| Whisper tiny and base | Voice typing and transcription, Lite and Standard tiers | MIT |
| Silero VAD 5.1.2 | Voice activity detection | MIT |
| NVIDIA Parakeet TDT 0.6B v3 | Voice typing and transcription, Best tier | CC-BY-4.0 |
| EasyOCR Latin recognizer and CRAFT detector | Extract text | Apache-2.0 (recognizer), MIT (detector) |
| Qwen3 0.6B, 1.7B, 4B, 8B | Summaries, titles, writing tools, Ask | Apache-2.0 |
| Qwen3.5 0.8B multimodal | Describe images; Extract text, Best tier | Apache-2.0 |
| EmbeddingGemma 300M | Vault search index | Gemma Terms of Use (https://ai.google.dev/gemma/terms) |
| Bergamot translation models | Translate | MPL-2.0 |

Parakeet TDT is provided by NVIDIA under CC-BY-4.0. Gemma is provided under and subject to the Gemma Terms of Use; use of EmbeddingGemma must follow the Gemma Prohibited Use Policy (https://ai.google.dev/gemma/prohibited_use_policy).

## Software dependencies

Direct dependencies and their licenses are listed below. Each package, and each of its own dependencies, includes its license in `node_modules/<package>/`. No dependency is used under a copyleft license; `node-forge` and `unorm` are dual-licensed and used under their BSD and MIT terms.

The Pear and Holepunch runtime (Bare, Autobase, Hypercore, Hyperswarm and related modules) is licensed under Apache-2.0.

| Package | Version | License |
|---|---|---|
| @expo-google-fonts/plus-jakarta-sans | 0.4.2 | MIT AND OFL-1.1 |
| @expo/ui | 56.0.26 | MIT |
| @pchmn/expo-material3-theme | 1.4.0 | MIT |
| @qvac/asr-ggml-android-arm64 | 0.7.0 | Apache-2.0 |
| @qvac/asr-ggml-ios | 0.7.0 | Apache-2.0 |
| @qvac/fabric-android-arm64 | 0.18.1 | Apache-2.0 |
| @qvac/fabric-ios | 0.18.1 | Apache-2.0 |
| @qvac/sdk | 0.21.0 | Apache-2.0 |
| @react-native-community/slider | 5.2.0 | MIT |
| @react-native-masked-view/masked-view | 0.3.2 | MIT |
| @react-native-vector-icons/material-design-icons | 13.1.2 | MIT |
| @reduxjs/toolkit | 2.12.0 | MIT |
| @tiptap/core | 3.27.2 | MIT |
| @tiptap/extension-code-block-lowlight | 3.22.2 | MIT |
| @tiptap/extension-highlight | 3.22.2 | MIT |
| @tiptap/extension-image | 3.22.2 | MIT |
| @tiptap/extension-link | 3.22.2 | MIT |
| @tiptap/extension-placeholder | 3.22.2 | MIT |
| @tiptap/extension-strike | 3.22.2 | MIT |
| @tiptap/extension-subscript | 3.22.2 | MIT |
| @tiptap/extension-superscript | 3.22.2 | MIT |
| @tiptap/extension-table | 3.22.2 | MIT |
| @tiptap/extension-table-cell | 3.22.2 | MIT |
| @tiptap/extension-table-header | 3.22.2 | MIT |
| @tiptap/extension-table-row | 3.22.2 | MIT |
| @tiptap/extension-task-item | 3.22.2 | MIT |
| @tiptap/extension-task-list | 3.22.2 | MIT |
| @tiptap/extension-text-align | 3.22.2 | MIT |
| @tiptap/extension-underline | 3.22.2 | MIT |
| @tiptap/starter-kit | 3.22.2 | MIT |
| @tiptap/y-tiptap | 3.0.6 | MIT |
| b4a | 1.8.0 | Apache-2.0 |
| buffer | 6.0.3 | MIT |
| date-fns | 4.1.0 | MIT |
| expo | 56.0.21 | MIT |
| expo-asset | 56.0.24 | MIT |
| expo-audio | 56.0.13 | MIT |
| expo-background-task | 56.0.27 | MIT |
| expo-battery | 56.0.4 | MIT |
| expo-blur | 56.0.4 | MIT |
| expo-camera | 56.0.8 | MIT |
| expo-clipboard | 56.0.4 | MIT |
| expo-constants | 56.0.25 | MIT |
| expo-crypto | 56.0.5 | MIT |
| expo-device | 56.0.4 | MIT |
| expo-document-picker | 56.0.4 | MIT |
| expo-file-system | 56.0.11 | MIT |
| expo-font | 56.0.7 | MIT |
| expo-glass-effect | 56.0.4 | MIT |
| expo-haptics | 56.0.3 | MIT |
| expo-image | 56.0.12 | MIT |
| expo-image-manipulator | 56.0.26 | MIT |
| expo-image-picker | 56.0.25 | MIT |
| expo-linking | 56.0.17 | MIT |
| expo-local-authentication | 56.0.5 | MIT |
| expo-localization | 56.0.6 | MIT |
| expo-network | 56.0.5 | MIT |
| expo-router | 56.2.20 | MIT |
| expo-screen-capture | 56.0.5 | MIT |
| expo-secure-store | 56.0.4 | MIT |
| expo-splash-screen | 56.0.15 | MIT |
| expo-status-bar | 56.0.4 | MIT |
| expo-symbols | 56.0.7 | MIT |
| expo-system-ui | 56.0.5 | MIT |
| expo-task-manager | 56.0.27 | MIT |
| expo-video | 56.1.4 | MIT |
| expo-web-browser | 56.0.6 | MIT |
| framed-stream | 1.0.1 | MIT |
| highlight.js | 11.11.1 | BSD-3-Clause |
| hrpc | 4.3.1 | Apache-2.0 |
| i18next | 26.0.3 | MIT |
| lowlight | 3.3.0 | MIT |
| react | 19.2.3 | MIT |
| react-dom | 19.2.3 | MIT |
| react-i18next | 17.0.2 | MIT |
| react-native | 0.85.3 | MIT |
| react-native-bare-kit | 0.15.5 | Apache-2.0 |
| react-native-document-scanner-plugin | 2.0.4 | MIT |
| react-native-enriched | 0.4.1 | MIT |
| react-native-gesture-handler | 2.31.2 | MIT |
| react-native-paper | 5.15.3 | MIT |
| react-native-qrcode-svg | 6.3.21 | MIT |
| react-native-reanimated | 4.3.1 | MIT |
| react-native-safe-area-context | 5.7.0 | MIT |
| react-native-screens | 4.26.2 | MIT |
| react-native-svg | 15.15.4 | MIT |
| react-native-web | 0.21.2 | MIT |
| react-native-webview | 13.16.1 | MIT |
| react-native-worklets | 0.8.3 | MIT |
| react-redux | 9.3.0 | MIT |
| redux | 5.0.1 | MIT |
| redux-saga | 1.5.0 | MIT |
| which-runtime | 1.3.2 | Apache-2.0 |
