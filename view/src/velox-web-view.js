; (function (global, factory) {
        typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
                typeof define === 'function' && define.amd ? define(factory) :
                        global.VeloxWebView = factory()
}(this, (function () { 'use strict';

        /**
         * Separator used in generated ID
         */
        var ID_SEP = "_-_";

        /**
         * Regexp to find id attribute
         */
        var REGEXP_ID = /id="([^"]*)"/g;

        /**
         * Dictionnary of all loaded CSS
         */
        var loadedCss = {};

        /**
         * Unique ID generator
         * 
         * @constructor
         */
        function UniqueId() {
                this.increment = 0;
        }
        /**
         * Create a new unique id
         */
        UniqueId.prototype.createId = function () {
                return this.increment++;
        };

        /**
         * Global ID generator
         */
        var globalUid = new UniqueId();

        /**
         * Event emiter
         * 
         * @constructor
         */
        function EventEmiter() {
                this.listeners = {};
        }

        /**
         * Listen to event
         * 
         * @param {string} type - the event type name
         * @param {function} listener - the listener that will be called on event
         */
        EventEmiter.prototype.on = function (type, listener) {
                if (!this.listeners[type]) {
                        this.listeners[type] = [];
                }
                this.listeners[type].push(listener);
                return this;
        };

        /**
         * Unregister an event listener
         * 
         * @param {string} type - the event type name
         * @param {function} listener - the listener that will stop to listen
         */
        EventEmiter.prototype.off = function (type, listener) {
                var listeners = this.listeners[type];
                if (!listeners) {
                        return this;
                }
                for (var i = 0; i < listeners.length; i++) {
                        if (listeners[i] === listener) {
                                listeners.splice(i, 1);
                                break;
                        }
                }
                return this;
        };

        /**
         * Listen to an event only once
         * 
         * @param {string} type - the event type name
         * @param {function} listener - the listener that will be called on event
         */
        EventEmiter.prototype.once = function (type, listener) {
                var self = this;
                var once;
                this.on(type, once = function () {
                        self.off(type, once);
                        listener.call(self, arguments);
                });
        };

        /**
         * Emit an event
         * 
         * @private
         * @param {string} type - the event type name
         * @param {object} [data=undefined] - the data to send with the event
         */
        EventEmiter.prototype.emit = function (type, data) {
                var listeners = this.listeners[type];
                if (!listeners) {
                        return;
                }
                for (var i = 0; i < listeners.length; i++) {
                        var listener = listeners[i];
                        listener.apply(this, { type: type, data: data });
                }
        };

        /**
         * Convert relative path to absolute
         * 
         * for example "/foo/bar/" + "../foo" gives "/foo/foo"
         * 
         * credit : http://stackoverflow.com/a/14780463
         * 
         * @param base {string} - the base path
         * @param relative {string} - the relative path to apply
         * @return {string} - the absolute path corresponding to the relative
         */
        function relativePathToAbsolute(base, relative) {
                var stack = base.split("/"),
                        parts = relative.split("/");
                stack.pop(); // remove current file name (or empty string)
                // (omit if "base" is the current folder without trailing slash)
                for (var i = 0; i < parts.length; i++) {
                        if (parts[i] == ".")
                                continue;
                        if (parts[i] == "..")
                                stack.pop();
                        else
                                stack.push(parts[i]);
                }
                return stack.join("/");
        }

        /**
         * Extract a sub object use a path
         * 
         * for example {foo: {bar : "something"}} with the path "foo.bar" gives "something"
         * 
         * @param {object} obj - The object in wich extract the sub object
         * @param {(string|string[])} path - The path used to extract the sub object
         * @return {object} - The extracted sub object
         */
        function pathExtract(obj, path) {
                var pathArray = path.slice();
                if (!Array.isArray(path)) {
                        pathArray = path.split(".");
                }
                var dataObject = obj;
                while (pathArray.length > 0) {
                        //property name
                        var p = pathArray.shift().trim();
                        var index = null;
                        if (p.includes("[")) {
                                //has index
                                index = p.substring(p.indexOf("[") + 1, p.indexOf("]")).trim();
                                p = p.substring(0, p.indexOf("[")).trim();
                        }

                        if (dataObject) {
                                if (p && p !== "this") {
                                        dataObject = dataObject[p];
                                }
                                if (dataObject && index !== null) {
                                        dataObject = dataObject[index];
                                }
                        }
                }
                return dataObject;
        }

        /**
         * Set a value inside the object following a path
         * 
         * @example
         * var obj = {foo: {bar: "something"}} ;
         * pathSetValue(obj, "foo.bar", "new value") ;
         * //obj is now  {foo: {bar: "new value"}}
         * 
         * 
         * @param {object} obj - The object in which update a value
         * @param {(string|string[])} path - Path of the value to set in the object 
         * @param {*} value  - The value to set
         */
        function pathSetValue(obj, path, value) {
                var pathArray = path.slice();
                if (!Array.isArray(path)) {
                        pathArray = path.split(".");
                }
                var dataObject = obj;
                while (pathArray.length > 0) {
                        //property name
                        var p = pathArray.shift().trim();
                        var index = null;
                        if (p.includes("[")) {
                                //has index
                                index = parseInt(p.substring(p.indexOf("[") + 1, p.indexOf("]")).trim(), 10);
                                p = p.substring(0, p.indexOf("[")).trim();
                        }

                        if (dataObject) {
                                if (pathArray.length === 0) {
                                        //last part, set the value
                                        if (index !== null) {
                                                if (p && p !== "this") {
                                                        if (!dataObject[p]) {
                                                                dataObject[p] = [];
                                                        }
                                                        dataObject = dataObject[p];
                                                }
                                                dataObject[index] = value;
                                        } else {
                                                dataObject[p] = value;
                                        }
                                } else {
                                        //not last part, continue to dig
                                        if (p && p !== "this") {
                                                if (!dataObject[p]) {
                                                        if (index !== null) {
                                                                dataObject[p] = [];
                                                        } else {
                                                                dataObject[p] = {};
                                                        }
                                                }
                                                dataObject = dataObject[p];
                                        }
                                        if (dataObject && index !== null) {
                                                if (!dataObject[index]) {
                                                        dataObject[index] = {};
                                                }
                                                dataObject = dataObject[index];
                                        }
                                }

                        }
                }
        }

        /**
         * Execute async function (functions that take callback) in series
         * Call the callback in one function gives an error or when all are finished
         * 
         * @param {function(cb)} calls - Async functions to call in series
         * @param {function(err)} callback - Called when all functions are finished 
         */
        function asyncSeries(calls, callback) {
                if (calls.length === 0) {
                        //nothing more to call
                        return callback();
                }
                var call = calls[0];
                call(function (err) {
                        if (err) { return callback(err); }
                        asyncSeries(calls.slice(1), callback);
                });
        }


        /**
         * The Velox Web View class
         * 
         * @constructor
         * 
         * @param {string} directory - The directory path of the view HTML file
         * @param {string} name - The name of the view HTML file (without extension)
         */
        function VeloxWebView(directory, name) {
                EventEmiter.call(this);

                this.directory = directory;
                this.name = name;
                this.views = {};
                this.initDone = false;
                this.bindObject = null;
                this.bindPath = null;

                Object.defineProperty(this, "EL", {
                        get: (function () {

                                if (!this.ids) {
                                        throw "Try to access element before initialization, consider to use ensureInit()";
                                }
                                let els = this.elements;
                                let elFound = false;
                                if (!els) {
                                        els = {};
                                        Object.keys(this.ids).forEach((function (id) {
                                                els[id] = document.getElementById(this.ids[id]);
                                                if (els[id]) {
                                                        elFound = true;
                                                }
                                        }).bind(this));
                                }
                                if (elFound) {
                                        this.elements = els; //remember only if found
                                }
                                return els;
                        }).bind(this)
                });
        }

        VeloxWebView.prototype = Object.create(EventEmiter.prototype);
        VeloxWebView.prototype.constructor = VeloxWebView;

        /**
         * Init the view
         * 
         * Options are : 
         *   container : id or reference of HTML Element
         *   bindObject : object to bind with the view
         *   bindPath : bind path to apply to object to get values to use in the view
         *   containerParent : id or reference of parent HTML Element, if container is not given, a DIV will be added in containerParent
         *   staticHTML : use this HTML instead of fetch HTML file
         *   staticCSS : use this CSS instead of fetch CSS file
         * 
         * @param {object} options - The options
         * @param {function(Error)} [callback] - Called when init is done
         */
        VeloxWebView.prototype.init = function (options, callback) {
                this.container = options.container;
                this.bindObject = options.bindObject;
                this.bindPath = options.bindPath;
                this.containerParent = options.containerParent;
                this.staticHTML = options.html;
                this.staticCSS = options.css;

                if (!callback) { callback = function (err) { 
                        
                        if(err){ 
                                console.error("Unexpected error", err) ;
                                throw "Unexpected error "+err ; 
                        }
                }; }

                if (this.initDone) {
                        //already init
                        return callback();
                }

                if (typeof (this.container) === "string") {
                        this.containerId = this.container;
                        this.container = document.getElementById(this.container);
                }

                if (!this.container) {
                        if (this.containerParent) {
                                //automatically create container in parent if not exist
                                this.container = document.createElement("DIV");
                                if (this.containerId) {
                                        this.container.id = this.containerId;
                                }

                                if (typeof (this.containerParent) === "string") {
                                        this.containerParent = document.getElementById(this.containerParent);
                                }
                                this.containerParent.appendChild(this.container);
                        } else {
                                throw this.containerId + " is not found";
                        }
                }


                this.loadCSS();

                this.getHTML((function (html) {
                        this.ids = {};

                        var htmlReplaced = html;

                        var match;
                        while ((match = REGEXP_ID.exec(html)) !== null) {
                                var id = match[1];
                                var uuidEl = globalUid.createId();

                                if (id[0] === "#") {
                                        //force keep this id
                                        id = id.substring(1);
                                        this.ids[id] = id;
                                        htmlReplaced = htmlReplaced.replace('id="#' + id + '"', 'id="' + id + '"');
                                } else {
                                        //add UUID
                                        this.ids[id] = id + ID_SEP + uuidEl;
                                        htmlReplaced = htmlReplaced.replace('id="' + id + '"', 'id="' + id + '_-_' + uuidEl + '" data-original-id="' + id + '"');
                                        htmlReplaced = htmlReplaced.replace(new RegExp('data-target="#' + id + '"', 'g'),
                                                'data-target="#' + id + '_-_' + uuidEl + '"');
                                        htmlReplaced = htmlReplaced.replace(new RegExp('href="#' + id + '"', 'g'),
                                                'href="#' + id + '_-_' + uuidEl + '"');
                                        htmlReplaced = htmlReplaced.replace(new RegExp('aria-controls="' + id + '"', 'g'),
                                                'aria-controls="' + id + '_-_' + uuidEl + '"');
                                        htmlReplaced = htmlReplaced.replace(new RegExp('for="' + id + '"', 'g'),
                                                'for="' + id + '_-_' + uuidEl + '"');
                                }
                        }

                        htmlReplaced = htmlReplaced.replace(/__dir__/g, this.directory);

                        this.container.innerHTML = htmlReplaced;

                        this.initAutoEmit();

                        this.render((function () {
                                this.initDone = true;
                                this.emit("initDone");

                                var calls = [];
                                VeloxWebView.extensions.forEach((function (extension) {
                                        if (extension.init) {
                                                if (extension.init.length === 0) {
                                                        //no callback
                                                        extension.init.bind(this)();
                                                } else {
                                                        calls.push((function (cb) {
                                                                extension.init.bind(this)(cb);
                                                        }).bind(this));
                                                }
                                        }
                                }).bind(this));

                                asyncSeries(calls, (function (err) {
                                        callback(err);
                                }).bind(this));
                        }).bind(this));
                }).bind(this));
                return this;
        };

        /**
         * Get the current bound object
         * 
         * @return {object} - The object bound to the view
         */
        VeloxWebView.prototype.getBoundObject = function () {
                return getDataFromPath(this.bindObject, this.bindPath);
        };

        /**
         * Get HTML file through XHR
         * @private
         * 
         * @param {function(html)} callback - Called with HTML contents when fetched
         */
        VeloxWebView.prototype.getHTML = function (callback) {
                if (this.staticHTML) {
                        callback(this.staticHTML);
                } else {
                        var htmlUrl = this.directory + "/" + this.name + ".html";

                        var xhr = new XMLHttpRequest();
                        xhr.open('GET', htmlUrl);
                        xhr.onload = (function () {
                                if (xhr.status === 200) {
                                        callback.bind(this)(xhr.responseText);
                                } else {
                                        callback.bind(this)('Request to ' + htmlUrl + ' failed.  Returned status of ' + xhr.status);
                                }
                        }).bind(this);
                        xhr.send();
                }
        };

        /**
         * Load CSS of the view
         * @private
         */
        VeloxWebView.prototype.loadCSS = function () {
                if (!loadedCss[this.directory + "_" + this.name]) {
                        if (this.staticCSS !== undefined) {
                                if (this.staticCSS) {
                                        var head = document.getElementsByTagName('head')[0];
                                        var s = document.createElement('style');
                                        s.setAttribute('type', 'text/css');
                                        if (s.styleSheet) {   // IE
                                                s.styleSheet.cssText = this.staticCSS;
                                        } else {                // the world
                                                s.appendChild(document.createTextNode(this.staticCSS));
                                        }
                                        head.appendChild(s);
                                        //$('head').append('<style>'+this.staticCSS+'</style>');
                                }

                                loadedCss[this.directory + "_" + this.name] = true;
                        } else {
                                this.loadCSSFile();
                        }
                }
        };

        /**
         * Load CSS from file
         * @private
         */
        VeloxWebView.prototype.loadCSSFile = function () {
                if (!loadedCss[this.directory + "_" + this.name]) {
                        var cssUrl = this.directory + "/" + this.name + ".css";
                        var xhr = new XMLHttpRequest();
                        xhr.open('HEAD', cssUrl);
                        xhr.onload = (function () {
                                if (xhr.status !== 404) {
                                        document.querySelector('head').innerHTML += '<link rel="stylesheet" href="' + cssUrl + '" type="text/css"/>';
                                }
                        }).bind(this);
                        xhr.send();
                        //$('head').append('<link rel="stylesheet" href="'+cssUrl+'" type="text/css" />');
                        loadedCss[this.directory + "_" + this.name] = true;
                }
        };

        /**
         * Make sure the init process of the view is done
         * 
         * @param {function} callback - Called when the init is done (or immediatly if already done)
         */
        VeloxWebView.prototype.ensureInit = function (callback) {
                if (this.initDone) {
                        callback();
                } else {
                        this.once("initDone", callback);
                }
        };


        /**
         * Render data in the view
         * 
         * @param {object} [bindObject] - The data to render. If not given, it use the object given on init or on previous render
         * @param {function} [callback] - Called when render is done
         */
        VeloxWebView.prototype.render = function (bindObject, callback) {
                if (typeof (bindObject) === "function") {
                        callback = bindObject;
                        bindObject = undefined;
                }
                if (bindObject !== undefined) {
                        this.bindObject = bindObject;
                }
                if (!callback) {
                        callback = function () { };
                }
                if (!this.bindObject) { return callback(); }

                if (!this.boundElements) {
                        this.boundElements = [];

                        var i, el, bindPath;
                        var elements = this.container.querySelectorAll('[data-bind]');
                        //first run to eliminate sub views HTML and populate data bind reference
                        for (i = 0; i < elements.length; i++) {
                                el = elements[i];
                                bindPath = el.getAttribute("data-bind");
                                if (bindPath.replace(/\s/g, "").match(/\[\]$/)) {
                                        var viewId = el.getAttribute("data-view-id");
                                        if (!viewId) {
                                                viewId = el.getAttribute("data-original-id");
                                                if (!viewId) {
                                                        viewId = globalUid.createId();
                                                }
                                                el.setAttribute("data-view-id", viewId);
                                        }
                                        if (!this.views[viewId]) {
                                                this.views[viewId] = {
                                                        el: el,
                                                        bindPath: bindPath,
                                                        html: el.innerHTML,
                                                        instances: []
                                                };
                                                el.innerHTML = "";
                                        }
                                }
                        }

                        elements = this.container.querySelectorAll('[data-bind]');
                        //second run to get simple bind
                        for (i = 0; i < elements.length; i++) {
                                el = elements[i];
                                bindPath = el.getAttribute("data-bind");
                                if (!bindPath.replace(/\s/g, "").match(/\[\]$/)) {
                                        this.boundElements.push({
                                                el: el,
                                                bindPath: bindPath
                                        });
                                }
                        }
                }

                var baseData = this.bindObject;
                if (this.bindPath) {
                        baseData = pathExtract(this.bindObject, this.bindPath);
                }


                //set simple elements
                this.boundElements.forEach((function (boundEl) {
                        var el = boundEl.el;
                        var bindPath = boundEl.bindPath;
                        var bindData = pathExtract(baseData, bindPath);
                        
                        if (el.veloxSetValue){
                                el.veloxSetValue(bindData) ;
                        }else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                                if (bindData === null || bindData === undefined) {
                                        bindData = "";
                                }
                                el.value = bindData;
                        } else {
                                if (bindData === null || bindData === undefined) {
                                        bindData = "";
                                }
                                el.innerHTML = bindData;
                        }
                }).bind(this));

                //set sub views
                var calls = [];
                Object.keys(this.views).forEach((function (viewId) {
                        var view = this.views[viewId];
                        var el = view.el;
                        var bindPath = view.bindPath;
                        var bindData = pathExtract(baseData, bindPath.replace(/\s/g, "").replace(/\[\]$/, ""));
                        bindData.forEach((function (d, y) {
                                if (!view.instances[y]) {
                                        //this instance does not exist yet, create it
                                        var v = new VeloxWebView();
                                        view.instances[y] = v;
                                        calls.push((function (cb) {

                                                v.init({
                                                        containerParent: el,
                                                        html: view.html,
                                                        css: "",
                                                        bindObject: this.bindObject,
                                                        bindPath: (this.bindPath ? this.bindPath + "." : "") + bindPath.replace(/\s/g, "").replace(/\[\]$/, "[" + y + "]")
                                                }, cb);
                                        }).bind(this));
                                } else {
                                        //this instance already exist, just reload data in it
                                        calls.push((function (cb) {
                                                view.instances[y].render(cb);
                                        }).bind(this));
                                }
                        }).bind(this));
                        //delete removed elements
                        var removedInstance = view.instances.splice(bindData.length);
                        removedInstance.forEach((function (instance) {
                                el.removeChild(instance.container);
                        }).bind(this));
                }).bind(this));

                asyncSeries(calls, (function () {
                        this.emit("load");
                        callback();
                }).bind(this));
        };

        /**
         * Redo the render from the previously rendered object
         * 
         * This is an alias to render(callback)
         * 
         * @param {function} [callback] - Called when render is done
         */
        VeloxWebView.prototype.reload = function (callback) {
                this.render(callback);
        };

        /**
         * Update data object from value inputed in view
         * 
         * @param {object} [dataObject] - The data object to update. If not given the object used for render is updated
         */
        VeloxWebView.prototype.updateData = function (dataObject) {
                if (dataObject === undefined) {
                        dataObject = this.bindObject;
                }

                var baseData = dataObject;
                if (this.bindPath) {
                        baseData = pathExtract(dataObject, this.bindPath);
                }
                //set simple elements
                this.boundElements.forEach((function (boundEl) {
                        var el = boundEl.el;
                        var bindPath = boundEl.bindPath;
                        var value = undefined;
                        if (el.veloxGetValue){
                                value = el.veloxGetValue();
                        }else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                                value = el.value;
                        }
                        if(value !== undefined){
                                pathSetValue(baseData, bindPath, value);
                        }
                        
                }).bind(this));

                //set sub views
                Object.keys(this.views).forEach((function (viewId) {
                        var view = this.views[viewId];
                        var viewData = pathExtract(baseData, view.bindPath.replace(/\s/g, "").replace(/\[\]$/, ""));
                        if (!viewData) {
                                viewData = [];
                                pathSetValue(baseData, view.bindPath.replace(/\s/g, "").replace(/\[\]$/, ""), viewData);
                        }
                        view.instances.forEach((function (instance) {
                                instance.updateData(dataObject);
                        }).bind(this));

                        viewData.splice(view.instances.length);
                }).bind(this));
        };

        /**
         * Init the auto emit on HTML elements
         * 
         * @private
         */
        VeloxWebView.prototype.initAutoEmit = function () {
                var emitters = this.container.querySelectorAll("[data-emit]");
                for (var i = 0; i < emitters.length; i++) {
                        (function (i) {
                                var el = emitters[i];
                                let event = el.getAttribute("data-emit");
                                if (!event) {
                                        event = "click";
                                }
                                el.addEventListener(event, (function () {
                                        var id = el.getAttribute("data-original-id");
                                        this.emit(id);
                                }).bind(this));
                        }).bind(this)(i);
                }
        };

        /**
         * contains extensions
         */
        VeloxWebView.extensions = [];

        /**
         * Register extensions
         * 
         * extension object should have : 
         *  name : the name of the extension
         *  init : function that will be executed on view init. If async is needed the function should have a callback param.
         *  extendsProto : object containing function to add to VeloxWebView prototype
         *  extendsGlobal : object containing function to add to VeloxWebView global object
         * 
         * @param {object} extension - The extension to register
         */
        VeloxWebView.registerExtension = function (extension) {
                VeloxWebView.extensions.push(extension);

                if (extension.extendsProto) {
                        Object.keys(extension.extendsProto).forEach(function (key) {
                                VeloxWebView.prototype[key] = extension.extendsProto[key];
                        });
                }
                if (extension.extendsGlobal) {
                        Object.keys(extension.extendsGlobal).forEach(function (key) {
                                VeloxWebView[key] = extension.extendsGlobal[key];
                        });
                }
        };


        return VeloxWebView;
})));