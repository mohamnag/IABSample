//
//  InAppPurchase.m
//
//  Created by Matt Kane on 20/02/2011.
//  Copyright (c) Matt Kane 2011. All rights reserved.
//  Copyright (c) Jean-Christophe Hoelt 2013
//

#import "InAppPurchase.h"
#include <stdio.h>
#include <stdlib.h>


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
#define ERROR_CODES_BASE          4983497
#define ERR_SETUP                 (ERROR_CODES_BASE + 1)
#define ERR_LOAD                  (ERROR_CODES_BASE + 2)
#define ERR_PURCHASE              (ERROR_CODES_BASE + 3)
#define ERR_LOAD_RECEIPTS         (ERROR_CODES_BASE + 4)
#define ERR_CLIENT_INVALID        (ERROR_CODES_BASE + 5)
#define ERR_PAYMENT_CANCELLED     (ERROR_CODES_BASE + 6)
#define ERR_PAYMENT_INVALID       (ERROR_CODES_BASE + 7)
#define ERR_PAYMENT_NOT_ALLOWED   (ERROR_CODES_BASE + 8)
#define ERR_UNKNOWN               (ERROR_CODES_BASE + 10)


#define ERR_LOAD_INVENTORY              (ERROR_CODES_BASE + 11)
#define ERR_HELPER_DISPOSED             (ERROR_CODES_BASE + 12)
#define ERR_NOT_INITIALIZED             (ERROR_CODES_BASE + 13)
#define ERR_INVENTORY_NOT_LOADED        (ERROR_CODES_BASE + 14)
#define ERR_PURCHASE_FAILED             (ERROR_CODES_BASE + 15)
#define ERR_JSON_CONVERSION_FAILED      (ERROR_CODES_BASE + 16)
#define ERR_INVALID_PURCHASE_PAYLOAD    (ERROR_CODES_BASE + 17)
#define ERR_SUBSCRIPTION_NOT_SUPPORTED  (ERROR_CODES_BASE + 18)
#define ERR_CONSUME_NOT_OWNED_ITEM      (ERROR_CODES_BASE + 19)
#define ERR_CONSUMPTION_FAILED          (ERROR_CODES_BASE + 20)
// the prduct to be bought is not loaded
#define ERR_PRODUCT_NOT_LOADED          (ERROR_CODES_BASE + 21)












/////////////////////// TO BE REVIEWED! ->

// Help create NSNull objects for nil items (since neither NSArray nor NSDictionary can store nil values).
#define NILABLE(obj) ((obj) != nil ? (NSObject *)(obj) : (NSObject *)[NSNull null])

// TODO: apply it to jsLog (later!) not to send logs if this is disabled
// TODO: at best this is an argument in init!
static BOOL g_debugEnabled = YES;

// We set this permanently to yes in order to match the functionality of android
static BOOL g_autoFinishEnabled = YES;

//TODO: remove!
#define DLog(fmt, ...) { \
    if (g_debugEnabled) \
        NSLog((@"InAppPurchase[objc]: " fmt), ##__VA_ARGS__); \
}

static NSInteger jsErrorCode(NSInteger storeKitErrorCode)
{
    switch (storeKitErrorCode) {
        case SKErrorUnknown:
            return ERR_UNKNOWN;
        case SKErrorClientInvalid:
            return ERR_CLIENT_INVALID;
        case SKErrorPaymentCancelled:
            return ERR_PAYMENT_CANCELLED;
        case SKErrorPaymentInvalid:
            return ERR_PAYMENT_INVALID;
        case SKErrorPaymentNotAllowed:
            return ERR_PAYMENT_NOT_ALLOWED;
    }
    return ERR_UNKNOWN;
}

static NSString *jsErrorCodeAsString(NSInteger code) {
    switch (code) {
        case ERR_SETUP: return @"ERR_SETUP";
        case ERR_LOAD: return @"ERR_LOAD";
        case ERR_PURCHASE: return @"ERR_PURCHASE";
        case ERR_LOAD_RECEIPTS: return @"ERR_LOAD_RECEIPTS";
        case ERR_CLIENT_INVALID: return @"ERR_CLIENT_INVALID";
        case ERR_PAYMENT_CANCELLED: return @"ERR_PAYMENT_CANCELLED";
        case ERR_PAYMENT_INVALID: return @"ERR_PAYMENT_INVALID";
        case ERR_PAYMENT_NOT_ALLOWED: return @"ERR_PAYMENT_NOT_ALLOWED";
        case ERR_UNKNOWN: return @"ERR_UNKNOWN";
    }
    return @"ERR_NONE";
}

// To avoid compilation warning, declare JSONKit and SBJson's
// category methods without including their header files.
@interface NSArray (StubsForSerializers)
- (NSString *)JSONString;
- (NSString *)JSONRepresentation;
@end

// Helper category method to choose which JSON serializer to use.
@interface NSArray (JSONSerialize)
- (NSString *)JSONSerialize;
@end

@implementation NSArray (JSONSerialize)
- (NSString *)JSONSerialize {
    return [self respondsToSelector:@selector(JSONString)] ? [self JSONString] : [self JSONRepresentation];
}
@end

@interface NSData (Base64)
- (NSString*)convertToBase64;
@end

@implementation NSData (Base64)
- (NSString*)convertToBase64 {
    const uint8_t* input = (const uint8_t*)[self bytes];
    NSInteger length = [self length];

    static char table[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    NSMutableData* data = [NSMutableData dataWithLength:((length + 2) / 3) * 4];
    uint8_t* output = (uint8_t*)data.mutableBytes;

    NSInteger i;
    for (i=0; i < length; i += 3) {
        NSInteger value = 0;
        NSInteger j;
        for (j = i; j < (i + 3); j++) {
            value <<= 8;

            if (j < length) {
                value |= (0xFF & input[j]);
            }
        }

        NSInteger theIndex = (i / 3) * 4;
        output[theIndex + 0] =                    table[(value >> 18) & 0x3F];
        output[theIndex + 1] =                    table[(value >> 12) & 0x3F];
        output[theIndex + 2] = (i + 1) < length ? table[(value >> 6)  & 0x3F] : '=';
        output[theIndex + 3] = (i + 2) < length ? table[(value >> 0)  & 0x3F] : '=';
    }

    NSString *ret = [[NSString alloc] initWithData:data encoding:NSASCIIStringEncoding];
#if ARC_DISABLED
    [ret autorelease];
#endif
    return ret;
}
@end

/////////////////////// <- TO BE REVIEWED!






@implementation InAppPurchase
@synthesize list;
@synthesize retainer;

// redirect all logs to JS for better visibility
-(void) jsLog: (NSString*)msg {
  [self writeJavascript:[NSString stringWithFormat:@"window.inappbilling.log('[ios] %@')", msg]];
}

// this will create the necessary structures and call the error callback
-(void) sendError:(NSNumber*)errorCode withMsg:(NSString*)msg withNativeEvent:(NSDictionary*)nativeEvent forCommand:(CDVInvokedUrlCommand*)command {
  NSMutableDictionary* errorObject = [NSMutableDictionary dictionaryWithCapacity:3];

  [errorObject setObject:errorCode forKey:@"errorCode"];
  [errorObject setObject:msg forKey:@"msg"];
  [errorObject setObject:NILABLE(nativeEvent) forKey:@"nativeEvent"];

  NSDictionary* error = [NSDictionary dictionaryWithDictionary:errorObject];

  CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsDictionary:error];
  [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

// this initiates the plugin
// TODO: get an optional list of productIds and pass it further to be loaded in getProductDetails
-(void) init: (CDVInvokedUrlCommand*)command {
  [self jsLog:@"init called"];

  if (![SKPaymentQueue canMakePayments]) {
    [self jsLog:@"Cant make payments, init failed"];

    [self sendError:[NSNumber numberWithInt:ERR_SETUP] 
      withMsg:@"Can not make payment according to payment queue" withNativeEvent:nil forCommand:command];
  }
  else {
    self.list = [[NSMutableDictionary alloc] init];
    self.retainer = [[NSMutableDictionary alloc] init];
    unfinishedTransactions = [[NSMutableDictionary alloc] init];
    [[SKPaymentQueue defaultQueue] addTransactionObserver:self];

    [self jsLog:@"InAppBilling initialized successfully"];

    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];      
  }

}

// this is renamed from original appStoreReceipt, I'm not sure if that provides the type of data we want for getPurchases.
/* 
    TODO: find/implement the right thing for iOS
    I dont think this function matches the InAppPurchase.prototype.loadReceipts one. as that function
    only tries to get receipt either from locally stored ones or from a URL.
    we need probably something to refresh the receipt like SKReceiptRefreshRequest from 
    https://developer.apple.com/library/ios/documentation/NetworkingInternet/Conceptual/StoreKitGuide/Chapters/Restoring.html#//apple_ref/doc/uid/TP40008267-CH8-SW9
*/
- (void) getPurchases: (CDVInvokedUrlCommand*)command {
  [self jsLog:@"getPurchases called"];

  NSString *base64 = nil;
  NSData *receiptData = [self appStoreReceipt];
  if (receiptData != nil) {
      [self jsLog:@"receipt retrieved successfully!"];
      base64 = [receiptData convertToBase64];

      // TODO: this structure shall be synced with android for the type (in JS) InAppBilling.purchase
      CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                        messageAsString:base64];
      [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }
  else {
    [self sendError:[NSNumber numberWithInt:ERR_LOAD_RECEIPTS]
      withMsg:@"Failed loading receipts, data is nil" withNativeEvent:nil forCommand:command];
  }
}

- (NSData *)appStoreReceipt {
  NSURL *receiptURL = nil;
  NSBundle *bundle = [NSBundle mainBundle];
  if ([bundle respondsToSelector:@selector(appStoreReceiptURL)]) {
      // The general best practice of weak linking using the respondsToSelector: method
      // cannot be used here. Prior to iOS 7, the method was implemented as private SPI,
      // but that implementation called the doesNotRecognizeSelector: method.
      if (floor(NSFoundationVersionNumber) > NSFoundationVersionNumber_iOS_6_1) {
          receiptURL = [bundle performSelector:@selector(appStoreReceiptURL)];
      }
  }

  if (receiptURL != nil) {
      NSData *receiptData = [NSData dataWithContentsOfURL:receiptURL];
#if ARC_DISABLED
      [receiptData autorelease];
#endif
      return receiptData;
  }
  else {
      return nil;
  }
}

- (void) buy: (CDVInvokedUrlCommand*)command {
  id identifier = [command.arguments objectAtIndex:0];

  [self jsLog:[NSString stringWithFormat:@"buy called for productId: %@", identifier]];

  id productObject = [self.list objectForKey:identifier];

  if(productObject == nil) {
    [self sendError:[NSNumber numberWithInt:ERR_PRODUCT_NOT_LOADED] 
      withMsg:@"The product to be bought has not been loaded before" withNativeEvent:nil forCommand:command];
  }
  else {
    // TODO: can I somehow overwrite the SKMutablePayment and add my command to it?
    SKMutablePayment *payment = [SKMutablePayment paymentWithProduct:productObject];
    // we hardcode the quantity to one to match the functionality of android
    payment.quantity = 1;

    [[SKPaymentQueue defaultQueue] addPayment:payment];
  }
}














/**
 * Request product data for the given productIds.
 * See js for further documentation.
 */
- (void) load: (CDVInvokedUrlCommand*)command
{
	DLog(@"Getting products data");

    NSArray *inArray = [command.arguments objectAtIndex:0];

    if ((unsigned long)[inArray count] == 0) {
        DLog(@"Empty array");
        NSArray *callbackArgs = [NSArray arrayWithObjects: nil, nil, nil];
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:callbackArgs];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }

    if (![[inArray objectAtIndex:0] isKindOfClass:[NSString class]]) {
        DLog(@"Not an array of NSString");
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid arguments"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }
    
    NSSet *productIdentifiers = [NSSet setWithArray:inArray];
    DLog(@"Set has %li elements", (unsigned long)[productIdentifiers count]);
    for (NSString *item in productIdentifiers) {
        DLog(@" - %@", item);
    }
    SKProductsRequest *productsRequest = [[SKProductsRequest alloc] initWithProductIdentifiers:productIdentifiers];

    BatchProductsRequestDelegate* delegate = [[BatchProductsRequestDelegate alloc] init];
    productsRequest.delegate = delegate;
    delegate.plugin  = self;
    delegate.command = command;

#if ARC_ENABLED
    self.retainer[@"productsRequest"] = productsRequest;
    self.retainer[@"productsRequestDelegate"] = delegate;
#else
    [delegate retain];
#endif

    DLog(@"Starting product request...");
    [productsRequest start];
    DLog(@"Product request started");
}


- (void) restoreCompletedTransactions: (CDVInvokedUrlCommand*)command
{
    [[SKPaymentQueue defaultQueue] restoreCompletedTransactions];
}

// SKPaymentTransactionObserver methods
// called when the transaction status is updated
//
- (void)paymentQueue:(SKPaymentQueue*)queue updatedTransactions:(NSArray*)transactions
{
	NSString *state, *error, *transactionIdentifier, *transactionReceipt, *productId;
	NSInteger errorCode;

    for (SKPaymentTransaction *transaction in transactions)
    {
		error = state = transactionIdentifier = transactionReceipt = productId = @"";
		errorCode = 0;
        DLog(@"Payment transaction updated (%@):", transaction.originalTransaction.payment.productIdentifier);

        switch (transaction.transactionState)
        {
			case SKPaymentTransactionStatePurchasing:
				DLog(@"Purchasing...");
				continue;

            case SKPaymentTransactionStatePurchased:
				state = @"PaymentTransactionStatePurchased";
				transactionIdentifier = transaction.transactionIdentifier;
				transactionReceipt = [[transaction transactionReceipt] base64EncodedString];
				productId = transaction.payment.productIdentifier;
                break;

			case SKPaymentTransactionStateFailed:
				state = @"PaymentTransactionStateFailed";
				error = transaction.error.localizedDescription;
				errorCode = jsErrorCode(transaction.error.code);
				DLog(@"Error %@ %@", jsErrorCodeAsString(errorCode), error);
				
				// Finish failed transactions, when autoFinish is off
				if (!g_autoFinishEnabled) {
					[[SKPaymentQueue defaultQueue] finishTransaction:transaction];
					[self transactionFinished:transaction];
				}
				
				DLog(@"Error %li %@", (unsigned long)errorCode, error);
                break;

			case SKPaymentTransactionStateRestored:
				state = @"PaymentTransactionStateRestored";
				transactionIdentifier = transaction.originalTransaction.transactionIdentifier;
				transactionReceipt = [[transaction transactionReceipt] base64EncodedString];
				productId = transaction.originalTransaction.payment.productIdentifier;
                break;

            default:
				DLog(@"Invalid state");
                continue;
        }
		DLog(@"State: %@", state);
        NSArray *callbackArgs = [NSArray arrayWithObjects:
                                 NILABLE(state),
                                 [NSNumber numberWithInteger:errorCode],
                                 NILABLE(error),
                                 NILABLE(transactionIdentifier),
                                 NILABLE(productId),
                                 NILABLE(transactionReceipt),
                                 nil];
		NSString *js = [NSString
            stringWithFormat:@"window.inappbilling.updatedTransactionCallback.apply(window.inappbilling, %@)",
            [callbackArgs JSONSerialize]];
		// DLog(@"js: %@", js);
        [self.commandDelegate evalJs:js];
        if (g_autoFinishEnabled) {
            [[SKPaymentQueue defaultQueue] finishTransaction:transaction];
            [self transactionFinished:transaction];
        }
        else {
            [unfinishedTransactions setObject:transaction forKey:transactionIdentifier];
        }
    }
}

- (void) transactionFinished: (SKPaymentTransaction*) transaction
{
    NSArray *callbackArgs = [NSArray arrayWithObjects:
                                NILABLE(@"PaymentTransactionStateFinished"),
                                [NSNumber numberWithInt:0], // Fixed to send object. The 0 was stopping the array.
                                NILABLE(nil),
                                NILABLE(transaction.transactionIdentifier),
                                NILABLE(transaction.payment.productIdentifier),
                                NILABLE(nil),
                                nil];
    NSString *js = [NSString
      stringWithFormat:@"window.inappbilling.updatedTransactionCallback.apply(window.inappbilling, %@)",
      [callbackArgs JSONSerialize]];
    [self.commandDelegate evalJs:js];
}

- (void) finishTransaction: (CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult;
    NSString *identifier = (NSString*)[command.arguments objectAtIndex:0];
    SKPaymentTransaction *transaction = nil;

    if (identifier) {
        transaction = (SKPaymentTransaction*)[unfinishedTransactions objectForKey:identifier];
    }

    if (transaction) {
        DLog(@"Transaction %@ finished.", identifier);
        [[SKPaymentQueue defaultQueue] finishTransaction:transaction];
        [unfinishedTransactions removeObjectForKey:identifier];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self transactionFinished:transaction];
    }
    else {
        DLog(@"Cannot finish transaction %@.", identifier);
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Cannot finish transaction"];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)paymentQueue:(SKPaymentQueue *)queue restoreCompletedTransactionsFailedWithError:(NSError *)error
{
	NSString *js = [NSString stringWithFormat:
      @"window.inappbilling.restoreCompletedTransactionsFailed(%li)", (unsigned long)jsErrorCode(error.code)];
    [self.commandDelegate evalJs: js];
}

- (void)paymentQueueRestoreCompletedTransactionsFinished:(SKPaymentQueue *)queue
{
    NSString *js = @"window.inappbilling.restoreCompletedTransactionsFinished.apply(window.inappbilling)";
    [self.commandDelegate evalJs: js];
}


/*
I started to implement client side receipt validation. However, this requires the inclusion of OpenSSL into the source, which is probably behong what inappbilling plugin should do. So I choose only to provide base64 encoded receipts to the user, then he can deal with them the way he wants...
 
The code bellow may eventually work... it is untested

static NSString *rootAppleCA = @"MIIEuzCCA6OgAwIBAgIBAjANBgkqhkiG9w0BAQUFADBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwHhcNMDYwNDI1MjE0MDM2WhcNMzUwMjA5MjE0MDM2WjBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDkkakJH5HbHkdQ6wXtXnmELes2oldMVeyLGYne+Uts9QerIjAC6Bg++FAJ039BqJj50cpmnCRrEdCju+QbKsMflZ56DKRHi1vUFjczy8QPTc4UadHJGXL1XQ7Vf1+b8iUDulWPTV0N8WQ1IxVLFVkds5T39pyez1C6wVhQZ48ItCD3y6wsIG9wtj8BMIy3Q88PnT3zK0koGsj+zrW5DtleHNbLPbU6rfQPDgCSC7EhFi501TwN22IWq6NxkkdTVcGvL0Gz+PvjcM3mo0xFfh9Ma1CWQYnEdGILEINBhzOKgbEwWOxaBDKMaLOPHd5lc/9nXmW8Sdh2nzMUZaF3lMktAgMBAAGjggF6MIIBdjAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUK9BpR5R2Cf70a40uQKb3R01/CF4wHwYDVR0jBBgwFoAUK9BpR5R2Cf70a40uQKb3R01/CF4wggERBgNVHSAEggEIMIIBBDCCAQAGCSqGSIb3Y2QFATCB8jAqBggrBgEFBQcCARYeaHR0cHM6Ly93d3cuYXBwbGUuY29tL2FwcGxlY2EvMIHDBggrBgEFBQcCAjCBthqBs1JlbGlhbmNlIG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0YW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBjb25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZpY2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMA0GCSqGSIb3DQEBBQUAA4IBAQBcNplMLXi37Yyb3PN3m/J20ncwT8EfhYOFG5k9RzfyqZtAjizUsZAS2L70c5vu0mQPy3lPNNiiPvl4/2vIB+x9OYOLUyDTOMSxv5pPCmv/K/xZpwUJfBdAVhEedNO3iyM7R6PVbyTi69G3cN8PReEnyvFteO3ntRcXqNx+IjXKJdXZD9Zr1KIkIxH3oayPc4FgxhtbCS+SsvhESPBgOJ4V9T0mZyCKM2r3DYLP3uujL/lTaltkwGMzd/c6ByxW69oPIQ7aunMZT7XZNn/Bh1XZp5m5MkL72NVxnn6hUrcbvZNCJBIqxw8dtk2cXmPIS4AXUKqK1drk/NAJBzewdXUh";

- (void) verifyReceipt: (CDVInvokedUrlCommand*)command {
    CDVPluginResult* pluginResult;
    NSData *receiptData = [self appStoreReceipt];
    if (receiptData) {

        // Get receipt bytes
        void *receiptBytes = malloc([receiptData length]);
        [receiptData getBytes:receiptBytes length:[receiptData length]];
        BIO *b_receipt = BIO_new_mem_buf(receiptBytes, (int)[receiptData length]);

        // Get apple certificate bytes
        int appleLength = 0;
        void *appleBytes = unbase64(rootAppleCA, (int)[rootAppleCA length], &appleLength);
        BIO *b_x509 = BIO_new_mem_buf(appleBytes, appleLength);

        // Convert receipt data to PKCS7
        PKCS7 *p7 = d2i_PKCS7_bio(b_receipt, NULL);

        // Create the certificate store
        X509_STORE *store = X509_STORE_new();
        X509 *appleRootCA = d2i_X509_bio(b_x509, NULL);
        X509_STORE_add_cert(store, appleRootCA);

        // Verify the signature
        BIO *b_receiptPayload;
        int result = PKCS7_verify(p7, NULL, store, b_receiptPayload, 0);
        
        free(receiptBytes);
        free(appleBytes);

        if (result == 1) {
            // Receipt signature is valid.
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        }
        else {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                                             messageAsString:@"Invalid receipt signature"];
        }
    }
    else {
        // Older version of iOS, cannot check receipt on the device.
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}
*/


- (void) dispose {
    self.retainer = nil;
    self.list = nil;
    unfinishedTransactions = nil;

    [[SKPaymentQueue defaultQueue] removeTransactionObserver:self];

    [super dispose];
}

@end

/**
 * Receives product data for multiple productIds and passes arrays of
 * js objects containing these data to a single callback method.
 */
@implementation BatchProductsRequestDelegate

@synthesize plugin, command;

- (void)productsRequest:(SKProductsRequest*)request didReceiveResponse:(SKProductsResponse*)response {

    DLog(@"productsRequest: didReceiveResponse:");
    NSMutableArray *validProducts = [NSMutableArray array];
    DLog(@"Has %li validProducts", (unsigned long)[response.products count]);
	for (SKProduct *product in response.products) {
        DLog(@" - %@: %@", product.productIdentifier, product.localizedTitle);
        [validProducts addObject:
         [NSDictionary dictionaryWithObjectsAndKeys:
          NILABLE(product.productIdentifier),    @"id",
          NILABLE(product.localizedTitle),       @"title",
          NILABLE(product.localizedDescription), @"description",
          NILABLE(product.localizedPrice),       @"price",
          nil]];
        [self.plugin.list setObject:product forKey:[NSString stringWithFormat:@"%@", product.productIdentifier]];
    }

    NSArray *callbackArgs = [NSArray arrayWithObjects:
                             NILABLE(validProducts),
                             NILABLE(response.invalidProductIdentifiers),
                             nil];

    CDVPluginResult* pluginResult =
      [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:callbackArgs];
    DLog(@"productsRequest: didReceiveResponse: sendPluginResult: %@", callbackArgs);
    [self.plugin.commandDelegate sendPluginResult:pluginResult callbackId:self.command.callbackId];

#if ARC_ENABLED
    // For some reason, the system needs to send more messages to the productsRequestDelegate after this.
    // However, it doesn't retain it which causes a crash!
    // That's why we need keep references to the productsRequest[Delegate] objects...
    // It's no big thing anyway, and it's a one time thing.
    // [self.plugin.retainer removeObjectForKey:@"productsRequest"];
    // [self.plugin.retainer removeObjectForKey:@"productsRequestDelegate"];
#else
	[request release];
	[self    release];
#endif
}

- (void)request:(SKRequest *)request didFailWithError:(NSError *)error
{
    DLog(@"In-App Store unavailable (ERROR %li)", (unsigned long)error.code);
    DLog(@"%@", [error localizedDescription]);

    CDVPluginResult* pluginResult =
      [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[error localizedDescription]];
    [self.plugin.commandDelegate sendPluginResult:pluginResult callbackId:self.command.callbackId];
}

#if ARC_DISABLED
- (void) dealloc {
	[plugin  release];
	[command release];
	[super   dealloc];
}
#endif

@end
