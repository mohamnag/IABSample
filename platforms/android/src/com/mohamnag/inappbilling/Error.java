/**
 * In App Billing Plugin
 *
 * Details and more information under:
 * https://github.com/mohamnag/InAppBilling/wiki
 */
package com.mohamnag.inappbilling;

import java.util.logging.Level;
import java.util.logging.Logger;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * A helper to build up JSONObjects with proper structure to be returned to
 * error callback.
 *
 * @author mohamang
 */
public class Error {

    private static final String KEY_NAME_MESSAGE = "msg";
    private static final String KEY_NAME_ERROR = "errorCode";

    private final String message;
    private final int errorCode;
    
    public Error(int errorCode, String message) {
        this.errorCode = errorCode;
        this.message = message;
    }
    
    public JSONObject toJavaScriptJSON() {
        JSONObject ret = new JSONObject();
        try {
            ret.put(KEY_NAME_ERROR, errorCode);
            ret.put(KEY_NAME_MESSAGE, message);
        }
        catch (JSONException ex) {
            Logger.getLogger(InAppBillingPlugin.class.getName()).log(Level.WARNING, null, ex);
        }

        return ret;
    }
}
