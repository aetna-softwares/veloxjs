
/**
 * Async job executor that support both Promise and callback style
 * 
 * This executor is a light implementation that support PARALLEL and SERIES execution only
 * It does not transmit the result of each job. If you need such complex things use complex lib such as
 * async or Promise wrapper lib
 * 
 * @example
 * let job = new AsyncJob(AsyncJob.SERIES) ; //AsyncJob.PARALLEL or AsyncJob.SERIES
 * for(let i=0; i<10; i++){ //some fancy loop
 * 
 *  //push resolve/reject function style
 *  job.push((resolve, reject)=>{ ... }) ;
 * 
 *  //push callback(err) function style
 *  job.push((callback)=>{ ... }) ;
 * }
 * //get a promise job result
 * job.asPromise().then(()=>{ ... }).catch((err)=>{ ... }) ;
 * //or just use then/catch directly
 * job.then(()=>{ ... }).catch((err)=>{ ... }) ;
 * //or get callback(err) style
 * job.async((err)=> { ... } )
 * 
 */
class AsyncJob {

    /**
     * Create an async job
     * 
     * @param {string} style - execution style (AsyncJob.SERIES or AsyncJob.PARALLEL)
     */
    constructor(style){
        this.style = style ;
        if(this.style !== AsyncJob.PARALLEL && this.style !== AsyncJob.SERIES){
            throw "style should be "+ AsyncJob.PARALLEL+" or "+AsyncJob.SERIES ;
        }
    }

    /**
     * Add an async job. It can be a Promise, a function(resolve, reject) or a function(err)
     * (please note that a function(resolve) without reject will be seen as a function(err) and won't work as expected)
     *
     * @example
     *  //push resolve/reject function style
     *  job.push((resolve, reject)=>{ ... }) ;
     * 
     *  //push callback(err) function style
     *  job.push((callback)=>{ ... }) ;
     * 
     * @param {function(resolve, reject)|function(err)} asyncWork 
     */
    push(asyncWork){
        if(this.finalPromiseCreated){
            throw "You cannot add new job after you start to wait to the result (i.e. after called then, catch, async or asPromise)" ;
        }
        if(this.jobError){
            //discard this append because it already fall in error
            return;
        }
        if(asyncWork.length === 1){
            //classical callback(err, result)
            
            this._addPromise((resolve, reject)=>{
                asyncWork((err)=>{
                    if(err){ return reject(err); }
                    resolve() ;
                }) ;
            }) ;
        } else if (asyncWork.length === 2){
            //promise style resolve/reject
            this._addPromise(asyncWork) ;
        } else {
            throw "You function should be either a promise or a callback(err) style function or promise(resolve, reject) style function" ;
        }
    }

    /**
     * add a promise following execution style
     * 
     * @private
     * @param {function(resolve, reject)} func 
     */
    _addPromise(func){
        
        if(this.style === AsyncJob.PARALLEL ){
            if(!this.promises){ this.promises = [] ; }
            this.promises.push(new Promise(func)) ;
        } else if(this.style === AsyncJob.SERIES ){

            if(!this.chain){ 

                this.chain = new Promise(func);
                this.chain.catch((err)=>{
                    this.jobError = err ;
                }); ; 
            }else{
                this.chain = this.chain.then(()=>{
                    let nextPromise = new Promise(func);
                    nextPromise.catch((err)=>{
                        this.jobError = err ;
                    }); 
                    return nextPromise ;
                });
            }            
        }
    }

    /**
     * Callback that will be called when execution is successful
     * 
     * @param {function} callback - called when execution is successful
     * @return {AsyncJob} - return itself for chaining
     */
    then(callback){
        this.asPromise().then(callback) ;
        return this;
    }

    /**
     * Callback that will be called when execution failed
     * 
     * @param {function(err)} callback - called when execution failed
     * @return {AsyncJob} - return itself for chaining
     */
    catch(callback){
        if(this.jobError){
            //already fall in error
            return callback(this.jobError) ;
        }
        this.asPromise().catch(callback) ;
        return this;
    }

    /**
     * Get the Promise of the job
     * 
     * @return {Promise} - the promise of the job
     */
    asPromise(){
        this.finalPromiseCreated = true ;
        if(this.style === AsyncJob.PARALLEL ){
            if(!this.promiseAll){
                this.promiseAll = Promise.all(this.promises || []) ;
            }
            return this.promiseAll ;
        } else if(this.style === AsyncJob.SERIES ){
            return this.chain || Promise.resolve() ;
        }
    }

    /**
     * Callback that will be called when execution is finished in callback(err) style
     * @param {function(err)} callback - called when execution is finished
     */
    async(callback){
        if(this.jobError){
            //already fall in error
            return callback(this.jobError) ;
        }
        this.asPromise().then(()=>{
            callback() ;
        })
        .catch((err)=>{
            callback(err) ;
        }) ;
    }
}

AsyncJob.PARALLEL = "parallel" ;
AsyncJob.SERIES = "series" ;

module.exports = AsyncJob ;