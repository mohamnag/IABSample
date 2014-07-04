/**
 * In App Billing Plugin
 *
 * Details and more information under:
 * https://github.com/mohamnag/InAppBilling/wiki
 */
package com.mohamnag.inappbilling;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.os.RemoteException;
import com.android.vending.billing.IInAppBillingService;
import com.mohamnag.inappbilling.helper.Inventory;
import com.mohamnag.inappbilling.helper.Purchase;
import com.mohamnag.inappbilling.helper.Security;
import com.mohamnag.inappbilling.helper.SkuDetails;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

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

    public static final int ERR_NO_ERROR = ERROR_CODES_BASE;
    public static final int ERR_SETUP = ERROR_CODES_BASE + 1;
    public static final int ERR_LOAD = ERROR_CODES_BASE + 2;
    public static final int ERR_PURCHASE = ERROR_CODES_BASE + 3;
    public static final int ERR_LOAD_RECEIPTS = ERROR_CODES_BASE + 4;
    public static final int ERR_CLIENT_INVALID = ERROR_CODES_BASE + 5;
    // payment process was cancelled by user
    public static final int ERR_PAYMENT_CANCELLED = ERROR_CODES_BASE + 6;
    public static final int ERR_PAYMENT_INVALID = ERROR_CODES_BASE + 7;
    public static final int ERR_PAYMENT_NOT_ALLOWED = ERROR_CODES_BASE + 8;
    public static final int ERR_UNKNOWN = ERROR_CODES_BASE + 10;
    public static final int ERR_LOAD_INVENTORY = ERROR_CODES_BASE + 11;
    public static final int ERR_HELPER_DISPOSED = ERROR_CODES_BASE + 12;
    public static final int ERR_NOT_INITIALIZED = ERROR_CODES_BASE + 13;
    public static final int ERR_INVENTORY_NOT_LOADED = ERROR_CODES_BASE + 14;
    public static final int ERR_PURCHASE_FAILED = ERROR_CODES_BASE + 15;
    public static final int ERR_JSON_CONVERSION_FAILED = ERROR_CODES_BASE + 16;
    public static final int ERR_INVALID_PURCHASE_PAYLOAD = ERROR_CODES_BASE + 17;
    public static final int ERR_SUBSCRIPTION_NOT_SUPPORTED = ERROR_CODES_BASE + 18;
    public static final int ERR_CONSUME_NOT_OWNED_ITEM = ERROR_CODES_BASE + 19;
    public static final int ERR_CONSUMPTION_FAILED = ERROR_CODES_BASE + 20;
    // the prduct to be bought is not loaded
    public static final int ERR_PRODUCT_NOT_LOADED = ERROR_CODES_BASE + 21;
    // invalid product ids passed
    public static final int ERR_INVALID_PRODUCT_ID = ERROR_CODES_BASE + 22;

    // play store response codes 
    public static final int BILLING_RESPONSE_RESULT_OK = 0;
    public static final int BILLING_RESPONSE_RESULT_USER_CANCELED = 1;
    public static final int BILLING_RESPONSE_RESULT_BILLING_UNAVAILABLE = 3;
    public static final int BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE = 4;
    public static final int BILLING_RESPONSE_RESULT_DEVELOPER_ERROR = 5;
    public static final int BILLING_RESPONSE_RESULT_ERROR = 6;
    public static final int BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED = 7;
    public static final int BILLING_RESPONSE_RESULT_ITEM_NOT_OWNED = 8;

    public static final String BILLING_ITEM_TYPE_INAPP = "inapp";
    public static final String BILLING_ITEM_TYPE_SUBS = "subs";

    private boolean initialized = false;

    //TODO: set this from JS, according to what is defined in options
    private final Boolean ENABLE_DEBUG_LOGGING = true;

    private final String TAG = "CORDOVA_INAPPBILLINGPLUGIN";

    /**
     * request code base for the purchase flow
     */
    static int REQUEST_CODE_BASE = 10000;

    IInAppBillingService iabService;
    ServiceConnection iabServiceConnection;
    String base64EncodedPublicKey;
    boolean subscriptionSupported;
    Map<Integer, CallbackContext> pendingPurchaseCallbacks = new HashMap<Integer, CallbackContext>();

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

        // Initialize
        if ("init".equals(action)) {
            ArrayList<String> productIds = null;
            if (data.length() > 0) {
                productIds = jsonStringToList(data.getString(0));
            }

            init(productIds, callbackContext);
        } // Get the list of purchases
        else if ("getPurchases".equals(action) || "restoreCompletedTransactions".equals(action)) {
            if (isReady(callbackContext)) {
                getPurchases(callbackContext);
            }
        } // Buy an item
        else if ("buy".equals(action)) {
            if (isReady(callbackContext)) {
                buy(data.getString(0), callbackContext);
            }

        } // consume an owned item
        else if ("consumeProduct".equals(action)) {
            if (isReady(callbackContext)) {
                consumeProduct(data.getString(0), callbackContext);
            }

        } // Get the list of loaded products
        else if ("getLoadedProducts".equals(action)) {
            if (isReady(callbackContext)) {
                getLoadedProducts(callbackContext);
            }
        } // Get details of a loaded product
        else if ("loadProductDetails".equals(action)) {
            if (isReady(callbackContext)) {
                loadProductDetails(jsonStringToList(data.getString(0)), callbackContext);
            }
        } // No handler for the action
        else {

            isValidAction = false;
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
    private ArrayList<String> jsonStringToList(String data) throws JSONException {
        JSONArray jsonSkuList = new JSONArray(data);

        ArrayList<String> sku = new ArrayList<String>();
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
    private void init(final ArrayList<String> productIds, final CallbackContext callbackContext) {

        jsLog("init called with productIds: " + productIds);

        subscriptionSupported = false;
        initialized = false;

        // retrieve licence key, if this is not set, we will skip validations later
        base64EncodedPublicKey = cordova.getActivity().getIntent().getStringExtra("android-iabplugin-license-key");

        // prepare and bind to iab service
        iabServiceConnection = new ServiceConnection() {

            @Override
            public void onServiceDisconnected(ComponentName name) {
                jsLog("Service disconnected");
                iabService = null;
            }

            @Override
            public void onServiceConnected(ComponentName name, IBinder service) {
                jsLog("Service connected");
                iabService = IInAppBillingService.Stub.asInterface(service);

                try {
                    jsLog("check for in-app billing v3 support");
                    int response = iabService.isBillingSupported(3, cordova.getActivity().getPackageName(), BILLING_ITEM_TYPE_INAPP);
                    if (response != BILLING_RESPONSE_RESULT_OK) {
                        callbackContext.error(new ErrorEvent(
                                ERR_SETUP,
                                "Billing v3 not supported. Response code: " + response
                        ).toJavaScriptJSON());
                    }
                    else {
                        // subs may be disabled independent from v3 interface
                        jsLog("check for v3 subscriptions support");
                        response = iabService.isBillingSupported(3, cordova.getActivity().getPackageName(), BILLING_ITEM_TYPE_SUBS);
                        subscriptionSupported = response == BILLING_RESPONSE_RESULT_OK;

                        myInventory = new Inventory(base64EncodedPublicKey);
                        initialized = true;

                        // Now, let's pupulate inventory with products
                        loadProductDetails(productIds, callbackContext);
                    }
                }
                catch (JSONException ex) {
                    callbackContext.error(new ErrorEvent(
                            ERR_JSON_CONVERSION_FAILED,
                            ex.getMessage()
                    ).toJavaScriptJSON());
                }
                catch (RemoteException ex) {
                    Logger.getLogger(InAppBillingPlugin.class.getName()).log(Level.SEVERE, null, ex);
                    callbackContext.error(new ErrorEvent(
                            ERR_SETUP,
                            ex.getMessage()
                    ).toJavaScriptJSON());
                }

            }

        };

        cordova.getActivity().getApplicationContext().bindService(
                new Intent("com.android.vending.billing.InAppBillingService.BIND"),
                iabServiceConnection,
                Context.BIND_AUTO_CREATE
        );
    }

    /**
     * Checks for correct initialization of plug-in and the case where helper is
     * disposed in mean time.
     *
     * @param result
     */
    private boolean isReady(CallbackContext callbackContext) throws JSONException {
        if (!initialized) {
            callbackContext.error(new ErrorEvent(
                    ERR_NOT_INITIALIZED,
                    "Plugin has not been initialized."
            ).toJavaScriptJSON());

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
     * @param callbackContext
     */
    private void buy(final String productId, final CallbackContext callbackContext) throws JSONException {

        jsLog("buy called for productId: " + productId);

        SkuDetails product = myInventory.getSkuDetails(productId);
        if (product == null) {
            callbackContext.error(new ErrorEvent(
                    ERR_PRODUCT_NOT_LOADED,
                    "Product intended to be bought has not been loaded."
            ).toJavaScriptJSON());
        }
        else if (BILLING_ITEM_TYPE_SUBS.equals(product.getType()) && !subscriptionSupported) {
            callbackContext.error(new ErrorEvent(
                    ERR_SUBSCRIPTION_NOT_SUPPORTED,
                    "Subscriptions are not supported"
            ).toJavaScriptJSON());
        }
        else {
            this.cordova.setActivityResultCallback(this);
            int requestCode = REQUEST_CODE_BASE++;

            try {
                Bundle buyIntentBundle = iabService.getBuyIntent(
                        3,
                        cordova.getActivity().getPackageName(),
                        product.getSku(),
                        product.getType(),
                        null
                );

                PendingIntent pendingIntent = buyIntentBundle.getParcelable("BUY_INTENT");

                pendingPurchaseCallbacks.put(requestCode, callbackContext);

                cordova.getActivity().startIntentSenderForResult(
                        pendingIntent.getIntentSender(),
                        requestCode,
                        new Intent(),
                        0,
                        0,
                        0
                );
            }
            catch (RemoteException ex) {
                Logger.getLogger(InAppBillingPlugin.class.getName()).log(Level.SEVERE, null, ex);
                callbackContext.error(new ErrorEvent(
                        ERR_PURCHASE_FAILED,
                        ex.getMessage()
                ).toJavaScriptJSON());
            }
            catch (IntentSender.SendIntentException ex) {
                Logger.getLogger(InAppBillingPlugin.class.getName()).log(Level.SEVERE, null, ex);
                callbackContext.error(new ErrorEvent(
                        ERR_PURCHASE_FAILED,
                        ex.getMessage()
                ).toJavaScriptJSON());
            }

        }
    }

    /**
     * Get list of purchases. This will also load the product details for
     * purchases.
     *
     * @param callbackContext
     * @throws JSONException
     */
    private void getPurchases(CallbackContext callbackContext) throws JSONException {
        jsLog("getPurchases called.");

        ErrorEvent errorInapp = queryPurchases(BILLING_ITEM_TYPE_INAPP);
        ErrorEvent errorSubs = queryPurchases(BILLING_ITEM_TYPE_SUBS);

        // call success only if we had no error
        if (errorInapp != null) {
            callbackContext.error(errorInapp.toJavaScriptJSON());
        }
        else if (errorSubs != null) {
            callbackContext.error(errorSubs.toJavaScriptJSON());
        }
        else {
            callbackContext.success(myInventory.getAllPurchasesJSON());
        }
    }

    private ErrorEvent queryPurchases(String itemType) {
        ErrorEvent ret = null;

        try {
            Bundle ownedItems = iabService.getPurchases(3, cordova.getActivity().getPackageName(), itemType, null);

            int response = ownedItems.getInt("RESPONSE_CODE");
            if (response == BILLING_RESPONSE_RESULT_OK) {
                ArrayList<String> purchaseDataList = ownedItems.getStringArrayList("INAPP_PURCHASE_DATA_LIST");
                ArrayList<String> signatureList = ownedItems.getStringArrayList("INAPP_DATA_SIGNATURE");
                String continuationToken = ownedItems.getString("INAPP_CONTINUATION_TOKEN");

                for (int i = 0; i < purchaseDataList.size(); ++i) {
                    String purchaseData = purchaseDataList.get(i);
                    String signature = signatureList.get(i);

                    try {
                        Purchase purchase = new Purchase(purchaseData, signature);

                        if (base64EncodedPublicKey != null
                            && !Security.verifyPurchase(base64EncodedPublicKey, purchaseData, signature)) {

                            jsLog("Signature verification failed: " + purchaseData + " signature: " + signature);
                        }
                        else {
                            jsLog("Purchase loaded for: " + purchase.getSku());

                            // add the purchase to the inventory
                            myInventory.addPurchase(purchase);
                        }
                    }
                    catch (JSONException e) {
                        ret = new ErrorEvent(
                                ERR_JSON_CONVERSION_FAILED,
                                e.getMessage()
                        );
                    }
                }
            }

            // TODO: if continuationToken != null, call getPurchases again 
            // and pass in the token to retrieve more items
        }
        catch (RemoteException ex) {
            Logger.getLogger(InAppBillingPlugin.class.getName()).log(Level.SEVERE, null, ex);
            ret = new ErrorEvent(
                    ERR_LOAD_RECEIPTS,
                    ex.getMessage()
            );
        }

        return ret;
    }

    /**
     * Returns the list of all loaded products.
     *
     * @param callbackContext
     */
    private void getLoadedProducts(CallbackContext callbackContext) throws JSONException {
        jsLog("getLoadedProducts called.");

        if (initialized) {
            callbackContext.success(myInventory.getAllProductsJSON());
        }
        else {
            callbackContext.error(new ErrorEvent(
                    ERR_INVENTORY_NOT_LOADED,
                    "Inventory is not loaded."
            ).toJavaScriptJSON());
        }
    }

    /**
     * Loads products with specific IDs and gets their details.
     *
     * @param productIds
     * @param callbackContext
     */
    private void loadProductDetails(final ArrayList<String> productIds, final CallbackContext callbackContext) throws JSONException {

        jsLog("loadProductDetails called.");

        if (productIds == null || productIds.isEmpty()) {
            jsLog("Product list was empty");
            callbackContext.success(myInventory.getAllProductsJSON());
        }
        else {
            jsLog("Loading/refreshing product details");

            Bundle querySkus = new Bundle();
            querySkus.putStringArrayList("ITEM_ID_LIST", productIds);

            // do same query with both types to load all!
            ErrorEvent errInapp = querySkuDetails(querySkus, BILLING_ITEM_TYPE_INAPP);
            ErrorEvent errSubs = querySkuDetails(querySkus, BILLING_ITEM_TYPE_SUBS);

            // only call success if no error has happened
            if (errInapp != null) {
                callbackContext.error(errInapp.toJavaScriptJSON());
            }
            else if (errSubs != null) {
                callbackContext.error(errSubs.toJavaScriptJSON());
            }
            else {
                callbackContext.success(myInventory.getAllProductsJSON());
            }

        }
    }

    /**
     * Loads the product details from play store and puts them in inventory,
     * will reload the product if they have been already loaded before.
     *
     * @param querySkus
     * @param itemType
     * @param callbackContext
     * @throws RemoteException
     */
    private ErrorEvent querySkuDetails(Bundle querySkus, String itemType) {
        ErrorEvent ret = null;

        try {
            Bundle skuDetailsInapp = iabService.getSkuDetails(
                    3,
                    cordova.getActivity().getPackageName(),
                    itemType,
                    querySkus
            );

            int response = skuDetailsInapp.getInt("RESPONSE_CODE");
            if (response == BILLING_RESPONSE_RESULT_OK) {
                ArrayList<String> responseList
                                  = skuDetailsInapp.getStringArrayList("DETAILS_LIST");

                for (String thisResponse : responseList) {
                    try {
                        SkuDetails d = new SkuDetails(itemType, thisResponse);
                        jsLog("Got sku details: " + d);

                        myInventory.addSkuDetails(d);
                    }
                    catch (JSONException ex) {
                        jsLog("JSONException: " + ex.getMessage());
                    }
                }
            }
            else {
                ret = new ErrorEvent(
                        ERR_LOAD_INVENTORY,
                        "Cant load product details. Responce code: " + response
                );
            }
        }
        catch (RemoteException ex) {
            Logger.getLogger(InAppBillingPlugin.class
                    .getName()).log(Level.SEVERE, null, ex);

            ret = new ErrorEvent(
                    ERR_LOAD_INVENTORY,
                    ex.getMessage()
            );
        }

        return ret;
    }

    /**
     * Consumes an already owned item.
     *
     * @param productId
     * @param callbackContext
     */
    private void consumeProduct(final String productId, final CallbackContext callbackContext) throws JSONException {
        jsLog("consumeProduct called.");

        Purchase purchase = myInventory.getPurchase(productId);

        if (purchase != null) {
            try {
                int response = iabService.consumePurchase(3, cordova.getActivity().getPackageName(), purchase.getToken());

                if (response == BILLING_RESPONSE_RESULT_OK) {
                    callbackContext.success(purchase.toJavaScriptJson());
                }
            }
            catch (RemoteException ex) {
                Logger.getLogger(InAppBillingPlugin.class.getName()).log(Level.WARNING, null, ex);

                callbackContext.error(new ErrorEvent(
                        ERR_CONSUMPTION_FAILED,
                        ex.getMessage()
                ).toJavaScriptJSON());
            }
        }
        else {
            callbackContext.error(new ErrorEvent(
                    ERR_CONSUME_NOT_OWNED_ITEM,
                    "No purchase record found for product id: " + productId
            ).toJavaScriptJSON());
        }

    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {

        if (pendingPurchaseCallbacks.containsKey(requestCode)) {
            jsLog("Got response of a purchase");

            // going to handle response of a purchase
            CallbackContext callbackContext = pendingPurchaseCallbacks.get(requestCode);
            int responseCode = data.getIntExtra("RESPONSE_CODE", 0);
            String purchaseData = data.getStringExtra("INAPP_PURCHASE_DATA");
            String dataSignature = data.getStringExtra("INAPP_DATA_SIGNATURE");

            if (resultCode == Activity.RESULT_OK && responseCode == BILLING_RESPONSE_RESULT_OK) {
                if (purchaseData == null || dataSignature == null) {
                    callbackContext.error(new ErrorEvent(
                            ERR_PURCHASE_FAILED, 
                            "Empty purchase data or empty signature returned"
                    ).toJavaScriptJSON());
                }
                else {

                    try {
                        Purchase purchase = new Purchase(purchaseData, dataSignature);

                        if (base64EncodedPublicKey != null
                            && !Security.verifyPurchase(base64EncodedPublicKey, purchaseData, dataSignature)) {

                            callbackContext.error(new ErrorEvent(
                                    ERR_PAYMENT_INVALID, 
                                    "Signature verification failed"
                            ).toJavaScriptJSON());
                        }
                        else {
                            jsLog("Purchase successful.");

                            // add the purchase to the inventory
                            myInventory.addPurchase(purchase);

                            callbackContext.success(purchase.toJavaScriptJson());
                        }
                    }
                    catch (JSONException e) {
                        callbackContext.error(new ErrorEvent(
                                ERR_JSON_CONVERSION_FAILED, 
                                e.getMessage()
                        ).toJavaScriptJSON());
                    }
                }
            }
            else if (resultCode == Activity.RESULT_CANCELED) {
                callbackContext.error(new ErrorEvent(
                        ERR_PAYMENT_CANCELLED, 
                        "Purchase cancelled by user."
                ).toJavaScriptJSON());
            }
            else {
                // unknown result, interpret as error
                callbackContext.error(new ErrorEvent(
                        ERR_PURCHASE_FAILED,
                        "Unknown result code from activity. ResultCode: " + resultCode + " ResponseCode: " + responseCode
                ).toJavaScriptJSON());
            }
        }
    }

    @Override
    public void onDestroy() {
        jsLog("onDestroy called.");

        super.onDestroy();

        initialized = false;

        if (iabService != null) {
            cordova.getActivity().getApplicationContext().unbindService(iabServiceConnection);
        }
    }

}
