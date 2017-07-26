; (function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.VeloxWebView.registerExtension(factory())
}(this, (function () { 'use strict';

    var I18NEXT_VERSION = "8.4.3" ;
    var I18NEXT_XHR_VERSION = "1.4.2";
    var I18NEXT_BROWSER_DETECT_VERSION = "2.0.0";

    /**
     * object that contains i18next instance, by default try to get the global variable
     */
    var i18next = window.i18next ;

    /**
     * check if we did the initialization of i18next
     */
    var i18nextInitDone = false ;

    /**
     * i18next extension definition
     */
    var extension = {} ;
    extension.name = "i18next" ;

    extension.init = function(cb){
        var view = this ;
        if(!i18nextInitDone) {
            //i18next is not inistialized
            console.debug("i18next is not initialized, initialization with default parameters")
            configureI18Next({}, function(err){
                if(err){ return cb(err); }
                doInitView.bind(view)() ;
                cb() ;
            }) ;
        } else {
            doInitView.bind(view)() ;
            cb() ;
        }  
    } ;
    extension.extendsProto = {} ;

    /**
     * Translated the given translation key
     * 
     * see https://www.i18next.com/api.html#t
     * 
     * @param {string} trKey - The translation key
     * @param {*} [params] - translation parameters
     * @return {string} - The translated string in current language
     */      
    extension.extendsProto.tr = function(trKey, params){
        return translate.apply(this, arguments)
    } ;
            
    extension.extendsGlobal = {} ;

    extension.extendsGlobal.i18n = {} ;
    /**
     * Configure the i18next system.
     * options should contains any option of https://www.i18next.com/configuration-options.html
     * in more it can contains an i18n object to use. If not given, the global i18next object will be used
     * if it does not exists, i18next will be retrieved from CDN
     * 
     * default options are : 
     * {
     *       fallbackLng: 'en',
     *       backend: {
     *           loadPath: 'locales/{{lng}}.json',
     *       }
     *   }
     * 
     * @param {object} options - Init option of i18next
     * @param {function(err)} callback - Called when configuration is done
     */
    extension.extendsGlobal.i18n.configure = function(options, callback){
        return configureI18Next(options, callback) ;
    } ;

    /**
     * change the current lang 
     * 
     * @param {string} lang - the lang code
     */
    extension.extendsGlobal.i18n.setLang = function(lang, callback){
        return setLang(lang, callback) ;
    } ;
            
    extension.extendsGlobal.tr = extension.extendsProto.tr ;

    /**
     * init view translation
     * 
     * @private
     */
    function doInitView(){
        var view = this ;
        i18next.on("languageChanged", function(){
            //when language change, reload the view translation
            doTranslateView.bind(view)() ;
        }) ;
        doTranslateView.bind(view)() ;
    }

    /**
     * translate in the view
     * 
     * @private
     */
    function doTranslateView(){
        var elements = this.container.querySelectorAll('[data-i18n]');
        for(var i=0; i<elements.length; i++){
            var str = elements[i].getAttribute("data-i18n") ;
            elements[i].innerHTML = translate(str) ;
        }
    }

    /**
     * load script from CDN
     * 
     * @private
     */
    function loadScript (path, callback) {
		var script = document.createElement("script");
	    script.async = true;
	    script.type = "text/javascript";
	    script.src = path;
	    script.onload = function(_, isAbort) {
	        if (!script.readyState || "complete" === script.readyState) {
	            if (isAbort){
					callback("aborted") ;
	            }else{
	                callback() ;
				}
	        }
	    };
		
		script.onreadystatechange = script.onload ;
		
	    script.onerror = function (ev) { 
			callback(ev); 
		};
		
	    document.getElementsByTagName("head")[0].appendChild(script);
	};

    /**
     * configure i18next
     * 
     * @private
     */
    function configureI18Next(options, callback) {
        if(options.i18next) {
            i18next = options.i18next
        }
        if(!i18next) {
            //no i18next object exists, load from CDN
            console.debug("No i18next object given, we will load from CDN. If you don't want this, include i18next "+I18NEXT_VERSION+
                " in your import scripts or give i18next object to VeloxWebView.i18n.configure function");

            loadScript("https://unpkg.com/i18next@"+I18NEXT_VERSION+"/i18next.js", function(err){
                if(err){ return callback(err); }
                loadScript("https://unpkg.com/i18next-xhr-backend@"+I18NEXT_XHR_VERSION+"/i18nextXHRBackend.js", function(err){
                    if(err){ return callback(err); }
                    loadScript("https://unpkg.com/i18next-browser-languagedetector@"+I18NEXT_BROWSER_DETECT_VERSION+"/i18nextBrowserLanguageDetector.js", function(err){
                        if(err){ return callback(err); }
                        i18next = window.i18next ;
                        initI18Next(options, callback);
                    });
                });
            });
        } else {
            initI18Next(options, callback);
        }
    }

    /**
     * init i18next
     * 
     * @private
     */
    function initI18Next(options, callback){
        var opts = {
            fallbackLng: 'en',
            backend: {
                loadPath: 'locales/{{lng}}.json',
            }
        }
        Object.keys(options).forEach(function(k){
            opts[k] = options[k] ;
        }) ;

        if(i18nextXHRBackend){
            i18next.use(i18nextXHRBackend)
        }
        if(i18nextBrowserLanguageDetector){
            i18next.use(i18nextBrowserLanguageDetector)
        }
        i18next.init(opts, function(err){
            i18nextInitDone = true ;
            console.debug("i18next init done")
            if(err){
                return callback(err) ;
            }
            callback() ;
        });
    }

    /**
     * change lang
     * 
     * @private 
     */
    function setLang(lang, callback){
        if(!callback){
            callback = function(){} ;
        }
        if(!i18next){
            console.error("i18next is not yet initialized")
            return callback("i18next is not yet initialized")
        }
        i18next.changeLanguage(lang, callback);
    }
    
    /**
     * do translation
     * 
     * @private
     */
    function translate(str, params){
        if(!i18next){
            return console.error("i18next is not yet initialized")
        }
        return i18next.t.apply(i18next, arguments) ;
    }

    return extension ;

})));