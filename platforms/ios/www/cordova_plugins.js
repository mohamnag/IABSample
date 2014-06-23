cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.mohamnag.inappbilling/www/ios_iab.js",
        "id": "com.mohamnag.inappbilling.InAppBilling",
        "clobbers": [
            "inappbilling"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.mohamnag.inappbilling": "0.0.1"
}
// BOTTOM OF METADATA
});