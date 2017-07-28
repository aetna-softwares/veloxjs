const VeloxDbPgBackend = require("./backends/pg/VeloxDbPgBackend");
const VeloxSqlUpdater = require("./VeloxSqlUpdater") ;

class VeloxDatabase {

    /**
     * The parameters are : 
     *  - user 
     *  - host
     *  - database
     *  - password
     *  - port
     *  - backend (supported : pg)
     *  - migrationFolder : migration scripts folder
     * 
     * 
     * @param {object} options - parameters
     */
    constructor(options){
        this.options = options ;

        this.backend = new VeloxDbPgBackend(options);
    }

    /**
     * Will apply needed change to the schema
     * 
     * @param {function(err)} callback - Called when update is done
     */
    updateSchema(callback){
        this.backend.createIfNotExist((err)=>{
            if(err){ return callback(err); }
            
            this.backend.open((err, client)=>{
                if(err){ return callback(err); }

                this._createDbVersionTable(client, (err)=>{
                    if(err){ return callback(err); }

                this._getAndApplyChanges(client, (err)=>{

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
                    client.runQueriesAndUpdateVersion(changes, updater.getLastVersion(),callback()) ;
                }else{
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
 * Register extensions
 * 
 * extension object should have : 
 *  name : the name of the extension
 *  schemaUpdate : function that will be executed on schema update. If async is needed the function should have a callback param.
 *  extendsProto : object containing function to add to VeloxWebView prototype
 *  extendsGlobal : object containing function to add to VeloxWebView global object
 *  backends : object that extend backend client
 * 
 * @param {object} extension - The extension to register
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