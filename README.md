# IAB Sample
This is a multi platform sample application for [Cordova IAB plugin](https://github.com/mohamnag/InAppBilling).

For more details on the plugin refer to its github page and wiki.

## Installation
The code is known to be functional, compiled with Phonegap CLI:

```bach
$ phonegap run android
```

### Android
Because this plugin needs a signed APK for a serious test, the siging functionality is already activated. All you need is to do is:
- copy/rename the `platforms/android/secure.properties.template` to `platforms/android/secure.properties`
- open it and fill your own information, if you dont have a key refer to [this tutorial](http://developer.android.com/tools/publishing/app-signing.html) to create one.

# Lisence
This code is provided to you under MIT license. A full copy is available here.
