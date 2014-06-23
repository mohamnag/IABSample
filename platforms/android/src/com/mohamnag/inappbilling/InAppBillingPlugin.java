/**
 * In App Billing Plugin
 *
 * Details and more information under:
 * https://github.com/mohamnag/InAppBilling/wiki
 */
package com.mohamnag.inappbilling;

import com.mohamnag.inappbilling.helper.Purchase;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import java.util.List;
import java.util.ArrayList;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;

import com.mohamnag.inappbilling.helper.IabHelper;
import com.mohamnag.inappbilling.helper.IabResult;
import com.mohamnag.inappbilling.helper.Inventory;
import com.mohamnag.inappbilling.helper.SkuDetails;

import android.content.Intent;

public class InAppBillingPlugin extends CordovaPlugin {

    /**
     * Error codes.
     *
     * keep synchronized between: * InAppPurchase.m * InAppBillingPlugin.java *
     * android_iab.js * ios_iab.js
     *
     * Be carefull assiging new codes, these are meant to express the REASON of
     * the error as exact as possible!
     */
    private static final int ERROR_CODES_BASE = 4983497;

    private static final int ERR_SETUP = ERROR_CODES_BASE + 1;
    private static final int ERR_LOAD = ERROR_CODES_BASE + 2;
    private static final int ERR_PURCHASE = ERROR_CODES_BASE + 3;
    private static final int ERR_LOAD_RECEIPTS = ERROR_CODES_BASE + 4;
    private static final int ERR_CLIENT_INVALID = ERROR_CODES_BASE + 5;
    private static final int ERR_PAYMENT_CANCELLED = ERROR_CODES_BASE + 6;
    private static final int ERR_PAYMENT_INVALID = ERROR_CODES_BASE + 7;
    private static final int ERR_PAYMENT_NOT_ALLOWED = ERROR_CODES_BASE + 8;
    private static final int ERR_UNKNOWN = ERROR_CODES_BASE + 10;
    private static final int ERR_LOAD_INVENTORY = ERROR_CODES_BASE + 11;
    private static final int ERR_HELPER_DISPOSED = ERROR_CODES_BASE + 12;
    private static final int ERR_NOT_INITIALIZED = ERROR_CODES_BASE + 13;
    private static final int ERR_INVENTORY_NOT_LOADED = ERROR_CODES_BASE + 14;
    private static final int ERR_PURCHASE_FAILED = ERROR_CODES_BASE + 15;
    private static final int ERR_JSON_CONVERSION_FAILED = ERROR_CODES_BASE + 16;
    private static final int ERR_INVALID_PURCHASE_PAYLOAD = ERROR_CODES_BASE + 17;
    private static final int ERR_SUBSCRIPTION_NOT_SUPPORTED = ERROR_CODES_BASE + 18;
    private static final int ERR_CONSUME_NOT_OWNED_ITEM = ERROR_CODES_BASE + 19;
    private static final int ERR_CONSUMPTION_FAILED = ERROR_CODES_BASE + 20;

    private boolean initialized = false;

    //TODO: set this from JS, according to what is defined in options
    private final Boolean ENABLE_DEBUG_LOGGING = true;

    private final String TAG = "CORDOVA_BILLING";

    //TODO: move it to config file: https://github.com/poiuytrez/AndroidInAppBilling/pull/52/files
    /* base64EncodedPublicKey should be YOUR APPLICATION'S PUBLIC KEY
     * (that you got from the Google Play developer console). This is not your
     * developer public key, it's the *app-specific* public key.
     *
     * Instead of just storing the entire literal string here embedded in the
     * program,  construct the key at runtime from pieces or
     * use bit manipulation (for example, XOR with some other string) to hide
     * the actual key.  The key itself is not secret information, but we don't
     * want to make it easy for an attacker to replace the public key with one
     * of their own and then fake messages from the server.
     */
    private final String base64EncodedPublicKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAogC9VXkak0pUlNZLpT90jKyejwrsd6ASjL1wuIJgpk3TyoOEYR3aUdthTfVEnqsEdOWNb/uc0CsFfsnGIchiQmiL3oSM7WFpC4/zWVYl8M+oe3BWczEMKSC7XR/XXjsnK7dMWvPFkProF9+4yDCHy+zpPT0HKP0UZOp0GTNGjgKP2SIye0Whx985vo6edsrKeNe7aZZS63N8X6bRIMAHKgyO4vowZJn+QYGzHh9ZSknExfJFqBKhMr5ytI2shhzFMx0tQPd76SKjIRZ8e6iQAyJkMjLnCBbhfB4FoguSXijB4PCZxTJ0fmO6OGIhWf3hz/wLRapGlRXtEuV2HVTH5QIDAQAB";

    /**
     * request code base for the purchase flow
     */
    static int RC_REQUEST_BASE = 10000;

    /**
     * The helper object
     */
    IabHelper mHelper;

    /**
     * A quite up to date inventory of available items and purchase items
     */
    Inventory myInventory;

    /**
     * This is a bridge to the log function in JavaScript world. We pass the
     * logs there for an easier debug for end developers.
     *
     * This is prone to XSS attacks! current workaround: turn off logs in
     * production
     *
     * @param msg
     */
    private void jsLog(String msg) {
        // transfer all the logs back to JS for a better visibility. ~> window.inappbilling.log()
        String js = String.format("window.inappbilling.log('%s');", "[android] " + msg);
        webView.sendJavascript(js);
    }

    @Override
    /**
     * Called from JavaScript and dispatches the requests further to proper
     * functions.
     */
    public boolean execute(String action, JSONArray data, final CallbackContext callbackContext) throws JSONException {
        jsLog("execute called for action: " + action + " data: " + data);

        // Check if the action has a handler
        Boolean isValidAction = true;

        // Action selector
        try {
            // Initialize
            if ("init".equals(action)) {
                List<String> productIds = null;
                if (data.length() > 0) {
                    productIds = jsonStringToList(data.getString(0));
                }

                init(productIds, callbackContext);
            } // Get the list of purchases
            else if ("getPurchases".equals(action)) {
                if (isReady(callbackContext)) {
                    getPurchases(callbackContext);
                }
            } // Buy an item
            else if ("buy".equals(action)) {
                if (isReady(callbackContext)) {
                    String payload = "";
                    if (data.length() > 1) {
                        payload = data.getString(1);
                    }

                    buy(data.getString(0), payload, callbackContext);
                }

            } // Subscribe to an item
            else if ("subscribe".equals(action)) {
                if (isReady(callbackContext)) {
                    String payload = "";
                    if (data.length() > 1) {
                        payload = data.getString(1);
                    }

                    subscribe(data.getString(0), payload, callbackContext);
                }
            } // consume an owned item
            else if ("consumePurchase".equals(action)) {
                if (isReady(callbackContext)) {
                    consumePurchase(data.getString(0), callbackContext);
                }

            } // Get the list of loaded products
            else if ("getAvailableProducts".equals(action)) {
                if (isReady(callbackContext)) {
                    getAvailableProducts(callbackContext);
                }
            } // Get details of a loaded product
            else if ("getProductDetails".equals(action)) {
                if (isReady(callbackContext)) {
                    getProductDetails(jsonStringToList(data.getString(0)), callbackContext);
                }
            } // No handler for the action
            else {

                isValidAction = false;
            }

        }
        catch (JSONException e) {
            callbackContext.error(ErrorEvent.buildJson(
                    ERR_JSON_CONVERSION_FAILED,
                    "Could not create JSON object",
                    null
            ));
        }

        // Method not found
        return isValidAction;
    }

    /**
     * Helper to convert JSON string to a List<String>
     *
     * @param data
     * @return
     */
    private List<String> jsonStringToList(String data) throws JSONException {
        JSONArray jsonSkuList = new JSONArray(data);

        List<String> sku = new ArrayList<String>();
        int len = jsonSkuList.length();

        jsLog("Num SKUs Found: " + len);

        for (int i = 0; i < len; i++) {
            sku.add(jsonSkuList.get(i).toString());
            jsLog("Product SKU Added: " + jsonSkuList.get(i).toString());
        }

        return sku;
    }

    /*
     SIDE NOTE: plugins can initialize automatically using "initialize" method. 
     they can even request on startup init. may be considered too!

     http://docs.phonegap.com/en/3.4.0/guide_platforms_android_plugin.md.html#Android%20Plugins
     */
    /**
     * Initializes the plug-in, will also optionally load products if some
     * product IDs are provided.
     *
     * @param productIds
     * @param callbackContext
     */
    private void init(final List<String> productIds, final CallbackContext callbackContext) {
        jsLog("init called with productIds: " + productIds);

        // Some sanity checks to see if the developer (that's you!) really followed the
        // instructions to run this plugin
        if (base64EncodedPublicKey.contains("CONSTRUCT_YOUR")) {
            throw new RuntimeException("Please put your app's public key in InAppBillingPlugin.java. See ReadMe.");
        }

        // Create the helper, passing it our context and the public key to verify signatures with
        jsLog("Creating IAB helper.");
        mHelper = new IabHelper(cordova.getActivity().getApplicationContext(), base64EncodedPublicKey);

        // enable debug logging (for a production application, you should set this to false).
        mHelper.enableDebugLogging(ENABLE_DEBUG_LOGGING);

        // Start setup. This is asynchronous and the specified listener
        // will be called once setup completes.
        jsLog("Starting IAB setup.");

        mHelper.startSetup(new IabHelper.OnIabSetupFinishedListener() {
            @Override
            public void onIabSetupFinished(IabResult result) {
                if (!result.isSuccess()) {
                    // Oh no, there was a problem.
                    jsLog("Setup finished unsuccessfully.");

                    try {
                        callbackContext.error(ErrorEvent.buildJson(
                                ERR_SETUP,
                                "IAB setup was not successful",
                                result
                        ));
                    }
                    catch (JSONException e) {
                        jsLog(e.getMessage());
                    }

                }
                else {
                    // Hooray, IAB is fully set up.
                    jsLog("Setup finished successfully.");
                    initialized = true;

                    // Now, let's get an inventory of stuff we own.
                    try {
                        getProductDetails(productIds, callbackContext);
                    }
                    catch (JSONException e) {
                        jsLog(e.getMessage());
                    }
                }
            }
        });
    }

    /**
     * Checks for correct initialization of plug-in and the case where helper is
     * disposed in mean time.
     *
     * @param result
     */
    private boolean isReady(CallbackContext callbackContext) throws JSONException {
        if (!initialized) {
            callbackContext.error(ErrorEvent.buildJson(
                    ERR_NOT_INITIALIZED,
                    "Plugin has not been initialized.",
                    null
            ));

            return false;
        } // Have we been disposed of in the meantime? If so, quit. (probably 
        // useless but lets keep it for now!) 
        else if (mHelper == null) {
            callbackContext.error(ErrorEvent.buildJson(
                    ERR_HELPER_DISPOSED,
                    "The billing helper has been disposed.",
                    null
            ));

            return false;
        }
        else {
            return true;
        }
    }

    /**
     * Buy an already loaded item.
     *
     * @param productId
     * @param payload
     * @param callbackContext
     */
    private void buy(final String productId, final String payload, final CallbackContext callbackContext) {
        jsLog("buy called for productId: " + productId + " payload: " + payload);

        // TODO: we have to check if to-be-purchased product is already loaded or not.

        this.cordova.setActivityResultCallback(this);

        // we create one listener for each purchase request, this guarnatiees 
        // the concistency of data when multiple requests is launched in parallel
        IabHelper.OnIabPurchaseFinishedListener prchListener = new IabHelper.OnIabPurchaseFinishedListener() {
            @Override
            public void onIabPurchaseFinished(IabResult result, Purchase purchase) {
                jsLog("Purchase finished: " + result + ", purchase: " + purchase);
                try {

                    if (isReady(callbackContext)) {
                        if (result.isFailure()) {
                            callbackContext.error(ErrorEvent.buildJson(
                                    ERR_PURCHASE_FAILED,
                                    "Purchase failed",
                                    result
                            ));
                        }
                        else if (!payload.equals(purchase.getDeveloperPayload())) {
                            callbackContext.error(ErrorEvent.buildJson(
                                    ERR_INVALID_PURCHASE_PAYLOAD,
                                    "Developer payload verification failed.",
                                    result
                            ));
                        }
                        else {
                            jsLog("Purchase successful.");

                            // add the purchase to the inventory
                            myInventory.addPurchase(purchase);

                            try {
                                //TODO: the data returned to success callback should be unified with iOS, maybe create a function in purchase class
                                callbackContext.success(new JSONObject(purchase.getOriginalJson()));
                            }
                            catch (JSONException e) {
                                callbackContext.error(ErrorEvent.buildJson(
                                        ERR_JSON_CONVERSION_FAILED,
                                        "Could not create JSON object from purchase object",
                                        result
                                ));
                            }
                        }
                    }
                }
                // TODO: all of these caught exceptions shall be somehow sent back to callbackContext.error too!
                catch (JSONException e) {
                    jsLog(e.getMessage());
                }
            }
        };

        mHelper.launchPurchaseFlow(
                cordova.getActivity(),
                productId,
                RC_REQUEST_BASE++,
                prchListener,
                payload
        );
    }

    /**
     * Subscribe to an already loaded item.
     *
     * @param productId
     * @param payload
     * @param callbackContext
     */
    private void subscribe(final String productId, final String payload, final CallbackContext callbackContext) throws JSONException {
        jsLog("subscribe called for productId: " + productId + " payload: " + payload);

        if (!mHelper.subscriptionsSupported()) {
            callbackContext.error(ErrorEvent.buildJson(
                    ERR_SUBSCRIPTION_NOT_SUPPORTED,
                    "Subscriptions not supported on device.",
                    null
            ));
        }
        else {
            this.cordova.setActivityResultCallback(this);
            jsLog("Launching purchase flow for subscription.");

            IabHelper.OnIabPurchaseFinishedListener subsListener = new IabHelper.OnIabPurchaseFinishedListener() {
                @Override
                public void onIabPurchaseFinished(IabResult result, Purchase purchase) {
                    jsLog("Subscription finished: " + result + ", purchase: " + purchase);

                    try {
                        if (isReady(callbackContext)) {
                            if (result.isFailure()) {
                                callbackContext.error(ErrorEvent.buildJson(
                                        ERR_PURCHASE_FAILED,
                                        "Subscription failed",
                                        result
                                ));
                            }
                            else if (!payload.equals(purchase.getDeveloperPayload())) {
                                callbackContext.error(ErrorEvent.buildJson(
                                        ERR_INVALID_PURCHASE_PAYLOAD,
                                        "Developer payload verification failed.",
                                        result
                                ));
                            }
                            else {
                                jsLog("Subscription successful.");

                                // add the purchase to the inventory
                                myInventory.addPurchase(purchase);

                                try {
                                    callbackContext.success(new JSONObject(purchase.getOriginalJson()));
                                }
                                catch (JSONException e) {
                                    callbackContext.error(ErrorEvent.buildJson(
                                            ERR_JSON_CONVERSION_FAILED,
                                            "Could not create JSON object from purchase object",
                                            result
                                    ));
                                }
                            }
                        }
                    }
                    catch (JSONException e) {
                        jsLog(e.getMessage());
                    }
                }
            };

            mHelper.launchPurchaseFlow(
                    cordova.getActivity(),
                    productId,
                    IabHelper.ITEM_TYPE_SUBS,
                    RC_REQUEST_BASE++,
                    subsListener,
                    payload
            );
        }
    }

    /**
     * Get list of loaded purchases
     *
     * @param callbackContext
     * @throws JSONException
     */
    private void getPurchases(CallbackContext callbackContext) throws JSONException {
        jsLog("getPurchases called.");

        if (isInventoryLoaded(callbackContext)) {
            List<Purchase> purchaseList = myInventory.getAllPurchases();

            // Convert the java list to JSON
            JSONArray jsonPurchaseList = new JSONArray();
            for (Purchase p : purchaseList) {
                //TODO: this object which we return should have a unified structure like in iOS
                jsonPurchaseList.put(new JSONObject(p.getOriginalJson()));
            }

            callbackContext.success(jsonPurchaseList);
        }
    }

    /**
     * Checks for the availability of inventory.
     *
     * @param callbackContext
     * @return
     */
    private boolean isInventoryLoaded(CallbackContext callbackContext) throws JSONException {
        if (myInventory == null) {
            callbackContext.error(ErrorEvent.buildJson(
                    ERR_INVENTORY_NOT_LOADED,
                    "Inventory is not loaded.",
                    null
            ));

            return false;
        }
        else {
            return true;
        }
    }

    /**
     * Returns the list of all loaded products.
     *
     * @param callbackContext
     */
    private void getAvailableProducts(CallbackContext callbackContext) throws JSONException {
        jsLog("getAvailableProducts called.");

        if (isInventoryLoaded(callbackContext)) {
            List<SkuDetails> productsList = myInventory.getAllProducts();

            // Convert the java list to JSON
            JSONArray jsonProductDetailsList = new JSONArray();
            for (SkuDetails product : productsList) {
                jsLog("SKUDetails: Title: " + product.getTitle());
                //TODO: sync this structure with iOS
                jsonProductDetailsList.put(product.toJson());
            }

            callbackContext.success(jsonProductDetailsList);
        }
    }

    /**
     * Loads products with specific IDs and gets their details. Also loads the
     * history of purchases.
     *
     * @param productIds
     * @param callbackContext
     */
    private void getProductDetails(final List<String> productIds, final CallbackContext callbackContext) throws JSONException {
        jsLog("getProductDetails called.");

        IabHelper.QueryInventoryFinishedListener invListener = new IabHelper.QueryInventoryFinishedListener() {
            @Override
            public void onQueryInventoryFinished(IabResult result, Inventory inventory) {
                jsLog("Inventory listener called.");

                if (result.isFailure()) {
                    try {
                        callbackContext.error(ErrorEvent.buildJson(
                                ERR_LOAD_INVENTORY,
                                "Failed to query inventory.",
                                result
                        ));
                    }
                    catch (JSONException e) {
                        jsLog(e.getMessage());
                    }
                }
                else {
                    //I'm not really feeling good about just copying inventory OVER old data!
                    myInventory = inventory;

                    jsLog("Query inventory was successful.");
                    callbackContext.success();
                }
            }
        };

        if (productIds == null) {
            jsLog("Querying inventory without product IDs.");
            mHelper.queryInventoryAsync(invListener);
        }
        else {
            jsLog("Querying inventory with specific product IDs.");
            mHelper.queryInventoryAsync(true, productIds, invListener);
        }
    }

    /**
     * Consumes an already owned item.
     *
     * @param productId
     * @param callbackContext
     */
    private void consumePurchase(final String productId, final CallbackContext callbackContext) throws JSONException {
        jsLog("consumePurchase called.");

        if (isInventoryLoaded(callbackContext)) {

            // Get the purchase from the inventory
            Purchase purchase = myInventory.getPurchase(productId);

            //TODO: check also type of product, not all of them may be consumed
            if (purchase != null) {
                IabHelper.OnConsumeFinishedListener consListener = new IabHelper.OnConsumeFinishedListener() {
                    @Override
                    public void onConsumeFinished(Purchase purchase, IabResult result) {
                        jsLog("Consumption finished. Purchase: " + purchase + ", result: " + result);

                        if (result.isSuccess()) {
                            // remove the item from the inventory
                            myInventory.erasePurchase(purchase.getSku());

                            //TODO: convert to JSONObject?! and sync with iOS
                            callbackContext.success(purchase.getOriginalJson());
                        }
                        else {
                            try {
                                callbackContext.error(ErrorEvent.buildJson(
                                        ERR_CONSUMPTION_FAILED,
                                        "Error while consuming: " + productId,
                                        result
                                ));
                            }
                            catch (JSONException e) {
                                jsLog(e.getMessage());
                            }
                        }

                    }
                };

                mHelper.consumeAsync(purchase, consListener);
            }
            else {
                callbackContext.error(ErrorEvent.buildJson(
                        ERR_CONSUME_NOT_OWNED_ITEM,
                        productId + " is not owned so it cannot be consumed",
                        null
                ));
            }
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        jsLog("onActivityResult(" + requestCode + "," + resultCode + "," + data);

        // Pass on the activity result to the helper for handling
        if (!mHelper.handleActivityResult(requestCode, resultCode, data)) {
            // not handled, so handle it ourselves (here's where you'd
            // perform any handling of activity results not related to in-app
            // billing...
            super.onActivityResult(requestCode, resultCode, data);
        }
        else {
            jsLog("onActivityResult handled by IABUtil.");
        }
    }

    @Override
    public void onDestroy() {
        jsLog("onDestroy called.");

        super.onDestroy();

        initialized = false;

        // We're being destroyed. It's important to dispose of the helper here!
        jsLog("Destroying helper.");
        if (mHelper != null) {
            mHelper.dispose();
            mHelper = null;
        }
    }

}
