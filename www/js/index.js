/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
 var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');
    },
    log: function(msg, data) {
        console.log('IABSample: ' + msg);
        !!data && console.log(data);

        document.getElementById('output').innerHTML = msg + '<hl/>' + JSON.stringify(data);
    },
    initIab: function() {
        inappbilling.init(
            function() {
                app.receivedEvent('inappbillingready');
                app.log('init succeed');
            },
            function(err) {
                app.log('init failed', err);
            },
            {
                showLog: true
            },
            [
                "test_product_1",
                "test_product_2"
            ]
        );
        
    },
    getPurchases: function() {
        inappbilling.getPurchases(
            function(purchases) {
                app.log('get purchases succeed', purchases);
            },
            function(err) {
                app.log('get purchases failed', err);
            }
        );
    },
    getAvailableProducts: function() {
        inappbilling.getLoadedProducts(
            function(prods) {
                app.log('load products succeed', prods);
            },
            function(err) {
                app.log('load product failed', err);
            }
        );
    },
    buyProd1: function() {
        inappbilling.buy(
            function(data) {
                app.log('succeed buying "test_product_1"', data);
            },
            function(err) {
                app.log('failed buying "test_product_1"', err);
            },
            'test_product_1'
        );
    },
    consProd1: function() {
        inappbilling.consumeProduct(
            function(data) {
                app.log('succeed consuming "test_product_1"', data);
            },
            function(err) {
                app.log('failed consuming "test_product_1"', err);
            },
            'test_product_1'
        );
    },
    buyProd2: function() {
        inappbilling.buy(
            function(data) {
                app.log('succeed buying "test_product_1"', data);
            },
            function(err) {
                app.log('failed buying "test_product_1"', err);
            },
            'test_product_1'
        );
    },
    consProd2: function() {
        inappbilling.consumeProduct(
            function(data) {
                app.log('succeed consuming "test_product_1"', data);
            },
            function(err) {
                app.log('failed consuming "test_product_1"', err);
            },
            'test_product_1'
        );
    }
};
