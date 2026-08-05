# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# react-native-bare-kit ships no consumer rules and these classes are resolved
# from native code via FindClass/GetMethodID, so R8 must not rename or remove
# them or their nested native-invoked callback interfaces.
-keep class to.holepunch.bare.kit.Worklet { *; }
-keep class to.holepunch.bare.kit.Worklet$* { *; }
-keep class to.holepunch.bare.kit.IPC { *; }
-keep class to.holepunch.bare.kit.IPC$* { *; }

# bare-kit's MessagingService extends FirebaseMessagingService, but Firebase is
# an optional dependency this app does not use. It is deliberately not kept so
# R8 can drop it; this suppresses the dangling references it leaves behind.
-dontwarn com.google.firebase.messaging.**

-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# WebView bridge used by the Tiptap editor.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
