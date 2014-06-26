cordova.define("com.mohamnag.inappbilling.InAppBilling", function(require, exports, module) { /**
 * In App Billing Plugin
 * @module InAppBilling
 * 
 * @overview This file implements a JavaScript interface for Android to the 
 * native code. The signature of this interface has to match the one from iOS 
 * in `iso_iab.js`.
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

/***
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

/**
 * This function accepts and outputs all the logs, both from native and from JS
 * this is intended to make the debuging easier, you only need to have access to 
 * JS console output.
 * 
 * @param {String} msg
 * @private
 */
InAppBilling.prototype.log = function(msg) {
    console.log("InAppBilling[js]: " + msg);
};

/**
 * The success callback for [init]{@link module:InAppBilling#init}.
 * 
 * @callback initSuccessCallback
 * @param {Array.<ProductDetails>} products
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
InAppBilling.prototype.init = function(success, fail, options, productIds) {
    options || (options = {});

    this.options = {
        showLog: options.showLog || false
    };
        
    // show log or mute the log
    //TODO: this shall mute logs on native too
    if (this.options.showLog === true) {
        this.log = InAppBilling.prototype.log;
    }
    else {
        this.log = noop;
    }

    // call to log, only after the situation with log is clear
    this.log('init called!');

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
        return cordova.exec(success, fail, "InAppBillingPlugin", "init", [productIds]);
    } else {
        //No SKUs
        return cordova.exec(success, fail, "InAppBillingPlugin", "init", []);
    }
};

//TODO: complete this and sync it with iOS
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
InAppBilling.prototype.getPurchases = function(success, fail) {
    this.log('getPurchases called!');
    return cordova.exec(success, fail, "InAppBillingPlugin", "getPurchases", ["null"]);
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
 * [loadProductDetails]{@link module:InAppBilling#loadProductDetails}.
 * 
 * @param {buySuccessCallback} success  the callback for successful purchse
 * @param {errorCallback} fail  the callback for failed purchase
 * @param {string} productId    the product's ID to be bought
 */
InAppBilling.prototype.buy = function(success, fail, productId) {
    this.log('buy called!');
    return cordova.exec(success, fail, "InAppBillingPlugin", "buy", [productId]);
};

/**
 * Subscribes to an item. The product should be loaded before this call. 
 * You can either load items at [init]{@link module:InAppBilling#init} or by 
 * calling [loadProductDetails]{@link module:InAppBilling#loadProductDetails}.
 * 
 * @param {buySuccessCallback} success  callback for successful subscription
 * @param {errorCallback} fail  callback for failed subscription
 * @param {String} productId    id of the subscription item
 */
InAppBilling.prototype.subscribe = function(success, fail, productId) {
    this.log('subscribe called!');
    return cordova.exec(success, fail, "InAppBillingPlugin", "subscribe", [productId]);
};

/**
 * This is the callback for {@link module:InAppBilling#consumePurchase}
 * 
 * @callback consumePurchaseSuccessCallback
 * @param {purchase} purchase
 */

/**
 * Consume an item. The product should be of consumable type.
 * 
 * @param {consumePurchaseSuccessCallback} success callback for successful consumption
 * @param {type} fail   callback for failed consumption
 * @param {type} productId  id of the already bought product (not the purchase itself)
 */
InAppBilling.prototype.consumePurchase = function(success, fail, productId) {
    this.log('consumePurchase called!');
    return cordova.exec(success, fail, "InAppBillingPlugin", "consumePurchase", [productId]);
};

/**
 * @typedef ProductDetails
 * @property {string} id the product id
 * @property {string} type type of product, possible values: inapp, subscription
 * @property {string} price the formatted localized price
 * @property {int} priceMicros the price in micro amount (2$ ~> 2000000)
 * @property {string} currencyCode the currency code used for localized price
 * @property {string} title humanreadable title of product
 * @property {string} description description of product
 */

/**
 * The success callback for [getLoadedProducts]{@link module:InAppBilling#getLoadedProducts}.
 * 
 * @callback getLoadedProductsSuccessCallback
 * @param {Array.<ProductDetails>} products
 */

/**
 * Get all the loaded products. Products should be loaded before this call. 
 * You can either load items at [init]{@link module:InAppBilling#init} or by 
 * calling [loadProductDetails]{@link module:InAppBilling#loadProductDetails}.
 * 
 * @param {getLoadedProductsSuccessCallback} success callback for successful query
 * @param {errorCallback} fail  callback for failed query
 */
InAppBilling.prototype.getLoadedProducts = function(success, fail) {
    this.log('getLoadedProducts called!');
    return cordova.exec(success, fail, "InAppBillingPlugin", "getLoadedProducts", ["null"]);
};

/**
 * This is the success callback for [loadProductDetails]{@link module:InAppBilling#loadProductDetails}.
 * This will be called when process is successfully finished and will receive a list of valid and 
 * loaded products.
 *
 * Invalid products will not be on this list.
 * 
 * @callback loadProductDetailsSuccessCallback
 * @param {Array.<ProductDetails>} products
 */

/**
 * Get details for a list of product ids. This will also load the products' 
 * details if they are not already loaded. Will only return the product details
 * for the **valid product ids** from the requested list. Will not return the items
 * which have been loaded before. Use [getLoadedProducts]{@link module:InAppBilling#getLoadedProducts}
 * to get the complete list of all products loaded ever.
 * 
 * @param {loadProductDetailsSuccessCallback} success    callback for successful query
 * @param {errorCallback} fail  callback for failed query
 * @param {(String|Array.<String>)} productIds
 */
InAppBilling.prototype.loadProductDetails = function(success, fail, productIds) {
    this.log('loadProductDetails called!');

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

        return cordova.exec(success, fail, "InAppBillingPlugin", "loadProductDetails", [productIds]);
    }
};

module.exports = new InAppBilling();
});
