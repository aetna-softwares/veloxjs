/**
 * Simple wrapper on logger to add contextual information
 */
class VeloxLogger {

    /**
     * @typedef InterfaceLogger
     * @type {object}
     * @property {function(string)} debug log debug
     * @property {function(string)} info log info
     * @property {function(string)} warn log warn
     * @property {function(string)} error log error
     */

    /**
     * Create a VeloxLogger
     * 
     * @param {string} name the contextual name (usually class name)
     * @param {InterfaceLogger} [logger=console] the logger to use 
     */
    constructor(name, logger) {
        this.name = name;
        this.logger = logger || console;
    }

    /**
     * Format the message
     * 
     * @private
     * @param {string} message the message to log
     */
    _format(message){
        return "["+this.name+"] "+message ;
    }

    /**
     * Debug log
     * 
     * @param {string} message message
     */
    debug(message){
        this.logger.log(this._format(message)) ;
    }

    /**
     * Info log
     * 
     * @param {string} message message
     */
    info(message){
        this.logger.info(this._format(message)) ;
    }

    /**
     * Warn log
     * 
     * @param {string} message message
     */
    warn(message){
        this.logger.warn(this._format(message)) ;
    }

    /**
     * Error log
     * 
     * @param {string} message message
     */
    error(message){
        this.logger.error(this._format(message)) ;
    }
}

module.exports = VeloxLogger ;