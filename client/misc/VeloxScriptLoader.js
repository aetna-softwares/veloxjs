; (function (global, factory) {
        typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        global.VeloxScriptLoader = factory() ;
}(this, (function () { 'use strict';
    /**
     * @typedef VeloxScriptLoaderOptions
     * @type {object}
     * @property {cdn|bower} policy policy of lib loaded : get from cdn or bower directory
     * @property {string} [bowerPath] if using bower policy, the path to bower folder 
     */

     /**
     * @typedef VeloxScriptLoaderLib
     * @type {object}
     * @property {string} name name of the lib (ex: jquery)
     * @property {js|css} type type of the lib (js or css)
     * @property {string} version version if the lib
     * @property {string} cdn cdn path of the lib (put $VERSION to be replaced by the version)
     * @property {string} bowerPath path in bower (ex : mylib/dist/lib.min.js)
     */

    /**
     * The Velox Script Loader
     * 
     * @constructor
     * @param {VeloxScriptLoaderOptions} [options] script loading options, if nothing given, use CDN
     */
    function VeloxScriptLoader(options) {
        this.loadedScripts = {} ;
	    this.loadingScripts = {} ;
        this.loadedCSS = {} ;
        this.loadListeners = {} ;
        this.loadInProgress = 0 ;

        this.setOptions(options) ;
    }

    /**
     * set options
     * 
     * @param {VeloxScriptLoaderOptions} [options] script loading options, if nothing given, use CDN
     */
    VeloxScriptLoader.prototype.setOptions = function(options){
        this.options = options ;
        if(!this.options){
            this.options = {
                policy: "cdn",
            } ;
        }
        if(this.options.policy === "bower" && !this.options.bowerPath){
            throw "If you are using bower policy, you must give the bowerPath" ;
        }
        if(this.options.bowerPath && this.options.bowerPath[this.options.bowerPath.length-1] !== "/"){
            this.options.bowerPath = this.options.bowerPath+"/" ;
        }
    } ;

    /**
     * Listen to library loading
     * 
     * @param {string} libName the name of the lib to listen
     * @param {function} listener called when the lib is loaded
     */
    VeloxScriptLoader.prototype.addLoadListener = function(libName, listener){
        if(!this.loadListeners[libName]){
            this.loadListeners[libName] = [] ;
        }
        this.loadListeners[libName].push(listener) ;
    } ;

    /**
     * Remove a listener
     * 
     * @param {string} libName the name of the lib to listen
     * @param {function} listener the listener to remove
     */
    VeloxScriptLoader.prototype.removeLoadListener = function(libName, listener){
        if(this.loadListeners[libName]){
            var index = this.loadListeners[libName].indexOf(listener) ;
            this.loadListeners[libName].splice(index, 1) ;
        }
    } ;

    /**
     * emit the load event on a lib
     * 
     * @private
     */
    VeloxScriptLoader.prototype._emitLoad = function(libName){
        if(this.loadListeners[libName]){
            this.loadListeners[libName].forEach(function(l){
                l() ;
            }) ;
        }
    } ;

    /**
     * Load a lib file
     * 
     * Note : for CSS, the callback is called immediatly
     * 
     * 
     * @param {VeloxScriptLoaderLib} libDef the lib definition to load
     * @param {function} callback called when load is done
     */
    VeloxScriptLoader.prototype.loadOneFile = function(libDef, callback){
		if(!callback){
			callback = function(){
				console.log("LIB "+libDef.name+" LOADED") ;
			} ;
        }
        
        var url = this.options.bowerPath+libDef.bowerPath ;
		if(this.options.policy === "cdn"){
            url = libDef.cdn.replace("$VERSION", libDef.version) ;
        }
		if(libDef.type === "css"){
			if(this.loadedCSS[libDef.name]){
				return callback() ;
			}
			this.loadedCSS[libDef] = new Date() ;
			this.loadCss(url, function(){
                this._emitLoad(libDef.name) ;
				callback() ;
			}.bind(this));
		}else{
			if(this.loadedScripts[libDef.name]){
				//already loaded
				return callback() ;
			}
			if(this.loadingScripts[libDef.name]){
                //currently loading, wait until loaded
                var listener = function(){
                    callback();
                    this.removeLoadListener(listener) ;
                }.bind(this) ;
                return this.addLoadListener(libDef.name, listener) ;
			}
			this.loadingScripts[libDef.name] = new Date() ;
			this.loadScript(url, function(){
				this.loadedScripts[libDef.name] = new Date() ;
				delete this.loadingScripts[libDef.name] ;
				this._emitLoad(libDef.name) ;
				callback() ;
			}.bind(this));
		}
	}  ;


    /**
     * Load a script
     * 
     * @param {string} url the url of the script
     * @param {function(Error)} callback called when script is loaded
     */
    VeloxScriptLoader.prototype.loadScript = function (url, callback) {
        var script = document.createElement("script");
	    script.async = true;
	    script.type = "text/javascript";
	    script.src = url;
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
    } ;

    /**
     * Load a CSS
     * 
     * @param {string} url the url of CSS fiel
     * @param {function(Error)} callback called when script is loaded
     */
    VeloxScriptLoader.prototype.loadCss = function (url, callback) {
		var link = document.createElement("link");
	    link.rel = "stylesheet";
	    link.type = "text/css";
	    link.href = url;
		
	    document.getElementsByTagName("head")[0].appendChild(link);
		
		callback() ;
    };
    
    
	/**
     * Load a set of libs.
     * 
     * The function receive an array of lib to load. You can parallelize loading by giving an array of array
     * @example
     * load([
     *    lib1, //lib1 will be load first
     *    [lib2, lib3], //lib2 and lib3 will be loaded in parallel after lib1 is loaded
     *    lib4 //lib4 will be loaded after lib1, lib2 and lib3 are loaded
     * ])
     * 
	 * @param {VeloxScriptLoaderLib[]} libs array of libs to load
	 * @param {function} [callback] called when libs are loaded
	 */
	VeloxScriptLoader.prototype.load = function(libs, callback){
        if(!callback){ callback = function(){} ; }
        
		if(!Array.isArray(libs)){
			libs = [libs] ;
		}
        this.loadInProgress++ ;
        
        libs = JSON.parse(JSON.stringify(libs)) ;

		var calls = [function(cb){cb() ;}] ;
		libs.forEach(function(l){
			calls.push(function(cb){
				this._loadFiles(l, cb) ;
			}.bind(this)) ;
		}.bind(this)) ;
		series(calls, function(){
			this.loadInProgress-- ;
			callback() ;
		}.bind(this)) ;
    } ;

    /**
     * Load one or many lobs in parallel
     * 
     * @private
     * @param {VeloxScriptLoaderLib|VeloxScriptLoaderLib[]} libDef a libe to load or an array of libs to load
     * @param {function(Error)} callback called when libs are loaded
     */
    VeloxScriptLoader.prototype._loadFiles = function(libDef, callback){
		if(!Array.isArray(libDef)){
			libDef = [libDef] ;
		}
		var calls = [function(cb){cb() ;}] ;
		libDef.forEach(function(l){
			calls.push(function(cb){
				this.loadOneFile(l, cb) ;
			}.bind(this)) ;
		}.bind(this)) ;
		parallel(calls, callback) ;
	}  ;
    
    /**
     * Execute many function in parallel
     * 
     * @param {function(Error)[]} calls array of function to run
     * @param {function(Error)} callback called when all calls are done
     */
    var parallel = function(calls, callback){
        var workers = calls.length ;
        var done = false;
        calls.forEach(function(call){
            if(!done){
                call(function(err){
                    if(err){
                        if(!done){
                            callback(err) ;
                            done = true ;
                        }
                    }
                    workers -- ;
                    if(workers === 0){
                        done = true ;
                        callback() ;
                    }
                }) ;
            }
        }) ;
    } ;

    /**
     * Execute many function in series
     * 
     * @param {function(Error)[]} calls array of function to run
     * @param {function(Error)} callback called when all calls are done
     */
    var series = function(calls, callback){
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



    return new VeloxScriptLoader();
})));