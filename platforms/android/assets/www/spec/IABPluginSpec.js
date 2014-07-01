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
    },
    toFailWithMessage: function(util, customEqualityTesters) {
        return {
            compare: function(actual, msg) {
                var result = {
                    pass: false,
                    message: msg
                };

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
 *      * test_never_bought_product    (Unmanaged)
 *      * test_subscription_1    (Non-free subscription)
 *      
 *  -   following in-app purchasing item should NOT be defined:
 *      * not_existing_product_id
 *      
 *      
 *  IMPORTANT: 
 *              I did include subscription tests, but they should not be tested
 *              as this will not be treated as test purchases. The only way is 
 *              to test them and then make a refund from mechant account 
 *              afterwards. Im not sure how Google will like it to happen 
 *              multiple times during testing!
 */

describe('InAppBilling', function() {
    var testSubscriptions = false;

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
    var ErrorObject = {
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
        var delayForInitReaction = 1500;

        beforeEach(function() {
            success = jasmine.createSpy('success');
            failCallback = jasmine.createSpy('fail');
        });

        it('should initialize without products list', function(done) {
            inappbilling.init(success, function(err) {
                expect({}).toFailWithMessage(err.msg);
            });

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should initialize with products list', function(done) {
            inappbilling.init(success, function() {
                fail();
                done();
            }, {showLog:true}, [
                "test_product_1",
                "test_product_2"
            ]);

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();

                expect(success.calls.argsFor(0).length).toEqual(1);
                expect(success.calls.argsFor(0)[0]).toBeDefined();
                expect(success.calls.argsFor(0)[0]).toBeArray();
                expect(success.calls.argsFor(0)[0].length).toEqual(2);
                expect(success.calls.argsFor(0)[0][0]).toImplement(ProductDetails);
                expect(success.calls.argsFor(0)[0][1]).toImplement(ProductDetails);

                done();
            }, delayForInitReaction);
        });

        it('should initialize even with not existing product', function(done) {
            inappbilling.init(success, failCallback, {}, [
                "not_existing_product_id"
            ]);

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

            inappbilling.init(success, failCallback, {
                showLog: false
            });

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(failCallback).not.toHaveBeenCalled();
                expect(console.log).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should show logs when requested', function(done) {
            spyOn(console, 'log');

            inappbilling.init(success, failCallback, {
                showLog: true
            });

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

        it('should load a single product', function(done) {
            inappbilling.loadProductDetails(
                    function(products) {
                        expect(products.length).toEqual(1);
                        expect(products[0]).toImplement(ProductDetails);
                        expect(products[0].id).toEqual("test_product_1");
                        expect(products[0].type).toEqual("inapp");
                        done();
                    },
                    function() {
                        fail();
                        done();
                    },
                    'test_product_1'
                    );

        });

        if (!!testSubscriptions) {
            it('should load a single subscription', function(done) {
                inappbilling.loadProductDetails(function(products) {
                    expect(products.length).toEqual(1);
                    expect(products[0]).toImplement(ProductDetails);
                    expect(products[0].id).toEqual("test_subscription_1");
                    expect(products[0].type).toEqual("subs");
                    done();

                }, function() {
                    fail();
                    done();

                }, 'test_subscription_1');

            });
        }

        it('should load multiple products', function(done) {
            inappbilling.loadProductDetails(function(products) {
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

            }, function() {
                fail();
                done();
            }, [
                'test_product_1',
                'test_product_2'
            ]);

        });

        it('should not load invalid products', function(done) {

            inappbilling.loadProductDetails(function(products) {
                expect(products.length).toEqual(0);
                done();
            }, function() {
                fail();
                done();
            }, [
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

            }, function() {
                fail();
                done();
            });
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
                    }, function() {
                        fail();
                        done();
                    });

                }, function() {
                    fail();
                    done();
                }, 'test_product_1');

            }, function() {
                fail();
                done();
            });
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
                    }, function() {
                        fail();
                        done();
                    });

                }, function() {
                    fail();
                    done();
                }, [
                    'test_product_1',
                    'test_product_2'
                ]);

            }, function() {
                fail();
                done();
            });
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
                            expect(products.length).toBe(3);

                            done();
                        }, function() {
                            fail();
                            done();
                        });

                    }, function() {
                        fail();
                        done();
                    }, [
                        'test_product_2',
                        'test_subscription_1'
                    ]);

                }, function() {
                    fail();
                    done();
                }, [
                    'test_product_1'
                ]);

            }, function() {
                fail();
                done();
            });
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
                        }, function() {
                            fail();
                            done();
                        });

                    }, function() {
                        fail();
                        done();
                    }, [
                        'not_existing_product_id'
                    ]);

                }, function() {
                    fail();
                    done();
                }, [
                    'test_product_1',
                    'test_product_2'
                ]);

            }, function() {
                fail();
                done();
            });
        });

    });

    describe('buy', function() {

        beforeEach(function(done) {
            // we definitly need a working but empty plugin!
            inappbilling.init(function() {
                done();
            });

            // increase timeout to 5min, as some of these test cases need user input
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
        });

        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        });

        it('should not allow buying not loaded products', function(done) {
            inappbilling.buy(function() {
                fail();
                done();
            }, function(error) {
                expect(error).toBeDefined();
                expect(error).toImplement(ErrorObject);
                expect(error.errorCode).toEqual(inappbilling.ERR_PRODUCT_NOT_LOADED);

                done();

            }, 'test_product_1');
        });

        it('should not allow subscribing to not loaded products', function(done) {
            inappbilling.buy(function() {
                fail();
                done();
            }, function(error) {
                expect(error).toBeDefined();
                expect(error).toImplement(ErrorObject);
                expect(error.errorCode).toEqual(inappbilling.ERR_PRODUCT_NOT_LOADED);

                done();

            }, 'test_subscription_1');
        });

        it('should let buy an existing loaded product', function(done) {
            alert('Please FINISH this payment, you have max 5 min time!');

            inappbilling.loadProductDetails(function() {

                inappbilling.buy(function(purchase) {
                    expect(purchase).toBeDefined();
                    expect(purchase).toImplement(NewPurchaseObject);
                    expect(purchase.productId).toEqual('test_product_1');

                    done();

                }, function(err) {
                    expect({}).toFailWithMessage('Buying test_product_1 failed ' + err.msg);
                    done();
                }, 'test_product_1');

            }, function() {
                expect({}).toFailWithMessage('Loading test_product_1 failed');
                done();
            }, 'test_product_1');

        });

        if (!!testSubscriptions) {
            it('should let subscribe to an existing loaded product', function(done) {
                alert('Please FINISH this subscription, you have max 5 min time!');

                inappbilling.loadProductDetails(function() {

                    inappbilling.buy(function(purchase) {
                        expect(purchase).toBeDefined();
                        expect(purchase).toImplement(NewPurchaseObject);
                        expect(purchase.productId).toEqual('test_subscription_1');

                        done();

                    }, function(err) {
                        expect({}).toFailWithMessage("Could not buy the product: test_subscription_1 " + err.msg);
                        done();

                    }, 'test_subscription_1');

                }, function(err) {
                    expect({}).toFailWithMessage("Could not load product: test_subscription_1 " + err.msg);
                    done();
                }, 'test__1');

            });
        }

        it('should handle cancelled payment correctly', function(done) {
            alert('Please CANCEL this payment, you have max 5 min time!');

            inappbilling.loadProductDetails(function() {

                inappbilling.buy(function() {
                    fail();
                    done();
                }, function(error) {
                    expect(error).toBeDefined();
                    expect(error).toImplement(ErrorObject);
                    expect(error.errorCode).toEqual(inappbilling.ERR_PAYMENT_CANCELLED);

                    done();

                }, 'test_product_1');

            }, function() {
                fail();
                done();
            }, 'test_product_1');

        });

    });

    describe('getVerificationPayload', function() {

        beforeEach(function(done) {
            // we definitly need a working but empty plugin!
            inappbilling.init(function() {
                done();
            });

            // increase timeout to 5min, as some of these test cases need user input
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
        });

        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        });

        it('should return same payload later as on purchase time', function(done) {
            alert('Please FINISH this payment, you have max 5 min time!');

            inappbilling.loadProductDetails(function() {

                // buy
                inappbilling.buy(function(purchase) {
                    expect(purchase.productId).toEqual('test_product_1');
                    var orgPayload = purchase.verificationPayload;

                    // re-init plugin
                    inappbilling.init(function() {

                        // get verification payload for the purchase
                        inappbilling.getVerificationPayload(function(payload) {
                            expect(payload).toBeDefined();
                            expect(payload).toEqual(orgPayload);

                            done();

                        }, function() {
                            fail();
                            done();

                        }, purchase.id);

                    }, function() {
                        fail();
                        done();

                    }, {}, 'test_product_1');

                }, function() {
                    fail();
                    done();
                }, 'test_product_1');

            }, function() {
                fail();
                done();
            }, 'test_product_1');

        });

        it('should not return payload for invalid purchase id', function(done) {
            alert('Please FINISH this payment, you have max 5 min time!');

            inappbilling.loadProductDetails(function() {

                // buy
                inappbilling.buy(function(purchase) {
                    expect(purchase.productId).toEqual('test_product_1');

                    // re-init
                    inappbilling.init(function() {

                        // get verification payload
                        inappbilling.getVerificationPayload(function() {
                            fail();
                            done();

                        }, function(err) {
                            expect(err).toBeDefined();
                            expect(err).toImplement(ErrorObject);
                            expect(err.errorCode).toBe(inappbilling.ERR_INVALID_PURCHASE_ID);

                            done();

                        }, purchase.id + 'make_it_invalid');

                    }, function() {
                        fail();
                        done();

                    }, {}, 'test_product_1');

                }, function() {
                    fail();
                    done();
                }, 'test_product_1');

            }, function() {
                fail();
                done();
            }, 'test_product_1');

        });

    });

    describe('getPurchases', function() {

        beforeEach(function(done) {
            // we definitly need a working but empty plugin!
            inappbilling.init(function() {
                done();
            });

            // increase timeout to 5min, as some of these test cases need user input
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
        });

        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        });

        it('should be able to get purchase from one payment', function(done) {
            alert('Please FINISH this payment, you have max 5 min time!');

            inappbilling.loadProductDetails(function() {

                // buy
                inappbilling.buy(function(purchase) {
                    expect(purchase.productId).toEqual('test_product_1');

                    // re-init plugin
                    inappbilling.init(function() {

                        // get purchases
                        inappbilling.getPurchases(function(purchases) {
                            expect(purchases).toBeArray();
                            expect(purchases.length).toBeGreaterThan(1);
                            expect(purchases[purchases.length - 1]).toImplement(PurchaseObject);
                            expect(purchases[purchases.length - 1].productId).toEqual('test_product_1');

                            done();

                        }, function() {
                            fail();
                            done();

                        }, purchase.id);

                    }, function() {
                        fail();
                        done();

                    }, {}, 'test_product_1');

                }, function() {
                    fail();
                    done();
                }, 'test_product_1');

            }, function() {
                fail();
                done();
            }, 'test_product_1');
        });

        if (!!testSubscriptions) {
            it('should be able to get purchase from one subscription', function(done) {
                alert('Please FINISH this payment, you have max 5 min time!');

                inappbilling.loadProductDetails(function() {

                    // buy
                    inappbilling.buy(function(purchase) {
                        expect(purchase.productId).toEqual('test_subscription_1');

                        // re-init plugin
                        inappbilling.init(function() {

                            // get purchases
                            inappbilling.getPurchases(function(purchases) {
                                expect(purchases).toBeArray();
                                expect(purchases.length).toBeGreaterThan(1);
                                expect(purchases[purchases.length - 1]).toImplement(PurchaseObject);
                                expect(purchases[purchases.length - 1].productId).toEqual('test_subscription_1');

                                done();

                            }, function() {
                                fail();
                                done();

                            }, purchase.id);

                        }, function() {
                            fail();
                            done();

                        }, {}, 'test_subscription_1');

                    }, function() {
                        fail();
                        done();
                    }, 'test_subscription_1');

                }, function() {
                    fail();
                    done();
                }, 'test_subscription_1');
            });
        }

        it('should be able to get purchases from multiple payments', function(done) {
            /* sorry to break test independency, but at this point we have 
             * bought products that can not be bought again!
             */
            inappbilling.getPurchases(function(purchases) {
                expect(purchases).toBeArray();
                expect(purchases.length).toBeGreaterThan(2);

                expect(purchases[purchases.length - 2]).toImplement(PurchaseObject);
                expect(purchases[purchases.length - 2].productId).toEqual('test_product_1');

                if (!!testSubscriptions) {
                    expect(purchases[purchases.length - 1]).toImplement(PurchaseObject);
                    expect(purchases[purchases.length - 1].productId).toEqual('test_subscription_1');
                }

                done();

            }, function() {
                fail();
                done();

            }, purchase.id);
        });

        it('should not return purchases from canceled payments', function(done) {

            alert('Please ACNCEL this payment, you have max 5 min time!');

            inappbilling.loadProductDetails(function() {

                // buy
                inappbilling.buy(function(purchase) {
                    expect(purchase.productId).toEqual('test_product_2');

                    // get purchases
                    inappbilling.getPurchases(function(purchases) {
                        if (purchases.length > 0) {
                            expect(purchases[purchases.length - 1]).toImplement(PurchaseObject);
                            expect(purchases[purchases.length - 1].productId).not.toEqual('test_product_2');
                        }

                        done();

                    }, function() {
                        fail();
                        done();

                    }, purchase.id);


                }, function() {
                    fail();
                    done();
                }, 'test_product_2');

            }, function() {
                fail();
                done();
            }, 'test_product_2');

        });

    });

    describe('consumeProduct', function() {

        it('should not allow cunsumption of a not owned product', function(done) {
            inappbilling.loadProductDetails(function() {

                inappbilling.consumeProduct(function(purchase) {
                    expect(purchase).toBeDefined();
                    expect(purchase).toImplement(PurchaseObject);
                    expect(purchase.productId).toEqual('test_never_bought_product');

                    done();

                }, function() {
                    fail();
                    done();

                }, 'test_never_bought_product');

            }, function() {
                fail();
                done();
            }, 'test_never_bought_product');
        });

        it('should let cunsume an owned product', function(done) {

            inappbilling.getPurchases(function(purchases) {
                expect(purchases).toBeDefined();
                expect(purchases.length).toBeGreaterThan(0);

                inappbilling.consumeProduct(function(purchase) {
                    expect(purchase).toBeDefined();
                    expect(purchase).toImplement(PurchaseObject);
                    expect(purchase.id).toEqual(purchases[0].id);
                    expect(purchase.prductId).toEqual(purchases[0].prductId);

                    done();

                }, function() {
                    fail();
                    done();
                }, purchases[0].productId);


            }, function() {
                fail();
                done();
            });

        });

        it('should not allow cunsumption of a product twice', function(done) {
            alert('Please FINISH this payment, you have max 5 min time!');

            inappbilling.loadProductDetails(function() {

                // buy
                inappbilling.buy(function(purchase) {
                    expect(purchase.productId).toEqual('test_product_1');

                    // consume
                    inappbilling.consumeProduct(function(purchase) {
                        expect(purchase).toBeDefined();
                        expect(purchase.prductId).toEqual('test_product_1');

                        // retry consume
                        inappbilling.consumeProduct(function() {
                            fail();
                            done();

                        }, function(err) {
                            expect(err).toBeDefined();
                            expect(err).toImplement(ErrorObject);
                            expect(err.errorCode).toEqual(inappbilling.ERR_CONSUME_NOT_OWNED_ITEM);

                            done();

                        }, 'test_product_1');

                    }, function() {
                        fail();
                        done();
                    }, 'test_product_1');


                }, function() {
                    fail();
                    done();
                }, 'test_product_1');

            }, function() {
                fail();
                done();
            }, 'test_product_1');
        });

        it('should not return a purchase after cunsumption anymore', function(done) {
            alert('Please FINISH this payment, you have max 5 min time!');

            inappbilling.loadProductDetails(function() {

                // buy
                inappbilling.buy(function(purchase) {
                    expect(purchase.productId).toEqual('test_product_1');

                    // check purchases
                    inappbilling.getPurchases(function(purchases) {
                        expect(purchases).toBeDefined();
                        expect(purchases[purchases.length - 1].productId).toBeEqual('test_product_1');
                        var oldCount = purchases.length;

                        // consume
                        inappbilling.consumeProduct(function(purchase) {
                            expect(purchase).toBeDefined();
                            expect(purchase.prductId).toEqual('test_product_1');

                            // check purchases
                            inappbilling.consumeProduct(function(purchases) {
                                expect(purchases).toBeDefined();
                                expect(purchases.length).toBeLessThan(oldCount);

                                for (i = 0; i < purchases.length; i++) {
                                    expect(purchases[i].productId).not.toBeEqual('test_product_1');
                                }

                            }, function() {
                                fail();
                                done();

                            }, 'test_product_1');

                        }, function() {
                            fail();
                            done();
                        }, 'test_product_1');

                    }, function() {
                        fail();
                        done();
                    });


                }, function() {
                    fail();
                    done();
                }, 'test_product_1');

            }, function() {
                fail();
                done();
            }, 'test_product_1');

        });

    });
});
