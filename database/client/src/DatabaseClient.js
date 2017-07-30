; (function (global, factory) {
        typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        global.VeloxDatabaseClient = factory() ;
}(this, (function () { 'use strict';


    /**
     * @typedef VeloxDatabaseClientOptions
     * @type {object}
     * @property {string} serverUrl Server end point URL
     * @property {function} xhrPrepare function that receive the XHR object to customize it if needed
     */

    /**
     * The Velox database client
     * 
     * @constructor
     * 
     * @param {VeloxDatabaseClientOptions} options - The server URL
     */
    function VeloxDatabaseClient(options) {
        if(!options || typeof(options) !== "object"){
            throw "VeloxDatabaseClient missing options" ;
        }
        this.options = JSON.parse(JSON.stringify(options))  ;
        if(!this.options.serverUrl){
            throw "VeloxDatabaseClient missing option serverUrl" ;
        }

        if(this.options.serverUrl[this.options.serverUrl.length-1] !== "/"){
            //add trailing slash
            this.options.serverUrl+"/" ;
        }

    }

    VeloxDatabaseClient.prototype._ajax = function (url, method, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = (function () {
            if (xhr.status === 200) {
                callback(xhr.responseText);
            } else {
                callback('Request to ' + url + ' failed.  Returned status of ' + xhr.status);
            }
        }).bind(this);
        if(this.options.xhrPrepare){
            this.options.xhrPrepare(xhr) ;
        }
        xhr.send();
    } ;

    VeloxDatabaseClient.prototype.insert = function(table, record, callback){
        this._ajax(this.options.serverUrl+table+"/insert", "POST", record, callback) ;
    };

    VeloxDatabaseClient.prototype.update = function(table, record, callback){
        this._ajax(this.options.serverUrl+table+"/update", "PUT", record, callback) ;
    };

    VeloxDatabaseClient.prototype.remove = function(table, pkOrRecord, callback){
        this._ajax(this.options.serverUrl+table+"/remove", "DELETE", pkOrRecord, callback) ;
    };

    VeloxDatabaseClient.prototype.transactionalChanges = function(table, changeSet, callback){
        this._ajax(this.options.serverUrl+table+"/transactionalChanges", "POST", changeSet, callback) ;
    };

    VeloxDatabaseClient.prototype.getByPk = function(table, pkOrRecord, callback){
        this._ajax(this.options.serverUrl+table+"/getByPk", "GET", pkOrRecord, callback) ;
    };

    VeloxDatabaseClient.prototype.search = function(table, search, orderBy, callback){
        this._ajax(this.options.serverUrl+table+"/search", "GET", {
            search: search,
            orderBy : orderBy
        }, callback) ;
    };

    VeloxDatabaseClient.prototype.searchFirst = function(table, search, orderBy, callback){
        this._ajax(this.options.serverUrl+table+"/searchFirst", "GET", {
            search: search,
            orderBy : orderBy
        }, callback) ;
    };

    return VeloxDatabaseClient;
})));