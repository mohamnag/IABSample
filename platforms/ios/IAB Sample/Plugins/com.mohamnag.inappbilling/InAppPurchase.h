//
//  InAppPurchase.h
//  beetight
//
//  Created by Matt Kane on 20/02/2011.
//  Copyright 2011 Matt Kane. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <StoreKit/StoreKit.h>

#import <Cordova/CDVPlugin.h>
#import <Cordova/NSData+Base64.h>

#import "SKProduct+LocalizedPrice.h"

@interface InAppPurchase : CDVPlugin <SKPaymentTransactionObserver> {
    NSMutableDictionary *list;
    NSMutableDictionary *retainer;
    NSMutableDictionary *unfinishedTransactions;
}
@property (nonatomic,retain) NSMutableDictionary *list;
@property (nonatomic,retain) NSMutableDictionary *retainer;


- (void) jsLog: (NSString*)msg;
- (void) init: (CDVInvokedUrlCommand*)command;
- (void) getPurchases: (CDVInvokedUrlCommand*)command;
- (void) buy: (CDVInvokedUrlCommand*)command;
- (void) paymentQueue:(SKPaymentQueue *)queue updatedTransactions:(NSArray *)transactions;
- (void) getProductDetails: (CDVInvokedUrlCommand*)command;


- (void) paymentQueue:(SKPaymentQueue *)queue restoreCompletedTransactionsFailedWithError:(NSError *)error;
- (void) paymentQueueRestoreCompletedTransactionsFinished:(SKPaymentQueue *)queue;

- (void) finishTransaction: (CDVInvokedUrlCommand*)command;

@end

@interface BatchProductsRequestDelegate : NSObject <SKProductsRequestDelegate> {
	InAppPurchase*        plugin;
    CDVInvokedUrlCommand* command;
}

@property (nonatomic,retain) InAppPurchase* plugin;
@property (nonatomic,retain) CDVInvokedUrlCommand* command;

@end;



@interface IABMutablePayment : SKMutablePayment {
    CDVInvokedUrlCommand *command;
}

+ (id)paymentWithProduct:(SKProduct*)product forCommand:(CDVInvokedUrlCommand*)command;
- (void)setCommand:(CDVInvokedUrlCommand*)orgCommand;
- (CDVInvokedUrlCommand*	)getCommand;

@end