const { Pool, Client } = require('pg');
const AsyncJob = require("../../../../../helpers/AsyncJob") ;
const VeloxLogger = require("../../../../../helpers/VeloxLogger") ;

const DB_VERSION_TABLE = "velox_db_version" ;

class VeloxDbPgClient {

    /**
     * Create the client connection
     * 
     * @param {object} connection The connection client from the pool
     * @param {function} closeCb the callback to give back the client to the pool
     * @param {VeloxLogger} logger logger
     */
    constructor(connection, closeCb, logger){
        this.connection = connection;
        this.closeCb = closeCb ;
        this.logger = logger ;
    }

    /**
     * Check if the db version table exists
     * @param {function(err, exists)} callback - Called when check is done
     */
    dbVersionTableExists(callback) {
          this.connection.query(`SELECT EXISTS (
                    SELECT 1 
                    FROM   pg_tables
                    WHERE  schemaname = 'public'
                    AND    tablename = $1
                    ) as exist`, [DB_VERSION_TABLE], (err, res) => {
                if(err){ return callback(err); }
                callback(null, res.rows[0].exist === true) ;
          });
    }

    /**
     * Create the db version table and initialize it with version 0
     * 
     * @param {function(err)} callback - called when finished
     */
    createDbVersionTable(callback) {
          this.connection.query(`CREATE TABLE ${DB_VERSION_TABLE} (
                    version bigint,
                    last_update timestamp without time zone
                    ) `, [], (err) => {
                        if(err){ return callback(err); }
                        this.connection.query(`INSERT INTO ${DB_VERSION_TABLE} (version, last_update) 
                            VALUES ($1, now())`, [0], callback) ;
                    });
    }

    /**
     * Get database version number
     * 
     * @param {function(err, version)} callback - called when finished with the version number
     */
    getCurrentVersion(callback) {
        this.connection.query(`SELECT version FROM ${DB_VERSION_TABLE} LIMIT 1 ;`, [], (err, results) => {
            if(err){ return callback(err); }

            if(results.rows.length === 0){
                //nothing in the table, should not happen, assume 0
                this.connection.query(`INSERT INTO ${DB_VERSION_TABLE} (version, last_update) 
                            VALUES ($1, now())`, [0], (err)=>{
                    if(err){ return callback(err); }
                    callback(null, 0) ;
                }) ;
            } else {
                callback(null, results.rows[0].version) ;
            }
        });
    }

    /**
     * Execute a query and give the result back
     * 
     * @param {string} sql - SQL to execute
     * @param {Array} [params] - Params
     * @param {function(err, results)} callback - called when finished
     */
    query(sql, params, callback){
        
        if(!callback && typeof(params) === "function"){
            callback = params;
            params = [];
        }
        this.logger.debug("Run SQL "+sql+", params "+JSON.stringify(params)) ;
        this.connection.query(sql, params, callback) ;
    }

    /**
     * Execute the schema changes and update the version number
     * @param {VeloxSqlChange[]} changes - Array of changes
     * @param {number} newVersion - The new database version
     * @param {function(err)} callback - called when finish
     */
    runQueriesAndUpdateVersion(changes, newVersion, callback){
        this.transaction((tx, done)=>{
            let job = new AsyncJob(AsyncJob.SERIES) ;
            for(let change of changes){
                if(change.run){
                    //this change is a function that must be executed
                    job.push((cb)=>{
                        
                        change.run(tx, cb) ;
                    }) ;
                } else {
                    //this change is a SQL query to run
                    job.push((cb)=>{
                        tx.query(change.sql, change.params, cb) ;
                    }) ;
                }
            }
            job.push((cb)=>{
                tx.query(`UPDATE ${DB_VERSION_TABLE} SET version = $1, last_update = now()`, [newVersion], cb) ;
            }) ;
            job.async(done) ;
        }, callback) ;
    }


     /**
     * Do some actions in a database inside an unique transaction
     * 
     * @example
     *          db.transaction("Insert profile and user",
     *          function txActions(tx, done){
     *              tx.query("...", [], (err, result) => {
     *                   if(err){ return done(err); } //error handling
     *
     *                   //profile inserted, insert user
     *                   tx.query("...", [], (err) => {
     *                      if(err){ return done(err); } //error handling
     *                      //finish succesfully
     *                      done(null, "a result");
     *                  });
     *              });
     *          },
     *          function txDone(err, result){
     *              if(err){
     *              	return logger.error("Error !!", err) ;
     *              }
     *              logger.info("Success !!")
     *          });
     *
     * @param {function({VeloxDbPgClient}, {function(err, result)})} callbackDoTransaction - function that do the content of the transaction receive tx should call done() on finish
     * @param {function(err)} [callbackDone] - called when the transaction is finished
     * @param {number} timeout - if this timeout (seconds) is expired, the transaction is automatically rollbacked.
     *          If not set, default value is 30s. If set to 0, there is no timeout (not recomended)
     *
     */
    transaction(callbackDoTransaction, callbackDone, timeout){
        if(!callbackDone){ callbackDone = function(){} ;}
        var finished = false;
        if(timeout === undefined){ timeout = 30; }
			
        var tx = new VeloxDbPgClient(this.connection, function(){}, this.logger) ;
        tx.transaction = function(){ throw "You should not start a transaction in a transaction !"; }
            
		this.connection.query("BEGIN", (err) => {
            if(err){
                finished = true ;
                return callbackDone(err);
            }
            
            var timeoutId = null;
            if(timeout > 0){
                timeoutId = setTimeout(function(){
                    if(!finished){
                        //if the transaction is not closed, do rollback
                        this.connection.query("ROLLBACK", (err)=>{
                            finished = true;
                            if(err) {
                                return callbackDone("Transaction timeout after "+timeout+" seconds. Rollback failed : "+err);
                            }
                            callbackDone("Transaction timeout after "+timeout+" seconds. Rollback done");
                        });  
                    }
                }, timeout*1000);
            }
	
            try{
                callbackDoTransaction(tx, (err, data)=>{
                        if(finished){
                            //Finish work for this transaction after being already commited or rollbacked. Ignore commit
                            //Maybe done has been called twice
                            return;
                        }
                        if(err){
                            if(!finished){
                                //if the transaction is not closed, do rollback
                                this.connection.query("ROLLBACK", (errRollback)=>{
                                    if(timeoutId){ clearTimeout(timeoutId) ;}
                                    finished = true;
                                    if(errRollback) {
                                        return callbackDone("Transaction fail with error "+err+" and rollback failed with error "+errRollback);
                                    }
                                    callbackDone(err);
                                });
                            }else{
                                //the transaction is already closed, do nothing
                                callbackDone(err) ;
                            }
                        } else {
                            this.connection.query("COMMIT",(errCommit)=>{
                                if(timeoutId){ clearTimeout(timeoutId) ;}
                                finished = true;
                                if(errCommit) {
                                    return callbackDone("Transaction fail when commit "+errCommit);
                                }
                                callbackDone(null, data);
                            });
                        }
                    }) ;
            }catch(e){
                if(!finished){
                    //if the transaction is not closed, do rollback
                    this.connection.query("ROLLBACK",(errRollback)=>{
                        if(timeoutId){ clearTimeout(timeoutId) ;}
                        finished = true;
                        if(errRollback) {
                            return callbackDone("Transaction fail with error "+e+" and rollback failed with error "+errRollback);
                        }
                        callbackDone(e);
                    });
                }else{
                    //already closed
                    callbackDone(e);	
                }
            }
		}) ;
    };

    /**
     * Do some actions in a database inside an unique transaction
     * 
     * @example
     *          db.transaction("Insert profile and user",
     *          function txActions(tx, done){
     *              tx.query("...", [], (err, result) => {
     *                   if(err){ return done(err); } //error handling
     *
     *                   //profile inserted, insert user
     *                   tx.query("...", [], (err) => {
     *                      if(err){ return done(err); } //error handling
     *                      //finish succesfully
     *                      done(null, "a result");
     *                  });
     *              });
     *          },
     *          function txDone(err, result){
     *              if(err){
     *              	return logger.error("Error !!", err) ;
     *              }
     *              logger.info("Success !!")
     *          });
     *
     * @param {function({VeloxDbPgClient}, {function(err, result)})} callbackDoTransaction - function that do the content of the transaction receive tx should call done() on finish
     * @param {function(err)} [callbackDone] - called when the transaction is finished
     * @param {number} timeout - if this timeout (seconds) is expired, the transaction is automatically rollbacked.
     *          If not set, default value is 30s. If set to 0, there is no timeout (not recomended)
     *
     */
    tx(callbackDoTransaction, callbackDone, timeout){
        this.transaction(callbackDoTransaction, callbackDone, timeout);
    }

    /**
     * Close the database connection
     */
    close() {
        this.closeCb() ;
    }
}

/**
 * VeloxDatabase PostgreSQL backend
 */
class VeloxDbPgBackend {

   /**
     * @typedef VeloxDbPgBackendOptions
     * @type {object}
     * @property {string} user database user
     * @property {string} host database host
     * @property {string} database database name
     * @property {string} password database password
     * @property {VeloxLogger} logger logger
     */

    /**
     * Create a VeloxDbPgBackend
     * 
     * @param {VeloxDbPgBackendOptions} options 
     */
    constructor(options){
        this.options = options ;

        for( let k of ["user", "host", "port", "database", "password"]){
            if(options[k] === undefined) { throw "VeloxDbPgBackend : missing option "+k ; } 
        }

        this.pool = new Pool({
            user: options.user,
            host: options.host,
            database: options.database,
            password: options.password,
            port: options.port || 3211
        }) ;

        this.logger = new VeloxLogger("VeloxDbPgBackend", options.logger) ;

    }

    /**
     * Get a database connection from the pool
     * 
     * @param {function(err, client)} callback - Callback with VeloxDbPgClient instance
     */
    open(callback){
        this.pool.connect((err, client, done) => {
            if(err){ return callback(err); }

            let dbClient = new VeloxDbPgClient(client, done, this.logger) ;
            callback(null, dbClient) ;
        });
    }

    /**
     * Create the database if not exists
     * 
     * @param {function(err)} callback 
     */
    createIfNotExist(callback){
        const client = new Client(this.options) ;
        client.connect((err) => {
            if(err){ 
                //likely db does not exists
                this.logger.info("Database does not exists, try to create");
                let optionsTemplate1 = JSON.parse(JSON.stringify(this.options)) ;
                optionsTemplate1.database = "template1" ;
                const clientTemplate = new Client(optionsTemplate1) ;
                clientTemplate.connect((err)=>{
                    if(err) {
                        //can't connect to template1 to create database
                        this.logger.error("Can't connect to template1 to create database");
                        return callback(err) ;
                    }
                    clientTemplate.query("CREATE DATABASE "+this.options.database, [], (err)=>{
                        clientTemplate.end() ;
                        if(err){
                            //CREATE query failed
                            this.logger.error("Create database failed");
                            return callback(err) ;
                        }
                        callback(); //CREATE ok
                    }) ;
                }) ;
            }else{
                //connection OK
                this.logger.debug("Database connection OK");
                client.end() ;
                callback() ;
            }
        }) ;
    }
}

module.exports = VeloxDbPgBackend ;