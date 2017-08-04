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
     * field extension definition
     */
    var extension = {} ;
    extension.name = "velox-fields" ;

    /**
     * contains loaded libs
     */
    var libs = {} ;

    /**
     * the current locale
     */
    var currentLocale = null ;

    /**
     * flag for CSS of switch widget
     */
    var switchCSSLoaded = false;

    /**
     * called on view init
     */
    extension.init = function(cb){
        var view = this ;
        doInitView.bind(view)(cb) ;
    } ;
    extension.extendsGlobal = {} ;

    /**
     * Global object to access to fields configuration
     */
    extension.extendsGlobal.fields = {
        /**
         * load configuration
         * 
         * The options object should contains a libs property with instance of libraries object 
         * if they are not available from window object and you don't want them to be loaded by CDN/bower
         * 
         * @param {object} options the configuration options
         */
        configure : function(options){
            if(options.libs) {
                Object.keys(options.libs).forEach(function(k){
                    libs[k] = options.libs[k] ;
                }) ;
            }
        },
        /**
         * Create the field
         * 
         * @param {HTMLElement} element the HTML element to transform to field
         * @param {string} fieldType the field type
         * @param {string} fieldSize the field size
         * @param {object} fieldOptions field options map (from element attributes)
         * @param {function(Error)} callback called when the field is created
         */
        createField: function(element, fieldType, fieldSize, fieldOptions, callback){
            createField(element, fieldType, fieldSize, fieldOptions, callback) ;
        }
    } ;

    ///// DEPENDENCIES LIBRARIES LOADING ////////
    var INPUTMASK_VERSION = "3.3.7"; //v4 will drop jquery dependency 
    var JQUERY_VERSION = "3.2.1" ;
    var NUMBRO_VERSION = "1.11.0" ;
    var DECIMALJS_VERSION = "2.2.0" ;
    var FLATPICKR_VERSION = "3.0.5-1" ;
    var MOMENTJS_VERSION = "2.18.1" ;
    var SELECT2_VERSION = "4.0.3" ;
    var W2UI_VERSION = "1.5.rc1" ;

    var JQUERY_LIB = {
        name: "jquery",
        type: "js",
        version: JQUERY_VERSION,
        cdn: "http://code.jquery.com/jquery-$VERSION.slim.min.js",
        bowerPath: "jquery/dist/jquery.slim.min.js"
    } ;
    var INPUT_MASK_LIB = [
        JQUERY_LIB,
        {
            name: "inputmask-bundle",
            type: "js",
            version: INPUTMASK_VERSION,
            cdn: "https://cdn.jsdelivr.net/gh/RobinHerbots/Inputmask@$VERSION/dist/jquery.inputmask.bundle.js",
            bowerPath: "inputmask/dist/jquery.inputmask.bundle.js"
        }
    ];

    var NUMBRO_LIB = [
        {
            name: "numbro",
            type: "js",
            version: NUMBRO_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/numbro/$VERSION/numbro.min.js",
            bowerPath: "numbro/dist/numbro.min.js"
        },
        {
            name: "numbro-language",
            type: "js",
            version: NUMBRO_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/numbro/$VERSION/languages.min.js",
            bowerPath: "numbro/dist/languages.min.js"
        }
    ];

    var DECIMALJS_LIB = [
        {
            name: "decimaljs-light",
            type: "js",
            version: DECIMALJS_VERSION,
            cdn: "https://cdn.jsdelivr.net/gh/MikeMcl/decimal.js-light@$VERSION/decimal.min.js",
            bowerPath: "decimal.js-light/decimal.min.js"
        }
    ];

    var FLATPICKR_LIB = [
        {
            name: "flatpickr-calendar-css",
            type: "css",
            version: FLATPICKR_VERSION,
            cdn: "https://unpkg.com/flatpickr@$VERSION/dist/flatpickr.min.css",
            bowerPath: "flatpickr/dist/flatpickr.min.css"
        },
        {
            name: "flatpickr-calendar-js",
            type: "js",
            version: FLATPICKR_VERSION,
            cdn: "https://unpkg.com/flatpickr@$VERSION",
            bowerPath: "flatpickr/dist/flatpickr.min.js"
        }
    ];

    var SELECT2_LIB = [
        JQUERY_LIB,
        {
            name: "select2-css",
            type: "css",
            version: SELECT2_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/select2/$VERSION/css/select2.min.css",
            bowerPath: "select2/dist/css/select2.min.css"
        },
        {
            name: "select2-js",
            type: "js",
            version: SELECT2_VERSION,
            cdn: "https://cdnjs.cloudflare.com/ajax/libs/select2/$VERSION/js/select2.min.js",
            bowerPath: "select2/dist/js/select2.min.js"
        }
    ];

    var W2UI_LIB = [
        JQUERY_LIB,
        {
            name: "w2ui-css",
            type: "css",
            version: W2UI_VERSION,
            
            cdn: "http://rawgit.com/vitmalina/w2ui/master/dist/w2ui.min.css",
            bowerPath: "w2ui/dist/w2ui.min.css"
        },
        {
            name: "w2ui-js",
            type: "js",
            version: W2UI_VERSION,
            cdn: "http://rawgit.com/vitmalina/w2ui/master/dist/w2ui.min.js",
            bowerPath: "w2ui/dist/w2ui.min.js"
        }
    ];

    /**
     * Translate the locale code in flatpicker naming conviention
     * 
     * Fallback to default US locale if lang not found
     * 
     * @param {string} lang the lang code from current locale
     */
    function flatpickerLocaleCode(lang){
        var availableLocales = ["ar", "bg", "bn", "cat", "cs", "cy", "da", "de", "eo", "es", "et", "fa", "fi", "fr", "gr", "he", "hi", "hr", "hu", "id", "it", "ja", "ko", "lt", "lv", "mk", "ms", "my", "nl", "no", "pa", "pl", "pt", "ro", "ru", "si", "sk", "sl", "sq", "sr", "sv", "th", "tr", "uk", "vn", "zh"];

        if(availableLocales.indexOf(lang) !== -1){
            return lang ;
        }

        return "" ;
    }

    /**
     * Translate the locale code in moment naming conviention
     * 
     * Fallback to default US locale if lang not found
     * 
     * @param {string} lang the lang code from current locale
     */
    function momentLocaleCode(lang){
        var availableLocales = ["af", "ar-dz", "ar", "ar-kw", "ar-ly", "ar-ma", "ar-sa", "ar-tn", "az", "be", "bg", "bn", "bo", "br", "bs", "ca", "cs", "cv", "cy", "da", "de-at", "de-ch", "de", "dv", "el", "en-au", "en-ca", "en-gb", "en-ie", "en-nz", "eo", "es-do", "es", "et", "eu", "fa", "fi", "fo", "fr-ca", "fr-ch", "fr", "fy", "gd", "gl", "gom-latn", "he", "hi", "hr", "hu", "hy-am", "id", "is", "it", "ja", "jv", "ka", "kk", "km", "kn", "ko", "ky", "lb", "lo", "lt", "lv", "me", "mi", "mk", "ml", "mr", "ms", "ms-my", "my", "nb", "ne", "nl-be", "nl", "nn", "pa-in", "pl", "pt-br", "pt", "ro", "ru", "sd", "se", "si", "sk", "sl", "sq", "sr-cyrl", "sr", "ss", "sv", "sw", "ta", "te", "tet", "th", "tlh", "tl-ph", "tr", "tzl", "tzm", "tzm-latn", "uk", "ur", "uz", "uz-latn", "vi", "x-pseudo", "yo", "zh-cn", "zh-hk", "zh-tw"];
        lang = lang.replace("_", "-").toLowerCase() ;

        if(availableLocales.indexOf(lang) !== -1){
            return lang ;
        }

        return "en-us" ;
    }

    /**
     * Translate the locale code in w2ui naming conviention
     * 
     * Fallback to default US locale if lang not found
     * 
     * @param {string} lang the lang code from current locale
     */
    function w2uiLocaleCode(lang){
        var availableLocales = ["az-az", "ba-ba", "bg-bg", "ca-es", "de-de", "en-gb", "en-us", "es-es", "es-mx", "fr-fr", "gl-es", "hr-hr", "hu-hu", "id-id", "it-it", "ja-jp", "ko-kr", "lt-lt", "nl-nl", "no-no", "pl-pl", "pt-br", "ru-ru", "sk-sk", "sl-si", "tr-tr", "zh-cn"];
        lang = lang.replace("_", "-").toLowerCase() ;

        if(availableLocales.indexOf(lang) !== -1){
            return lang ;
        }

        lang = lang+"-"+lang ;
        if(availableLocales.indexOf(lang) !== -1){
            return lang ;
        }

        return "en-us" ;
    }

    /**
     * Load the local for W2UI and configure W2UI with it
     * 
     * @param {function(Error)} callback called on finished
     */
    function loadW2uiLibLocale(callback){
        var lib =  {
            name: "w2ui-locale-"+w2uiLocaleCode(currentLocale.lang),
            type: "json",
            version: W2UI_VERSION,
            cdn: "https://cdn.rawgit.com/vitmalina/w2ui/master/src/locale/"+w2uiLocaleCode(currentLocale.lang)+".json",
            bowerPath: "w2ui/src/locale/"+w2uiLocaleCode(currentLocale.lang)+".json"
        };

        loadLib("w2ui-locale-"+currentLocale.lang, W2UI_VERSION, lib, function(err, results){
            if(err){ return callback(err) ;}
            var langJson = results[0][0] ;
            window.w2utils.locale(langJson);
            callback() ;
        }) ;
    }

    /**
     * Load the locales for date fields
     * It get locales for flatpikr calendar and get moment locale to have default date format for current lang
     * 
     * Note : we are using moment locales but we don't load moment if it is not already loaded. We don't rely on moment libs
     * 
     * @param {function(Error)} callback called on finish
     */
    function loadDateLibLocale(callback){
        var libPicker =  {
                name: "flatpickr-calendar-locale-"+flatpickerLocaleCode(currentLocale.lang),
                type: "js",
                version: FLATPICKR_VERSION,
                cdn: "https://npmcdn.com/flatpickr@$VERSION/dist/l10n/"+flatpickerLocaleCode(currentLocale.lang)+".js",
                bowerPath: "flatpickr/dist/l10n/"+flatpickerLocaleCode(currentLocale.lang)+".js"
        };
        var libMoment =  {
                name: "moment-locale-"+momentLocaleCode(currentLocale.lang),
                type: "js",
                version: MOMENTJS_VERSION,
                cdn: "https://cdnjs.cloudflare.com/ajax/libs/moment.js/$VERSION/locale/"+momentLocaleCode(currentLocale.lang)+".js",
                bowerPath: "moment/locale/"+momentLocaleCode(currentLocale.lang)+".js"
        };

        var calls = [] ;

        if(flatpickerLocaleCode(currentLocale.lang)){
            calls.push(function(cb){
                loadLib("flatpicker-locale-"+currentLocale.lang, FLATPICKR_VERSION, libPicker, cb) ;
            }) ;
        }
        
        if(!libs.moment && !window.moment){
            //no moment lib available, add polyfill
            window.moment = {
                locales : {
                    "en-us": {
                        _longDateFormat : {
                            LTS  : 'h:mm:ss A',
                            LT   : 'h:mm A',
                            L    : 'MM/DD/YYYY',
                            LL   : 'MMMM D, YYYY',
                            LLL  : 'MMMM D, YYYY h:mm A',
                            LLLL : 'dddd, MMMM D, YYYY h:mm A'
                        }
                    }
                },
                defineLocale : function(code, localeDef){
                    localeDef._longDateFormat = localeDef.longDateFormat ;
                    this.locales[code] = localeDef ;
                },
                localeData: function(code){
                    return this.locales[code] ;
                }
            };
            libs.moment = window.moment ;
        }
        if(!libs.moment.localeData(momentLocaleCode(currentLocale.lang))){
            if(!window.moment){
                window.moment = libs.moment;
            }
            calls.push(function(cb){
                loadLib("moment-locale-"+momentLocaleCode(currentLocale.lang), MOMENTJS_VERSION, libMoment, cb) ;
            }) ;
        }
        
        series(calls, callback) ;
    }
    

    /**
     * init view fields
     * 
     * get all HTML elements having data-field attribute
     * 
     * @private
     */
    function doInitView(callback){
        var elements = this.container.querySelectorAll('[data-field]');
        var calls = [] ;
        elements.forEach(function(element){
            calls.push(function(cb){
                var fieldType = element.getAttribute("data-field") ;
                var fieldSize = element.getAttribute("data-field-size") ;
                var fieldOptions = {} ;
                Array.prototype.slice.call(element.attributes).forEach(function(att){
                    var startIndex = "data-field-".length ;
                    var attKey = att.name ;
                    if(attKey.indexOf("data-field") === 0 && attKey.length > startIndex){
                        fieldOptions[attKey.substring(startIndex)] = element.getAttribute(attKey) ;
                    }
                }) ;
                createField(element, fieldType, fieldSize, fieldOptions, cb) ;
            }) ;
        });
        series(calls, callback) ;
    }

    /**
     * Create the field
     * 
     * @param {HTMLElement} element the HTML element to transform to field
     * @param {string} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options map (from element attributes)
     * @param {function(Error)} callback called when the field is created
     */
    function createField(element, fieldType, fieldSize, fieldOptions, callback){
        if(fieldType === "varchar" || fieldType==="text" || fieldType === "string" || fieldType === "password"){
            createTextField(element, fieldType, fieldSize, fieldOptions, callback) ;
        } else if(fieldType === "int" || fieldType === "integer" || fieldType==="number" || fieldType==="decimal" || 
            fieldType==="double" || fieldType==="float" || fieldType==="currency" || fieldType==="percent"){
            createNumberField(element, fieldType, fieldSize, fieldOptions, callback) ;
        } else if(fieldType === "date" || fieldType==="datetime" || fieldType === "time"){
            createDateField(element, fieldType, fieldSize, fieldOptions, callback) ;
        } else if(fieldType === "selection" || fieldType === "select"){
            createSelectField(element, fieldType, fieldSize, fieldOptions, callback) ;
        } else if(fieldType === "boolean" || fieldType === "checkbox"  || fieldType === "toggle" || fieldType === "switch"){
            createCheckboxField(element, fieldType, fieldSize, fieldOptions, callback) ;
        } else if(fieldType === "grid"){
            createGridField(element, fieldType, fieldSize, fieldOptions, callback) ;
        } else {
            callback("Unknow field type "+fieldType) ; 
        }
    }

    /**
     * Load a lib from CDN/Bower if not already loaded or given in configure.libs
     * 
     * @param {string} name lib name
     * @param {string} version the lib version
     * @param {object} libDef the lib def for VeloxScriptLoader
     * @param {function(Err)} callback called on loaded
     */
    function loadLib(name, version, libDef, callback){
        if(!libs[name]){
            if(window[name]){
                libs[name] = window[name] ;
                return callback() ;
            }

            console.debug("No "+name+" object given, we will load from CDN/bower"+
            ". If you don't want this, add the lib "+name+ " (version "+version+")"+
                " in your global import scripts or give "+name+" object to VeloxWebView.field.configure({libs : { "+name+": __here__ }})");

            if (!VeloxScriptLoader) {
                return callback("To have automatic script loading, you need to import VeloxScriptLoader");
            }

            VeloxScriptLoader.load(libDef, function(err, result){
                if(err){ return callback(err); }
                libs[name] = window[name] ;
                callback(null, result) ;
            }) ;
        }else{
            callback() ;
        }
    }

    /**
     * Load the input mask lib if needed and add mask aliases
     * 
     * @param {function(Error)} callback called on loaded
     */
    function loadInputMask(callback){
        loadLib("Inputmask", INPUTMASK_VERSION, INPUT_MASK_LIB, function(err){
            if(err){ return callback(err);}

            libs.Inputmask.extendAliases({
                'uppercase': {
                    mask: "*{*}",
                    casing: "upper"
                },
                'lowercase': {
                    mask: "*{*}",
                    casing: "lower"
                }
            });
            callback() ;
        }) ;
    }

    /**
     * Create a text field
     * 
     * If mask option is provided, an input mask is added to the field
     * 
     * The maxlength is set accordingly to the fieldSize option if given
     * 
     * @param {HTMLElement} element HTML element to transform
     * @param {"password"|"varchar"|"text"|"string"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field option (from attributes)
     * @param {function(Error)} callback called when finished
     */
    function createTextField(element, fieldType, fieldSize, fieldOptions, callback){
        var input = appendInputHtml(element) ;
        if(fieldType === "password"){
            input.type = "password" ;
        }
        
        if(fieldSize){
            var fieldSize = parseInt(fieldSize, 10) ;
            if(isNaN(fieldSize)){
                return callback("Incorrect field size option : "+fieldSize+" on "+elToString(element)) ;
            }
            input.maxLength = fieldSize ;
        }

        var maskField = null;

        element.veloxGetValue = function(){
            if(maskField){
                return maskField._valueGet() ;
            }
            return input.value ;
        } ;
        element.veloxSetValue = function(value){
            if(maskField){
                maskField._valueSet(value) ;
                return;
            }
            input.value = value?""+value:"";
        } ;

        if( fieldOptions.mask){
            loadInputMask(function(err){
                if(err){ return callback(err) ;}
                var im = new libs.Inputmask(fieldOptions.mask);
                maskField = im.mask(input) ;
                callback() ;
            }.bind(this)) ;
        }else{
            callback() ;
        }
    }

    /**
     * Add extra data to localdata such as thousands and decimal delimiters
     * 
     * Try to rely on toLocaleString browser if supported, if not supported, the numbro lib is loaded
     * 
     * @param {function(Error)} callback called on finished
     */
    function fillLocales(callback){
        if((1000.99).toLocaleString('fr') === "1 000,99"){
            //the browser support locale string
            var localizedNumber = (1000.99).toLocaleString(currentLocale.lang) ;
            currentLocale.delimiters.thousands = localizedNumber[1] ;
            currentLocale.delimiters.decimal = localizedNumber[5] ;
            callback() ;
        }else{
            //the browser does not support locale string, load numbro lib
            loadLib("numbro", NUMBRO_VERSION, NUMBRO_LIB, function(err){
                if(err){ return callback(err); }
                var langData = libs.numbro.languageData(currentLocale.lang); 
                currentLocale.delimiters.thousands = langData.delimiters.thousands ;
                currentLocale.delimiters.decimal = langData.delimiters.decimal ;
                callback() ;
            }) ;
        }
    }

    /**
     * Get the current locale of user
     * 
     * If the i18n extension is loaded, the locale is get from i18n extension
     * If not, it is get from browser lang
     * 
     * If the i18n is loaded, the locale is automatically reloaded when locale change
     * (note : it will be applied on new loaded view only, the existing view are not reload)
     * 
     * @param {function(Error)} callback called on finished
     */
    function getLocale(callback){
        if(!currentLocale){
            currentLocale = {
                lang: navigator.language || navigator.userLanguage,
                delimiters : {}
            } ;
            if(VeloxWebView.i18n){
                currentLocale.lang = VeloxWebView.i18n.getLang() ;
                VeloxWebView.i18n.onLanguageChanged(function(newLang){
                    currentLocale.lang = newLang ;
                    fillLocales(function(err){
                        if(err){
                            return console.error("Error while reloading locales", err) ;
                        }
                        console.debug("Locales reloaded") ;
                    });
                });
                fillLocales(callback) ;
            }
        }else{
            callback() ;
        }
    }

    /**
     * Create a input masked number field.
     * 
     * The value is given in Decimal.js object to be able to handle big numbers and avoid rounding issues
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"int"|"integer"|"number"|"decimal"|"double"|"float"|"precent"|"currency"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options (from attributes)
     * @param {function(Error)} callback called when field is created
     */
    function createNumberField(element, fieldType, fieldSize, fieldOptions, callback){
        var input = appendInputHtml(element) ;
        var maskField = null;
        var maskOptions = null;
        loadLib("decimaljs", DECIMALJS_VERSION, DECIMALJS_LIB, function(err){
            if(err){ return callback(err) ;}
            loadInputMask(function(err){
                if(err){ return callback(err) ;}

                if(fieldType === "int" || fieldType === "integer" || fieldType==="number") {
                    getLocale(function(err){
                        if(err){ return callback(err); }

                        maskOptions = { 
                            radixPoint: currentLocale.delimiters.decimal , 
                            groupSeparator : currentLocale.delimiters.thousands , 
                            prefix : "", suffix : "", positionCaretOnTab: false
                        } ;

                        var im = new libs.Inputmask("integer", maskOptions);
                        maskField = im.mask(input) ;
                        callback() ;
                    });
                }else if(fieldType==="decimal" || fieldType==="double" || fieldType==="float" || fieldType==="percent" || fieldType==="currency"){
                    getLocale(function(err){
                        if(err){ return callback(err); }

                        maskOptions = { 
                            radixPoint: currentLocale.delimiters.decimal , 
                            groupSeparator : currentLocale.delimiters.thousands , 
                            prefix : "", suffix : "", positionCaretOnTab: false
                        } ;

                        if(fieldOptions.decimaldigits){
                            var digits = parseInt(fieldOptions.decimaldigits, 10) ;
                            if(isNaN(digits)){
                                return callback("Invalid value for option decimaldigits, number expected") ;
                            }
                            maskOptions.digits = digits ;
                        }
                        
                        if(fieldType === "percent"){
                            maskOptions.suffix = " %";
                        }

                        var im = new libs.Inputmask("currency", maskOptions);
                        maskField = im.mask(input) ;
                        callback() ;
                    }) ;
                }
                
            }.bind(this)) ;
        }.bind(this)) ;

        element.veloxGetValue = function(){
            if(maskField){
                var value = maskField._valueGet() ;
                if(maskOptions){
                    value = replaceAll(value, maskOptions.radixPoint, ".");
                    value = replaceAll(value, maskOptions.groupSeparator, "");
                    value = replaceAll(value, maskOptions.prefix, "");
                    value = replaceAll(value, maskOptions.suffix, "");
                }
                value = value === "" ? new libs.Decimal(0) : new libs.Decimal(value);
                if(fieldType === "percent"){
                    value = value.div(100) ;
                }
                return value ;
            }
            return input.value ;
        } ;
        element.veloxSetValue = function(value){
            if(maskField){
                value = new libs.Decimal(value) ;
                if(fieldType === "percent"){
                    value = value.mul(100) ;
                }
                maskField._valueSet(value.toNumber()) ;
                return;
            }
            input.value = value?""+value:"";
        } ;
    }

    /**
     * Create the date field.
     * 
     * Date field present popup calendar and masked input
     * 
     * The input format is automatically taken from locale
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"date"|"datetime"|"time"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions field options (from attributes)
     * @param {function(Error)} callback called on field created
     */
    function createDateField(element, fieldType, fieldSize, fieldOptions, callback){
        var input = appendInputHtml(element) ;
        var maskField = null;
        var pickrField = null;
        loadLib("flatpickr", FLATPICKR_VERSION, FLATPICKR_LIB, function(err){
            if(err){ return callback(err) ;}
            loadInputMask(function(err){
                if(err){ return callback(err) ;}
                getLocale(function(err){
                    if(err){ return callback(err); }
                    loadDateLibLocale(function(err){
                        if(err){ return callback(err); }

                        var localeData = libs.moment.localeData(momentLocaleCode(currentLocale.lang)) ;
                        var localeDateFormat = localeData._longDateFormat.L ;
                        if(fieldType === "datetime"){
                            localeDateFormat = localeData._longDateFormat.L + " "+localeData._longDateFormat.LT ;
                        }else if(fieldType === "time"){
                            localeDateFormat = localeData._longDateFormat.LT ;
                        }

                        var useAMPM = localeData._longDateFormat.LT.indexOf("A") !== -1 ;


                        var flatpickrOptions = {
                            allowInput: true,
                            //https://chmln.github.io/flatpickr/formatting/
                            dateFormat : localeDateFormat
                                .replace("YYYY", "Y").replace("YY", "y").replace("DD", "d").replace("MM", "m")
                                .replace("HH", "H").replace("mm", "i").replace("A", "K"),
                            enableTime : fieldType.indexOf("time") !== -1,
                            noCalendar: fieldType === "time",
                            time_24hr: !useAMPM
                        } ;

                        
                        

                        if(flatpickerLocaleCode(currentLocale.lang)){
                            flatpickrOptions.locale = flatpickerLocaleCode(currentLocale.lang) ;
                        }

                        pickrField = libs.flatpickr(input, flatpickrOptions);
                        
                        var maskFormat = localeDateFormat.toLowerCase() ;
                        if(fieldType === "datetime"){
                            maskFormat = "datetime" ;
                            if(useAMPM){
                                maskFormat = "datetime12" ;
                                if(localeDateFormat.indexOf("MM") === 0){
                                    //start by month (US)
                                    maskFormat = "mm/dd/yyyy hh:mm xm" ;
                                }
                            }
                        }else if(fieldType === "time"){
                            maskFormat = "hh:mm" ;
                            if(useAMPM){
                                maskFormat = "hh:mm t" ;
                            }
                        }
                        var im = new libs.Inputmask(maskFormat, {placeholder: "_"});
                        maskField = im.mask(input) ;

                        input.addEventListener("blur", function(){
                            pickrField.setDate(maskField._valueGet(), false) ;
                        }) ;
                        callback() ;
                    }.bind(this)) ;
                }.bind(this)) ;
            }.bind(this)) ;
        }.bind(this)) ;

        element.veloxGetValue = function(){
            var value = null;
            if(pickrField && pickrField.selectedDates.length > 0){
                value = pickrField.selectedDates[0] ;
            }
            return value ;
        } ;
        element.veloxSetValue = function(value){
            pickrField.setDate(value, false) ;
        } ;
    }

    /**
     * load the Switch CSS
     */
    function loadSwitchCSS(){
        if(switchCSSLoaded){ return ;}

        var css = "/* The switch - the box around the slider */";
        css += ".switch { position: relative; display: inline-block; width: 60px; height: 34px; }";
        css += "/* Hide default HTML checkbox */";
        css += ".switch input {display:none;}";
        css += "/* The slider */";
        css += ".slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: .4s; transition: .4s; }";
        css += '.slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; -webkit-transition: .4s; transition: .4s; }';
        css += "input:checked + .slider { background-color: #2196F3; }";
        css += "input:focus + .slider { box-shadow: 0 0 1px #2196F3; }";
        css += "input:checked + .slider:before { -webkit-transform: translateX(26px); -ms-transform: translateX(26px); transform: translateX(26px); }";
        css += "/* Rounded sliders */";
        css += ".slider.round { border-radius: 34px; }";
        css += ".slider.round:before { border-radius: 50%; }";

        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {                // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
        switchCSSLoaded = true ;
    }

    /**
     * Create a select field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"select"|"selection"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions option from attribute
     * @param {*} callback 
     */
    function createSelectField(element, fieldType, fieldSize, fieldOptions, callback){
        loadLib("select2", SELECT2_VERSION, SELECT2_LIB, function(err){
            if(err){ return callback(err); }

            var select = null ;
            if(element.tagName ===  "SELECT"){
                select = element ;
            }else{
                var subSelects = element.getElementsByTagName("SELECT") ;
                if(subSelects.length === 0){
                    return callback("Your data field select should be a SELECT tag or contain a SELECT tag") ;
                }
                select = subSelects[0];
            }
            window.jQuery(select).select2();

            element.veloxGetValue = function(){
                return window.jQuery(select).val() ;
            } ;
            element.veloxSetValue = function(value){
                window.jQuery(select).val(value) ;
            } ;
            callback() ;
        }) ;
    }

    /**
     * Create an unique ID
     */
    function uuidv4() {
        if(crypto && crypto.getRandomValues){
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            ) ;
        }else{
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    /**
     * Create the grid field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"grid"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {object} fieldOptions the field options (from attributes)
     * @param {function(Error)} callback called when field is created
     */
    function createGridField(element, fieldType, fieldSize, fieldOptions, callback){
        var subSelects = element.getElementsByTagName("TABLE") ;
        if(subSelects.length === 0){
            return callback("Your data field grid should contain a TABLE tag") ;
        }
        var table = subSelects[0];
        var listThead = table.getElementsByTagName("THEAD") ;
        var thead = listThead.length>0?listThead[0]:null ;
        var listTh = Array.prototype.slice.call(table.getElementsByTagName("TH")) ;
        if(listTh.length === 0){
            return callback("Your data field grid should have at least a TH tag") ;
        }

        var listTr = Array.prototype.slice.call(table.getElementsByTagName("TR")) ;
        

        loadLib("w2ui", W2UI_VERSION, W2UI_LIB, function(err){
            if(err){ return callback(err); }

            getLocale(function(err){
                if(err){ return callback(err); }
                
                loadW2uiLibLocale(function(err){
                    if(err){ return callback(err); }

                    var idPath = Array.prototype.slice.call(
                    window.jQuery(element).parents()).map(function(p){ 
                        return p.getAttribute("data-original-id"); 
                    }).filter(function(c){ return !!c;}).reverse().join(".") ;

                    var gridOptions = {
                        name: idPath||uuidv4(),
                        columns   : [],
                        show      : {},
                        searches : []
                    } ;

                    if(thead){
                        ["header", "toolbar", "footer", "lineNumbers", "selectColumn", "expandColumn"].forEach(function(showAttr){
                            var showValue = thead.getAttribute(showAttr);
                            if(showValue){
                                gridOptions.show[showAttr] = showValue.trim().toLowerCase() === "true" ;
                            }
                        }) ;
                    }

                    if(Object.keys(gridOptions.show).length === 0){
                        delete gridOptions.show;
                    }

                    var totalColsWithSizePx  = 0;
                    var totalColsWithSizePercent  = 0;
                    
                    listTh.forEach(function(th){
                        var colDef = {
                            caption   : th.innerHTML,
                            field     : th.getAttribute("data-field-name"),
                            size      : th.getAttribute("data-field-size")
                        };
                        if(colDef.size){
                            if(colDef.size.indexOf("px") === -1 && colDef.size.indexOf("%") === -1){
                                //no unit given, assuming px
                                colDef.size = colDef.size+"px" ;
                            }

                            if(colDef.size.indexOf("px") !== -1){
                                totalColsWithSizePx += parseInt(colDef.size.replace("px", ""), 10) ;
                            }else if(colDef.size.indexOf("%") !== -1){
                                totalColsWithSizePercent += parseInt(colDef.size.replace("%", ""), 10) ;
                            }
                        }
                        

                        ["sortable", "searchable", "hidden"].forEach(function(colAtt){
                                var colValue = th.getAttribute(colAtt);
                                if(colValue){
                                    colDef[colAtt] = colValue.trim().toLowerCase() === "true" ;
                                }
                        });
                        var type = th.getAttribute("data-field-type") ;
                        if(type){
                            colDef.render = type ;
                        }
                        gridOptions.columns.push(colDef) ;
                    }) ;
                    var totalColsNoSize = gridOptions.columns.filter(function(c){ return !c.size;}).length ;
                    if(totalColsNoSize > 0){
                        //there is some column with no size, we must compute ideal size

                        var totalWidth = element.offsetWidth-3 ;
                        var totalPercent = 100 ;
                        var defaultColSize = "10%" ;
                        if(totalColsWithSizePx === 0){
                            //no size is defined in px, use %
                            var colPercent = (totalPercent - totalColsWithSizePercent)/totalColsNoSize ;
                            if(colPercent>0){
                                defaultColSize = colPercent+"%" ;
                            }
                        }else{
                            //there is pixel column, compute in pixels
                            var percentPixels = (totalColsWithSizePercent/100) * totalWidth ;
                            var remainingWidth = totalWidth - percentPixels - totalColsWithSizePx ;
                            var colPixel = (remainingWidth / totalColsNoSize) ;
                            if(colPixel > 10){
                                defaultColSize = colPixel + "px" ;
                            }
                        }

                        gridOptions.columns.forEach(function(c){ 
                            if(!c.size){
                                c.size = defaultColSize ;
                            }
                        }) ;
                    }

                    var records = [] ;
                    var recid = 1 ;
                    listTr.forEach(function(tr){
                        var listTd = Array.prototype.slice.call(tr.getElementsByTagName("TD")) ;
                        if(listTd.length > 0){
                            var record = {recid: recid++} ;
                            listTd.forEach(function(td, i){
                                var value = td.innerHTML ;
                                if(gridOptions.columns[i].render && gridOptions.columns[i].render.indexOf("date") !== -1){
                                    value = new Date(value) ;
                                }
                                record[gridOptions.columns[i].field] = value ;
                            }) ;
                            records.push(record) ;
                        }
                    }) ;
                    if(records.length>0){
                        gridOptions.records = records ;
                    }

                    if(libs.w2ui[gridOptions.name]){
                        //destroy existing grid before recreate
                        libs.w2ui[gridOptions.name].destroy();
                    }
                    element.innerHTML = "" ;
                    var grid = window.jQuery(element).w2grid(gridOptions) ;
                
                    element.veloxGetValue = function(){
                        var records = grid.records.slice() ;
                        records.forEach(function(r){
                            delete r.recid ;
                        }) ;
                        return records;
                    } ;
                    element.veloxSetValue = function(value){
                        grid.clear() ;
                        value.forEach(function(d,i){
                            if(!d.recid){
                                d.recid = i ;
                            }
                        });
                        grid.add(value) ;
                    } ;
                    callback() ;
                }) ;
            }) ;
        }) ;
    }

    /**
     * Create a checkbox or a toggle field
     * 
     * @param {HTMLElement} element the HTML element to transform
     * @param {"boolean"|"checkbox"|"switch"|"toggle"} fieldType the field type
     * @param {string} fieldSize the field size
     * @param {options} fieldOptions the field options (from attributes)
     * @param {function(Error)} callback called when the field is created
     */
    function createCheckboxField(element, fieldType, fieldSize, fieldOptions, callback){
        var input = null;
        if(fieldType === "boolean" || fieldType === "checkbox"){
            input = appendInputHtml(element) ;
            input.type = "checkbox" ;
            
        }else{
            //https://www.w3schools.com/howto/howto_css_switch.asp
            input = document.createElement("input") ;
            input.type = "checkbox" ;
            var label = document.createElement("label") ;
            var slider = document.createElement("span") ;
            slider.className = "slider round" ;
            label.className = "switch" ;
            label.appendChild(input) ;
            label.appendChild(slider) ;
            element.innerHTML = "" ;
            element.appendChild(label) ;
            loadSwitchCSS() ;
        }
        element.veloxGetValue = function(){
            return input.checked ;
        } ;
        element.veloxSetValue = function(value){
            if(value === true || value === "true" || value === "1" || value === "on"){
                value = true ;
            }else{
                value = false ;
            }
            return input.checked = value;
        } ;
        callback() ;
    }

    /**
     * Change a string in regexp
     * @param {string} str the string to transform in regexp
     */
    var escapeRegExp = function (str) {
		return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	} ;

    /**
     * Replace all occurence in a string
     * 
     * @param {string} str string in which to replace
     * @param {string} find the string to find
     * @param {string} replace the string to replace
     */
	var replaceAll = function (str, find, replace) {
		return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	} ;

    /**
     * Describe an HTML as string
     * 
     * @param {HTMLElement} element the HTML element to describe
     */
    function elToString(element){
        var str = element.tagName ;
        for(var i=0; i<element.attributes.length; i++){
            str += " "+element.attributes[i]+" = \""+element.getAttribute(element.attributes[i])+"\"" ;
        }
        return "["+str+"]" ;
    }

    /**
     * Add input field in HTML element
     * 
     * @param {HTMLElement} element the HTML element in which add input field
     */
    function appendInputHtml(element){
        var input = document.createElement("INPUT") ;
        input.type = "text" ;
        element.innerHTML = "" ;
        element.appendChild(input) ;
        return input ;
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