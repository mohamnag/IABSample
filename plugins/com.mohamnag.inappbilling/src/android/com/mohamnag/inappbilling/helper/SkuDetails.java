package com.mohamnag.inappbilling.helper;

import com.mohamnag.inappbilling.InAppBillingPlugin;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Represents an in-app product's listing details.
 */
public class SkuDetails {

    String mItemType;
    
    String id;
    String type;
    String fromattedPrice;
    String title;
    String description;
    String json;
    int priceMicro;
    String currency;

    public SkuDetails(String jsonSkuDetails) throws JSONException {
        this(InAppBillingPlugin.BILLING_ITEM_TYPE_INAPP, jsonSkuDetails);
    }

    public SkuDetails(String itemType, String json) throws JSONException {
        mItemType = itemType;
        
        this.json = json;
        
        JSONObject o = new JSONObject(json);
        id = o.optString("productId");
        type = o.optString("type");
        fromattedPrice = o.optString("price");
        title = o.optString("title");
        description = o.optString("description");
        priceMicro = o.optInt("price_amount_micros");
        currency = o.optString("price_currency_code");
    }

    public String getSku() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getPrice() {
        return fromattedPrice;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    @Override
    public String toString() {
        return "SkuDetails:" + json;
    }
    
    /**
     * Converts the values for current product to JSON in same format that
     * native code on other platforms return to javascript.
     *
     * @return
     */
    public JSONObject toJson() throws JSONException {
        JSONObject jsonObj = new JSONObject();
        
        jsonObj.put("id", id);
        jsonObj.put("type", type);
        jsonObj.put("price", fromattedPrice);
        jsonObj.put("priceMicros", priceMicro);
        jsonObj.put("currencyCode", currency);
        jsonObj.put("title", title);
        jsonObj.put("description", description);

        return jsonObj;
    }
}
