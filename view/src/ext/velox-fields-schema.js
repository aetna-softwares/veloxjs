; (function (global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        var VeloxScriptLoader = require("velox-scriptloader") ;
        var VeloxWebView = require("velox-webview") ;
        module.exports = factory(VeloxScriptLoader, VeloxWebView) ;
    } else if (typeof define === 'function' && define.amd) {
        define(['VeloxScriptLoader', 'VeloxWebView'], factory);
    } else {
        global.VeloxWebView.registerExtension(factory(global.VeloxScriptLoader, global.VeloxWebView));
    }
}(this, (function (VeloxScriptLoader, VeloxWebView) { 'use strict';


    /**
     * i18next extension definition
     */
    var extension = {} ;
    extension.name = "fieldsSchema" ;

    var schema; 

    extension.init = function(cb){
        var view = this ;
        if(schema) {
            doInitView.bind(view)(cb) ;
        }  
    } ;

    /**
     * init view fields from schema
     * 
     * @private
     */
    function doInitView(callback){
        if(!VeloxWebView.fields){
            return callback("You need to load the fields extension to use fields schema extension") ;
        }
        var view = this ;
        var elements = this.container.querySelectorAll('[data-field-def]');
        var calls = [] ;
        elements.forEach(function(element){
            calls.push(function(cb){
                var schemaId = element.getAttribute("data-field-def").split(".") ;
                if(schemaId.length !== 2){
                    return cb("Invalid data-field-def value : "+element.getAttribute("data-field-def")+", expected format is table.column") ;
                }

                var tableDef = schema[schemaId[0]];
                if(!tableDef){
                    return cb("Unknow table : "+schemaId[0].trim()) ;
                }

                if(schemaId[1] === "grid"){
                    prepareGrid(element, schemaId[0], tableDef) ;
                    VeloxWebView.fields.createField(element, "grid", null, null, cb) ;
                } else {
                    var colDef = null;
                    tableDef.columns.some(function(c){
                        if(c.name === schemaId[1].trim()){
                            colDef = c;
                            return true ;
                        }
                    }) ;
                    if(!colDef){
                        return cb("Unknown column "+schemaId[1]+" in table "+schemaId[0]) ;
                    }

                    prepareElement(element,schemaId[0], colDef, cb) ;

                    var fieldType = colDef.type ;
                    var fieldSize = colDef.size ;
                    var fieldOptions = colDef.options || {} ;
                    
                    VeloxWebView.fields.createField(element, fieldType, fieldSize, fieldOptions, cb) ;
                }

                
            }) ;
        });
        series(calls, callback) ;
    }

    extension.extendsGlobal = {} ;

    extension.extendsGlobal.fieldsSchema = {} ;
    
    /**
     * Set the datamodel schema
     * 
     * @example
     * {
     *      "tableName": {
	 *		    columns: [
	 *				{name : "name", type: "varchar", size: 10},
	 *				{name : "status", type: "selection", values: ["todo", "done"]},
	 *				{name : "date_done", type: "date"},
	 *				{name : "level", type: "int"},
	 *				{name : "cost", type: "decimal:3"},
	 *			]
	 *		}
     * }
     * 
     * @param {object|string} schemaOrUrl schema object or URL to retrieve it 
     * @param {object} [schemaExtends] schema object that extends the base schema 
     * @param {function(Error)} callback - Called when configuration is done
     */
    extension.extendsGlobal.fieldsSchema.setSchema = function(schemaOrUrl, schemaExtends, callback){
        if(typeof(schemaExtends) === "function"){
            callback = schemaExtends ;
            schemaExtends = null;
        }
        if(!callback){ callback= function(){} ;} 
        if(typeof(schemaOrUrl) === "object"){
            schema = schemaOrUrl ;
            if(schemaExtends){ extendsSchema(schema, schemaExtends) ; }
        }else{
            VeloxScriptLoader.loadJSON(schemaOrUrl, function(err, schemaJSON){
                if(err){ return callback(err) ;}
                schema = schemaJSON ;
                if(schemaExtends){ extendsSchema(schema, schemaExtends) ; }
                callback() ;
            }) ;
        }
    } ;

    /**
     * Get schema
     */
    extension.extendsGlobal.fieldsSchema.getSchema = function(){
        return schema ;
    } ;

    function extendsSchema(schemaBase, schemaExtends){
        Object.keys(schemaExtends).forEach(function(table){
            if(!schemaBase[table]){
                schemaBase[table] = schemaExtends[table] ;
            }else{
                schemaExtends[table].columns.forEach(function(col){
                    var found = schemaBase[table].columns.some(function(colBase){
                        if(colBase.name === col.name){
                            Object.keys(col).forEach(function(k){
                                colBase[k] = col[k] ;
                            }) ;
                            return true ;
                        }
                    }) ;
                    if(!found){
                        schemaBase[table].columns.push(col) ;
                    }
                }) ;
            }
        }) ;
    }

    /**
     * Prepare the element markup for field creation
     * 
     * @param {HTMLElement} element the HTML element to prepare
     * @param {string} table the table name
     * @param {object} colDef the column configuration to apply
     */
    function prepareElement(element, table, colDef){
        if(colDef.type === "selection"){
            if(element.tagName !== "SELECT" && element.getElementsByTagName("select").length === 0){
                var select = document.createElement("SELECT") ;
                element.appendChild(select) ;
                if(colDef.values && Array.isArray(colDef.values)){
                    colDef.values.forEach(function(val){
                        var option = document.createElement("OPTION") ;
                        option.value = val;
                        option.innerHTML = val ;
                        if(VeloxWebView.i18n){
                            option.innerHTML = VeloxWebView.i18n.tr("fields."+table+"."+val) ;
                        }else{
                            option.innerHTML = val ;
                        }
                        select.appendChild(option) ;
                    }) ;
                }else if(colDef.values && typeof(colDef.values) === "object"){
                    Object.keys(colDef.values).forEach(function(val){
                        var option = document.createElement("OPTION") ;
                        option.value = val;
                        option.innerHTML = colDef.values[val] ;
                        if(VeloxWebView.i18n){
                            option.innerHTML = VeloxWebView.i18n.tr("fields.values."+table+"."+colDef.values[val]) ;
                        }else{
                            option.innerHTML = colDef.values[val] ;
                        }
                        select.appendChild(option) ;
                    }) ;
                }
            }
        }
    }

    function prepareGrid(element, tableName,tableDef){
        var listTables = element.getElementsByTagName("TABLE") ;
        var table = null;
        if(listTables.length === 0){
            var table = document.createElement("TABLE") ;
            element.append(table) ;
        }else{
            table = listTables[0] ;
        }
        var listTH = Array.prototype.slice.call(table.getElementsByTagName("TABLE")) ;
        if(listTH.length === 0){
            listTH = [] ;
            var thead = document.createElement("THEAD") ;
            table.appendChild(thead) ;
            var tr = document.createElement("TR") ;
            thead.appendChild(tr) ;
            tableDef.columns.forEach(function(colDef){
                var th = document.createElement("TH") ;
                tr.appendChild(th) ;
                th.setAttribute("data-field-name", colDef.name) ;
                if(VeloxWebView.i18n){
                    th.innerHTML = VeloxWebView.i18n.tr("fields."+tableName+"."+colDef.name) ;
                }else{
                    th.innerHTML = colDef.label || colDef.name ;
                }
                th.setAttribute("data-field-type", colDef.type) ;
                if(colDef.options){
                    Object.keys(colDef.options).forEach(function(k){
                        th.setAttribute("data-field-"+k, colDef.options[k]) ;
                    }) ;
                }
            }) ;
        }else{
            listTH.forEach(function(th){
                var thName = th.getAttribute("data-field-name") ;
                var colDef = null;
                tableDef.columns.some(function(c){
                    if(c.name === thName){
                        colDef = c ;
                        return true ;
                    }
                }) ;
                if(colDef){
                    if(!th.getAttribute("data-field-type")){
                        th.setAttribute("data-field-type", colDef.type) ;
                    }
                    if(!th.innerHTML){
                        if(VeloxWebView.i18n){
                            th.innerHTML = VeloxWebView.i18n.tr("fields."+tableName+"."+colDef.name) ;
                        }else{
                            th.innerHTML = colDef.label || colDef.name ;
                        }
                    }
                    if(colDef.options){
                        Object.keys(colDef.options).forEach(function(k){
                            if(!th.getAttribute("data-field-"+k)){
                                th.setAttribute("data-field-"+k, colDef.options[k]) ;
                            }
                        }) ;
                    }
                }
            }) ;
        }
    }

     /**
     * Execute many function in series
     * 
     * @param {function(Error)[]} calls array of function to run
     * @param {function(Error)} callback called when all calls are done
     */
    var series = function(calls, callback){
        if(calls.length === 0){ return callback(); }
        calls = calls.slice() ;
        var doOne = function(){
            var call = calls.shift() ;
            call(function(err){
                if(err){ return callback(err) ;}
                if(calls.length === 0){
                    callback() ;
                }else{
                    doOne() ;
                }
            }) ;
        } ;
        doOne() ;
    } ;

    return extension ;

})));