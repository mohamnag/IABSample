/**
 * In App Billing Plugin
 * @module InAppBilling
 * 
 * @overview This file implements a JavaScript interface for Android to the 
 * native code. The signature of this interface has to match the one from iOS 
 * in `android_iab.js`.
 * 
 * Details and more information on {@link module:InAppBilling}
 * 
 * @author Mohammad Naghavi - {@link mohamnag.com}
 * @license MIT
 */

/**
 * All the failure callbacks have the same signature as this.
 * 
 * @callback errorCallback
 * @param {Object}  error   the information about the error
 * @param {int}     error.errorCode one of the error codes defined with ERR_*
 * @param {string}  error.msg   a textual message intended for developer in order to make debuging easier
 * @param {Object}  error.nativeEvent additional    information mainly intended for debug process which will not be present if the source of error is not IAB
 * @param {int}     error.nativeEvent.IabResponse   response code coming from IabHelper
 * @param {string}  error.nativeEvent.IabMessage    message text coming from IabHelper
 */

var noop = function() {
};

/**
 * @constructor
 * @alias module:InAppBilling
 */
var InAppBilling = function() {
    this.options = {};
};

/**
 * Error codes base.
 * 
 * all the codes bellow should be kept synchronized between: 
 *  * InAppPurchase.m
 *  * InAppBillingPlugin.java 
 *  * android_iab.js 
 *  * ios_iab.js
 * 
 * Be carefull assiging new codes, these are meant to express the REASON of 
 * the error as exact as possible!
 * 
 * @private
 */
ERROR_CODES_BASE = 4983497;
InAppBilling.prototype.ERR_SETUP = ERROR_CODES_BASE + 1;
InAppBilling.prototype.ERR_LOAD = ERROR_CODES_BASE + 2;
InAppBilling.prototype.ERR_PURCHASE = ERROR_CODES_BASE + 3;
InAppBilling.prototype.ERR_LOAD_RECEIPTS = ERROR_CODES_BASE + 4;
InAppBilling.prototype.ERR_CLIENT_INVALID = ERROR_CODES_BASE + 5;
InAppBilling.prototype.ERR_PAYMENT_CANCELLED = ERROR_CODES_BASE + 6;
InAppBilling.prototype.ERR_PAYMENT_INVALID = ERROR_CODES_BASE + 7;
InAppBilling.prototype.ERR_PAYMENT_NOT_ALLOWED = ERROR_CODES_BASE + 8;
InAppBilling.prototype.ERR_UNKNOWN = ERROR_CODES_BASE + 10;
InAppBilling.prototype.ERR_LOAD_INVENTORY = ERROR_CODES_BASE + 11;
InAppBilling.prototype.ERR_HELPER_DISPOSED = ERROR_CODES_BASE + 12;
InAppBilling.prototype.ERR_NOT_INITIALIZED = ERROR_CODES_BASE + 13;
InAppBilling.prototype.ERR_INVENTORY_NOT_LOADED = ERROR_CODES_BASE + 14;
InAppBilling.prototype.ERR_PURCHASE_FAILED = ERROR_CODES_BASE + 15;
InAppBilling.prototype.ERR_JSON_CONVERSION_FAILED = ERROR_CODES_BASE + 16;
InAppBilling.prototype.ERR_INVALID_PURCHASE_PAYLOAD = ERROR_CODES_BASE + 17;
InAppBilling.prototype.ERR_SUBSCRIPTION_NOT_SUPPORTED = ERROR_CODES_BASE + 18;
InAppBilling.prototype.ERR_CONSUME_NOT_OWNED_ITEM = ERROR_CODES_BASE + 19;
InAppBilling.prototype.ERR_CONSUMPTION_FAILED = ERROR_CODES_BASE + 20;


// TODO: this shall be removed!
var protectCall = function (callback, context) {
    try {
        var args = Array.prototype.slice.call(arguments, 2); 
        callback.apply(this, args);
    }
    catch (err) {
        log('exception in ' + context + ': "' + err + '"');
    }
};

/**
 * This function accepts and outputs all the logs, both from native and from JS
 * this is intended to make the debuging easier, you only need to have access to 
 * JS console output.
 * 
 * @param {String} msg
 * @private
 */
InAppBilling.prototype.log = function (msg) {
    console.log("InAppBilling[js]: " + msg);
};

// TODO:remove this, callbacks shall be handled in native
// this stores purchases and their callbacks as long as they are on the queue
InAppBilling.prototype._queuedPurchases = {};

// TODO:remove this, callbacks shall be handled in native
// this stores callbacks for restore function, until restore process is finished
InAppBilling.prototype._restoreCallbacks = {}

/**
 * The success callback for [init]{@link module:InAppBilling#init}.
 * 
 * @callback initSuccessCallback
 */

/**
 * This initiates the plugin, you can optionally pass in one or multiple 
 * product IDs for their details to be loaded during initialization.
 *  
 * @param {initSuccessCallback} success  the success callback
 * @param {errorCallback} fail  the failure callback
 * @param {Object} options  options for configuring the plugin
 * @param {Boolean=} options.showLog    [true] wether to show logs or not, this is strongly recommended to be set to false for production
 * @param {{(String|Array.<String>)}} productIds   an optional list of product IDs to load after initialization was successful
 */
InAppBilling.prototype.init = function (success, fail, options, productIds) {
    this.log('init called!');
    options || (options = {});

    this.options = {
        showLog: options.showLog || true
    };

    // show log or mute the log
    //TODO: this shall mute logs on native too
    if (!this.options.showLog) {
        this.log = noop;
    }

    var hasProductIds = false;
    //Optional Load productIds to Inventory.
    if (typeof productIds !== "undefined") {
        if (typeof productIds === "string") {
            productIds = [productIds];
        }
        if (productIds.length > 0) {
            if (typeof productIds[0] !== 'string') {
                var msg = 'invalid productIds: ' + JSON.stringify(productIds);
                this.log(msg);
                //TODO: this does not match the errorCallback signature!    
                fail(msg);
                return;
            }
            this.log('load ' + JSON.stringify(productIds));
            hasProductIds = true;
        }
    }

    if (hasProductIds) {
        return cordova.exec(success, fail, "InAppPurchase", 'init', [productIds]);
    } else {
        //No SKUs
        return cordova.exec(success, fail, "InAppPurchase", 'init', []);
    }
};

//TODO: complete this and sync it with android
/**
 * @typedef {Object} purchase
 */

/**
 * The success callback for [getPurchases]{@link module:InAppBilling#getPurchases}
 * 
 * @callback getPurchasesSuccessCallback
 * @param {Array.<purchase>} purchaseList
 */

/**
 * This will return the already boutgh items. The consumed items will not be on
 * this list, nor can be retrieved with any other method.
 * 
 * @param {getPurchasesSuccessCallback} success
 * @param {errorCallback} fail
 */
InAppBilling.prototype.getPurchases = function (success, fail) {
    this.log('getPurchases called!');
    
    cordova.exec(success, fail, "InAppPurchase", 'getPurchases', []);    
};

/**
 * The success callback for [buy]{@link module:InAppBilling#buy} and 
 * [subscribe]{@link module:InAppBilling#subscribe}
 * 
 * @callback buySuccessCallback
 * @param {purchase} purchase the data of purchase
 */

/**
 * Buys an item. The product should be loaded before this call. You can either 
 * load items at [init]{@link module:InAppBilling#init} or by calling 
 * [getProductDetails]{@link module:InAppBilling#getProductDetails}.
 * 
 * @param {buySuccessCallback} success  the callback for successful purchse
 * @param {errorCallback} fail  the callback for failed purchase
 * @param {string} productId    the product's ID to be bought
 */
//TODO: sync fail and success callback params with android interface
InAppBilling.prototype.buy = function (success, fail, productId) {
    this.log('buy called!');

    cordova.exec(success, fail, "InAppPurchase", 'buy', [productId]);
};

/**
 * Subscribes to an item. The product should be loaded before this call. 
 * You can either load items at [init]{@link module:InAppBilling#init} or by 
 * calling [getProductDetails]{@link module:InAppBilling#getProductDetails}.
 * 
 * on iOS, subscribing does exactly what buy does!
 * 
 * @param {buySuccessCallback} success  callback for successful subscription
 * @param {errorCallback} fail  callback for failed subscription
 * @param {String} productId    id of the subscription item
 */
InAppBilling.prototype.subscribe = function (success, fail, productId) {
    this.log('subscribe called!');

    InAppBilling.buy(success, fail, productId);
};

/**
 * The success callback for [restore]{@link module:InAppBilling#restore}.
 * This is only available on iOS.
 * 
 * @callback buySuccessCallback
 * @param {purchase} purchase the data of purchase
 */

/**
 * Asks store to re-queue previously processed transaction. Use this with caution 
 * and don't call it again until you get the callback either on success or on
 * failure.
 * 
 * This is only available on iOS and is a must to have for approval.
 * 
 * @param  {restoreSuccessCallback} success
 * @param  {errorCallback} fail
 */
// TODO: maybe on android this can simply do the same as getPurchases
InAppBilling.prototype.restore = function(success, fail) {
    this.log('restore called!');

    cordova.exec(success, fail, "InAppPurchase", 'restoreCompletedTransactions', []);
};

/* 
TODO: complete this struc after syncing with android

on iOS:
    {
        id: "<productId>",
        title: "<localised title>",
        description: "<localised escription>",
        price: "<localised price>"
    }
*/
/**
 * @typedef productDetails
 */

/**
 * This is the success callback for [getProductDetails]{@link module:InAppBilling#getProductDetails}.
 * 
 * @callback getProductDetailsSuccessCallback
 * @param {productDetails} product
 */

/**
 * Get details for a list of product ids. This will also load the products' 
 * details if they are not already loaded.
 * 
 * @param {getProductDetailsSuccessCallback} success    callback for successful query
 * @param {errorCallback} fail  callback for failed query
 * @param {(String|Array.<String>)} productIds
 */
// TODO: shall we report back also the invalid products?
InAppBilling.prototype.getProductDetails = function (success, fail, productIds) {
    this.log('getProductDetails called!');

    if (typeof productIds === "string") {
        productIds = [productIds];
    }
    if (!productIds.length) {
        // Empty array, nothing to do.
        return;
    }
    else {
        if (typeof productIds[0] !== 'string') {
            var msg = 'invalid productIds: ' + JSON.stringify(productIds);
            this.log(msg);
            // TODO: this does not comply to our errorCallback signature
            fail(msg);
            return;
        }
        this.log('load ' + JSON.stringify(productIds));

        cordova.exec(success, fail, "InAppPurchase", "getProductDetails", [productIds]);
    }

    return;
};

/***
 * This consumes a bought product.
 * 
 * @param  {[type]} success
 * @param  {[type]} fail
 * @param  {[type]} productId
 * @return {[type]}
 */
InAppBilling.prototype.consumePurchase = function (success, fail, productId) {
    this.log('consumePurchase called!');


    //TODO: implement it for iOS!
    // return cordova.exec(success, fail, "InAppBillingPlugin", "consumePurchase", [productId]);
};

/***
 * This will return the list of localized products information which are already loaded in the application.
 * 
 * @param  {[type]} success
 * @param  {[type]} fail
 * @return {[type]}
 */
InAppBilling.prototype.getAvailableProducts = function (success, fail) {
    this.log('getAvailableProducts called!');


    //TODO: implement this for iOS!
    // return cordova.exec(success, fail, "InAppBillingPlugin", "getAvailableProducts", ["null"]);
};

module.exports = new InAppBilling();
