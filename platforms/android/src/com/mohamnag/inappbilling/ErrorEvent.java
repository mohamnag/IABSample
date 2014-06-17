/**
 * In App Billing Plugin
 * 
 * Details and more information under: https://github.com/mohamnag/InAppBilling/wiki
 */

package com.mohamnag.inappbilling;

import com.mohamnag.inappbilling.helper.IabResult;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * A helper to build up JSONObjects with proper structure to be returned to
 * error callback.
 *
 * @author mohamang
 */
public class ErrorEvent {
    private static final String msgKey = "msg";
    private static final String errorCodeKey = "errorCode";
    private static final String nativeEventKey = "nativeEvent";
    
    public static JSONObject buildJson(int errorCode, String msg, IabResult result) throws JSONException {
        JSONObject ret = new JSONObject();
        ret.put(errorCodeKey, errorCode);
        ret.put(msgKey, msg);
        
        if(result != null) {
            ret.put(nativeEventKey, result.toJson());
        }
        
        return ret;
    }
}
