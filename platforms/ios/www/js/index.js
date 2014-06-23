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

        console.log('Received Event: ' + id);
    },
    initIab: function() {
        inappbilling.init(
          function() {
            app.receivedEvent('inappbillingready');
          },
          function(err) {
            console.log(err);
            document.getElementById('output').innerHTML = err;
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
    loadProds: function() {
        inappbilling.getAvailableProducts(
            function(prods) {
                console.log(prods);
                document.getElementById('output').innerHTML = JSON.stringify(prods);
            },
            function(err) {
                console.log(err);
            }
            );
    },
    buyProd: function() {
        inappbilling.buy(
            function(data) {
                document.getElementById('output').innerHTML = 'succeed buying: ' + data;
                console.log(data);
            },
            function(err) {
                document.getElementById('output').innerHTML = 'failed buying: ' + err;
                console.log(err);
            },
            'android.test.purchased'
            );
    },
    consProd: function() {
        inappbilling.consumePurchase(
            function(data) {
                document.getElementById('output').innerHTML = 'succeed buying: ' + data;
            },
            function(err) {
                document.getElementById('output').innerHTML = 'failed buying: ' + err;
            },
            'android.test.purchased'
            );
    },
    buyRealProd: function() {
        inappbilling.buy(
            function(data) {
                document.getElementById('output').innerHTML = 'succeed buying: ' + data;
            },
            function(err) {
                document.getElementById('output').innerHTML = 'failed buying: ' + err;
            },
            'test_product_1'
            );
    },
    consRealProd: function() {
        inappbilling.consumePurchase(
            function(data) {
                document.getElementById('output').innerHTML = 'succeed buying: ' + data;
            },
            function(err) {
                document.getElementById('output').innerHTML = 'failed buying: ' + err;
            },
            'test_product_1'
            );
    }
};
