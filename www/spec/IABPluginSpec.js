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
        var success, fail;
        var delayForInitReaction = 1000;

        beforeEach(function() {
            success = jasmine.createSpy('success');
            fail = jasmine.createSpy('fail');
        });

        it('should initialize without products list', function(done) {
            inappbilling.init(success, fail);

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should initialize with products list', function(done) {
            inappbilling.init(success, fail,
                    {
                        showLog: true
                    },
            [
                "test_product_1",
                "test_product_2"
            ]
                    );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();

                expect(success.calls.argsFor(0).length).toEqual(1);
                expect(success.calls.argsFor(0)[0].length).toEqual(2);
                expect(success.calls.argsFor(0)[0][0]).toImplement(ProductDetails);
                expect(success.calls.argsFor(0)[0][1]).toImplement(ProductDetails);

                done();
            }, delayForInitReaction);
        });

        it('should initialize even with not existing product', function(done) {
            inappbilling.init(success, fail, {},
                    [
                        "not_existing_product_id"
                    ]
                    );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();

                expect(success.calls.argsFor(0)).toEqual([[]]);

                done();
            }, delayForInitReaction);
        });

        it('should not show logs by default', function(done) {
            spyOn(console, 'log');

            inappbilling.init(success, fail);

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
                expect(console.log).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should not show logs when requested', function(done) {
            spyOn(console, 'log');

            inappbilling.init(success, fail,
                    {
                        showLog: false
                    }
            );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
                expect(console.log).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should show logs when requested', function(done) {
            spyOn(console, 'log');

            inappbilling.init(success, fail,
                    {
                        showLog: true
                    }
            );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
                expect(console.log).toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should return right arguments for success with no products', function(done) {
            inappbilling.init(success, fail);

            setTimeout(function() {
                expect(success.calls.count()).toEqual(1);
                expect(success.calls.argsFor(0)).toEqual([[]]);
                expect(fail).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should return right arguments for success with products', function(done) {
            inappbilling.init(success, fail, {}, [
                "test_product_1",
                "test_product_2"
            ]);

            setTimeout(function() {
                expect(success.calls.count()).toEqual(1);
                expect(success.calls.argsFor(0)[0].length).toEqual(2);
                expect(fail).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        // TODO: how to make init fail???
//        it('should return right arguments for fail', function(done) {
//            inappbilling.init(success, fail);
//
//            setTimeout(function() {
//                expect(success).toHaveBeenCalled();
//                expect(success.calls.argsFor(0)).toEqual([]);
//                expect(fail).not.toHaveBeenCalled();
//
//                done();
//            }, delayForInitReaction);
//        });

    });

    describe('getProductDetails', function() {
        beforeEach(function(done) {
            // we definitly need a working but empty plugin!
            inappbilling.init(function() {
                done();
            });
        });

        it('should load a single new product', function(done) {
            inappbilling.getProductDetails(
                    function(products) {
                        expect(products.length).toEqual(1);
                        expect(products[0]).toImplement(ProductDetails);
                        expect(products[0].id).toEqual("test_product_1");
                        done();
                    },
                    function() {
                        expect(false).toBe(true);
                    },
                    'test_product_1'
                    );

        });

        it('should load multiple products', function(done) {
            inappbilling.getProductDetails(
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
                    function() {
                        expect(false).toBe(true);
                    },
                    [
                        'test_product_1',
                        'test_product_2'
                    ]
                    );

        });

        it('should not load invalid products', function(done) {

            inappbilling.getProductDetails(
                    function(products) {
                        expect(products.length).toEqual(0);
                        done();
                    },
                    function() {
                        expect(false).toBe(true);
                    },
                    [
                        'not_existing_product_id'
                    ]
                    );

        });

    });

    describe('getAvailableProducts', function() {
        xit('inventory should be empty before loading products');
        xit('should not remove existing products when loading new ones');
    });

    describe('buy', function() {
    });

    describe('subscribe', function() {
    });

    describe('getPurchases', function() {
    });

    describe('consumePurchase', function() {
    });

});
