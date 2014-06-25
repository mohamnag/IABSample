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

describe('IABPlugin', function() {

    it('waits for device ready and cordova plugin load', function(done) {
        document.addEventListener(
                'deviceready',
                function() {
                    done();
                },
                false
                );
    });

    describe('initialization', function() {
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
            inappbilling.init(success, fail, {},
                    [
                        "test_product_1",
                        "test_product_2"
                    ]
                    );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();

                done();
            }, delayForInitReaction);
        });

        it('should initialize even with not existing product', function(done) {
            inappbilling.init(success, fail, {
                showLog: true
            },
            [
                "not_existing_product_id"
            ]
                    );

            setTimeout(function() {
                expect(success).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();

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

        it('should return right arguments for success', function(done) {
            inappbilling.init(success, fail);

            setTimeout(function() {
                expect(success.calls.count()).toEqual(1);
                expect(success.calls.argsFor(0)).toEqual(['OK']);
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


});
