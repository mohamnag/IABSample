/* 
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Mohammad Naghavi
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 */


customMatchers = {
    toImplement: function(util, customEqualityTesters) {

        return {
            compare: function(actual, api) {
                var result = {};

                var required;
                if (!actual || !api) {
                    result.pass = false;
                }
                else {
                    for (required in api) {
                        if ((required in actual) === false) {
                            result.pass = false;
                            result.message = "Expected key '" + required + "' was not found in " + actual;
                        }
                    }

                    result.pass = true;
                }

                return result;
            }
        };
    },
    toBeArray: function(util, customEqualityTesters) {

        return {
            compare: function(actual, expected) {
                var result = {};

                result.pass = actual instanceof Array;

                if (!result.pass) {
                    result.message = "Expected " + actual + " to be an array";
                }

                return result;
            }
        };
    }
};

/**
 * This is an automated test for IAB plugin. For this to run successfully:
 * 
 * on android:
 *  -   the app should be published on google play (use alpha or beta if you dont 
 *      want the app to appear on your account now.
 *      
 *  -   the account on the device intended for testing should be registered for 
 *      testing product (unless you want to do real payments).
 *      
 *  -   following in-app purchasing items should have been defined and published:
 *      * test_product_1    (Managed)
 *      * test_product_2    (Unmanaged)
 *      
 *  -   following in-app purchasing item should NOT be defined:
 *      * not_existing_product_id
 */

describe('InAppBilling', function() {

    // the structure for product details
    var ProductDetails = {
        id: "test_product_1",
        type: "inapp",
        price: "€ 2,00",
        priceMicros: 2000000,
        currencyCode: "EUR",
        title: "Test Product 1 (IABSample)",
        description: "Test Product 1 Description"
    };

    // the structure passed to error callback.
    var errorObject = {
        errorCode: 1,
        msg: "",
        nativeEvent: {}
    };

    // a purchase data just after being bought
    var NewPurchaseObject = {
        id: "",
        originalId: "",
        productId: "",
        expirationDate: "",
        verificationPayload: ""
    };
    
    // a purchase data belonging to a previous payment process
    var PurchaseObject = {
        id: "",
        originalId: "",
        productId: "",
        expirationDate: ""
    };

    // test fail function
    var fail = function() {
        expect(false).toBe(true);
    };

    beforeEach(function() {
        jasmine.addMatchers(customMatchers);
    });

    it('waits for device ready and cordova plugin load', function(done) {
        document.addEventListener(
                'deviceready',
                function() {
                    done();
                },
                false
                );
    });

    describe('init', function() {
        var success, failCallback;
        var delayForInitReaction = 1000;

        beforeEach(function() {
            success = jasmine.createSpy('success');
            failCallback = jasmine.createSpy('fail');
        });

        it('should initialize without products list', function(done) {
            inappbilling.init(success, fail);

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should initialize with products list', function(done) {
            inappbilling.init(success, function(){fail();done();}, {}, [
                "test_product_1",
                "test_product_2"
            ]);

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();

                expect(success.calls.argsFor(0).length).toEqual(1);
                expect(success.calls.argsFor(0)[0].length).toEqual(2);
                expect(success.calls.argsFor(0)[0][0]).toImplement(ProductDetails);
                expect(success.calls.argsFor(0)[0][1]).toImplement(ProductDetails);

                done();
            }, delayForInitReaction);
        });

        it('should initialize even with not existing product', function(done) {
            inappbilling.init(success, failCallback, {},
                    [
                        "not_existing_product_id"
                    ]
                    );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();

                expect(success.calls.argsFor(0)).toEqual([[]]);

                done();
            }, delayForInitReaction);
        });

        it('should not show logs by default', function(done) {
            spyOn(console, 'log');

            inappbilling.init(success, failCallback);

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();
                expect(console.log).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should not show logs when requested', function(done) {
            spyOn(console, 'log');

            inappbilling.init(success, failCallback,
                    {
                        showLog: false
                    }
            );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();
                expect(console.log).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should show logs when requested', function(done) {
            spyOn(console, 'log');

            inappbilling.init(success, failCallback,
                    {
                        showLog: true
                    }
            );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();
                expect(console.log).toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should return right arguments for success with no products', function(done) {
            inappbilling.init(success, failCallback);

            setTimeout(function() {
                expect(success.calls.count()).toEqual(1);
                expect(success.calls.argsFor(0)).toEqual([[]]);
                expect(failCallback).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should return right arguments for success with products', function(done) {
            inappbilling.init(success, failCallback, {}, [
                "test_product_1",
                "test_product_2"
            ]);

            setTimeout(function() {
                expect(success.calls.count()).toEqual(1);
                expect(success.calls.argsFor(0)[0].length).toEqual(2);
                expect(failCallback).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        // TODO: how to make init fail???
//        it('should return right arguments for fail', function(done) {
//            inappbilling.init(success, failCallback);
//
//            setTimeout(function() {
//                expect(success).toHaveBeenCalled();
//                expect(success.calls.argsFor(0)).toEqual([]);
//                expect(failCallback).not.toHaveBeenCalled();
//
//                done();
//            }, delayForInitReaction);
//        });

    });

    describe('loadProductDetails', function() {
        beforeEach(function(done) {
            // we definitly need a working but empty plugin!
            inappbilling.init(function() {
                done();
            });
        });

        it('should load a single new product', function(done) {
            inappbilling.loadProductDetails(
                    function(products) {
                        expect(products.length).toEqual(1);
                        expect(products[0]).toImplement(ProductDetails);
                        expect(products[0].id).toEqual("test_product_1");
                        done();
                    },
                    function(){fail();done();},
                    'test_product_1'
                    );

        });

        it('should load multiple products', function(done) {
            inappbilling.loadProductDetails(
                    function(products) {
                        expect(products.length).toEqual(2);
                        expect(products[0]).toImplement(ProductDetails);
                        expect(products[1]).toImplement(ProductDetails);

                        var ids = [
                            products[0].id,
                            products[1].id
                        ];

                        expect(ids).toContain("test_product_1");
                        expect(ids).toContain("test_product_2");
                        done();

                    },
                    function(){fail();done();},
                    [
                        'test_product_1',
                        'test_product_2'
                    ]
                    );

        });

        it('should not load invalid products', function(done) {

            inappbilling.loadProductDetails(function(products) {
                expect(products.length).toEqual(0);
                done();
            }, function(){fail();done();}, [
                'not_existing_product_id'
            ]);

        });

    });

    describe('getLoadedProducts', function() {

        beforeEach(function(done) {
            // we definitly need a working but empty plugin!
            inappbilling.init(function() {
                done();
            });
        });

        it('should return empty inventory before loading products', function(done) {
            inappbilling.getLoadedProducts(function(products) {
                expect(products).toBeDefined();
                expect(products).toBeArray();
                expect(products.length).toBe(0);

                done();

            }, function(){fail();done();});
        });

        it('should return one item in inventory after loading only one', function(done) {

            // check empty
            inappbilling.getLoadedProducts(function(products) {
                expect(products.length).toBe(0);

                // load
                inappbilling.loadProductDetails(function() {

                    // check not empty!
                    inappbilling.getLoadedProducts(function(products) {
                        expect(products).toBeDefined();
                        expect(products).toBeArray();
                        expect(products.length).toBe(1);

                        done();
                    }, function(){fail();done();});

                }, function(){fail();done();}, 'test_product_1');

            }, function(){fail();done();});
        });

        it('should return multiple items in inventory after loading multiple items at once', function(done) {

            // check empty
            inappbilling.getLoadedProducts(function(products) {
                expect(products.length).toBe(0);

                // load
                inappbilling.loadProductDetails(function() {

                    // check not empty!
                    inappbilling.getLoadedProducts(function(products) {
                        expect(products).toBeDefined();
                        expect(products).toBeArray();
                        expect(products.length).toBe(2);

                        done();
                    }, function(){fail();done();});

                }, function(){fail();done();}, [
                    'test_product_1',
                    'test_product_2'
                ]);

            }, function(){fail();done();});
        });

        it('should return multiple items in inventory after loading multiple items incrementally', function(done) {

            // check empty
            inappbilling.getLoadedProducts(function(products) {
                expect(products.length).toBe(0);

                // load 1st
                inappbilling.loadProductDetails(function() {
                    // load 2nd
                    inappbilling.loadProductDetails(function() {

                        // check not empty!
                        inappbilling.getLoadedProducts(function(products) {
                            expect(products).toBeDefined();
                            expect(products).toBeArray();
                            expect(products.length).toBe(2);

                            done();
                        }, function(){fail();done();});

                    }, function(){fail();done();}, [
                        'test_product_2'
                    ]);

                }, function(){fail();done();}, [
                    'test_product_1'
                ]);

            }, function(){fail();done();});
        });

        it('should not change inventory when not existing product loaded', function(done) {

            // check empty
            inappbilling.getLoadedProducts(function(products) {
                expect(products.length).toBe(0);

                // load valid products
                inappbilling.loadProductDetails(function() {

                    // load invalid products
                    inappbilling.loadProductDetails(function() {

                        // check not empty!
                        inappbilling.getLoadedProducts(function(products) {
                            expect(products).toBeDefined();
                            expect(products).toBeArray();
                            expect(products.length).toBe(2);

                            done();
                        }, function(){fail();done();});

                    }, function(){fail();done();}, [
                        'not_existing_product_id'
                    ]);

                }, function(){fail();done();}, [
                    'test_product_1',
                    'test_product_2'
                ]);

            }, function(){fail();done();});
        });

    });

    describe('buy', function() {

        beforeEach(function(done) {
            // we definitly need a working but empty plugin!
            inappbilling.init(function() {
                done();
            }, null, {showLog:true});

            // increase timeout to 5min, as some of these test cases need user input
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
        });

        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        });

        it('should not allow buying not loaded products', function(done) {
            inappbilling.buy(function(){fail();done();}, function(error) {
                expect(error).toBeDefined();
                expect(error).toImplement(errorObject);
                expect(error.errorCode).toEqual(inappbilling.ERR_PRODUCT_NOT_LOADED);

                done();

            }, 'test_product_1');
        });

        it('should let buy an existing loaded product', function(done) {
            alert('Please FINISH this payment, you have max 5 min time!');
            
            inappbilling.loadProductDetails(function() {

                inappbilling.buy(function(purchase) {
                    expect(purchase).toBeDefined();
                    expect(purchase).toImplement(NewPurchaseObject);
                    expect(purchase.productId).toEqual('test_product_1');

                    done();

                }, function(){fail();done();}, 'test_product_1');

            }, function(){fail();done();}, 'test_product_1');

        });
        
        it('should handle canceled payment correctly', function(done) {
            alert('Please CANCEL this payment, you have max 5 min time!');
            
            inappbilling.loadProductDetails(function() {

                inappbilling.buy(function(){fail();done();}, function(error) {
                    expect(error).toBeDefined();
                    expect(error).toImplement(errorObject);
                    expect(error.errorCode).toEqual(inappbilling.ERR_PAYMENT_CANCELLED);

                    done();

                }, 'test_product_1');

            }, function(){fail();done();}, 'test_product_1');

        });

    });

    describe('subscribe', function() {
    });

    describe('getVerificationPayload', function() {
    });

    describe('getPurchases', function() {
    });

    describe('consumePurchase', function() {
    });

});
