const VeloxDbPgBackend = require("./backends/pg/VeloxDbPgBackend");
const VeloxSqlUpdater = require("./VeloxSqlUpdater") ;
const VeloxLogger = require("../../../helpers/VeloxLogger") ;
/**
 * VeloxDatabase helps you to manage your database
 */
class VeloxDatabase {

    /**
     * @typedef InterfaceLogger
     * @type {object}
     * @property {function(string)} debug log debug
     * @property {function(string)} info log info
     * @property {function(string)} warn log warn
     * @property {function(string)} error log error
     */

    /**
     * @typedef VeloxDatabaseOptions
     * @type {object}
     * @property {string} user database user
     * @property {string} host database host
     * @property {string} database database name
     * @property {string} password database password
     * @property {'pg'} backend database backend
     * @property {string} migrationFolder  migration scripts folder
     * @property {InterfaceLogger} [logger=console] logger (use console if not given)
     */

    /**
     * 
     * Create a VeloxDatabase
     * 
     * @param {VeloxDatabaseOptions} options options
     */
    constructor(options){
        this.options = options ;

        for( let k of ["user", "host", "port", "database", "password", "backend", "migrationFolder"]){
            if(options[k] === undefined) { throw "VeloxDatabase : missing option "+k ; } 
        }

        var logger = options.logger;

        this.logger = new VeloxLogger("VeloxDatabase", logger) ;

        if(!logger){
            this.logger.warn("No logger provided, using console.") ;
        }

        this.backend = new VeloxDbPgBackend({
            user: options.user,
            host: options.host,
            port: options.port,
            database: options.database,
            password: options.password,
            logger: logger
        });
    }

    /**
     * Will apply needed change to the schema
     * 
     * @param {function(err)} callback - Called when update is done
     */
    updateSchema(callback){
        this.logger.info("Start update database schema") ;
        this.backend.createIfNotExist((err)=>{
            if(err){ return callback(err); }
            
            this.backend.open((err, client)=>{
                if(err){ return callback(err); }

                this._createDbVersionTable(client, (err)=>{
                    if(err){ return callback(err); }

                    this._getAndApplyChanges(client, (err)=>{
                        if(err){ return callback(err); }

                        callback() ;
                    }) ;
                }) ;
            }) ;
        }) ;
    }

    /**
     * Create the database version table
     * 
     * @private
     * @param {VeloxDbClient} client - database client connection
     * @param {function(err)} callback - called when finished 
     */
    _createDbVersionTable(client, callback){
        client.dbVersionTableExists((err, exists)=>{
            if(err){ return callback(err); }
            if(exists){
                return callback() ;
            }
            this.logger.info("Create version table") ;
            return client.createDbVersionTable(callback) ;
        }) ;
    }

    /**
     * Get the schema update to do, run them and update database version
     * 
     * @private
     * @param {VeloxDbClient} client - database client connection
     * @param {function(err)} callback - called when finished 
     */
    _getAndApplyChanges(client, callback){
        let updater = new VeloxSqlUpdater() ;
        updater.loadChanges(this.options.migrationFolder, (err)=>{
            if(err){ return callback(err); }

            client.getCurrentVersion((err, version)=>{
                if(err){ return callback(err); }

                let changes = updater.getChanges(version) ;

                if(changes.length>0){
                    let lastVersion = updater.getLastVersion() ;
                    this.logger.info("Update from "+version+" to "+lastVersion+" - "+changes.length+" changes to apply") ;

                    for(let extension of VeloxDatabase.extensions){
                        if(extension.addSchemaChanges){
                            let extensionChanges = extension.addSchemaChanges(this.options.backend, version, lastVersion) ;
                            for(let c of extensionChanges){
                                changes.push(c) ;
                            }
                        }
                    }

                    client.runQueriesAndUpdateVersion(changes, lastVersion, callback) ;
                }else{
                    this.logger.info("No update to do") ;
                    callback() ;
                }
            }) ;
        }) ;
    }
}


/**
 * contains extensions
 */
VeloxDatabase.extensions = [];

/**
 * @typedef VeloxDatabaseExtension
 * @type {object}
 * @property {string} name name of the extension
 * @property {function({function})} [schemaUpdate] called after schemaUpdate
 * @property {object} [extendsProto] object containing function to add to VeloxWebView prototype
 * @property {object} [extendsGlobal] object containing function to add to VeloxWebView global object
 * @property {object} [extendsBackends]  object that extend backend clients
 */

/**
 * Register extensions
 * 
 * @param {VeloxDatabaseExtension} extension - The extension to register
 */
VeloxDatabase.registerExtension = function (extension) {
    VeloxDatabase.extensions.push(extension);

    if (extension.extendsProto) {
        Object.keys(extension.extendsProto).forEach(function (key) {
                VeloxDatabase.prototype[key] = extension.extendsProto[key];
        });
    }
    if (extension.extendsGlobal) {
        Object.keys(extension.extendsGlobal).forEach(function (key) {
                VeloxDatabase[key] = extension.extendsGlobal[key];
        });
    }
};



module.exports = VeloxDatabase ;