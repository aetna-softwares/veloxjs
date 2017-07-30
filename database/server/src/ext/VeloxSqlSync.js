
/**
 * 
 * @property {VeloxDatabase} db the database access
 */
class VeloxSqlSync{

    /**
     * @typedef VeloxSqlSyncOption
     * @type {object}
     * @property {function|Array|object} [tablesToTrack] the table to track configuration. If not given all tables are tracked.
     *  it can be :
     *   - a function that take the table name as argument and return true/false
     *   - an array of table to track
     *   - an object {include: []} where include is array of tables to track
     *   - an object {exclude: []} where exclude is array of tables we should not track
     */

    /**
     * Create the VeloxSqlSync extension
     * 
     * @example
     * 
     * @param {VeloxSqlSyncOption} [options] options 
     */
    constructor(){
        this.name = "VeloxSqlSync";
        
    }

    /**
     * Add needed schema changes on schema updates
     * 
     * @param {string} backend 
     */
    addSchemaChanges(backend){
        if(["pg"].indexOf(backend) === -1){
            throw "Backend "+backend+" not handled by this extension" ;
        }

        let changes = [] ;

        changes.push({
            sql: this.getCreateTableVersion(backend)
        }) ;
        changes.push({
            sql: this.getCreateTableDeleteTrack(backend)
        }) ;
        
        changes.push({
            run: (tx, cb)=>{
                this.createTriggerForTables(backend, tx, this.createTriggerBeforeDelete.bind(this), cb);
            }
        }) ;

        return changes;
    }


    applyChangeSet(changeSet){
        this.
    }
}