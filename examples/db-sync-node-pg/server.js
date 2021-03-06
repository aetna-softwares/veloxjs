const express = require('express');
const app = express();
const VeloxDatabaseExpress = require("../../database/server/src/VeloxDatabaseExpress");
const VeloxDatabase = require("../../database/server/src/VeloxDatabase");
const VeloxSqlSync = require("../../database/server/src/ext/VeloxSqlSync");

const path = require("path");

VeloxDatabase.registerExtension(new VeloxSqlSync()) ;

const DB = new VeloxDatabase({
  user: "velox",
  password: "velox",
  database: "velox_todo",
  host: "localhost",
  port: 8432,
  backend: "pg",
  migrationFolder: path.join(__dirname, "database", "updates")
}) ;

app.get('/', function (req, res) {
  res.send('Hello World!');
}) ;

app.use(express.static(path.join(__dirname,'public')));

console.log(__dirname) ;

app.use("/db", express.static(path.join(__dirname, "..", "..", "database", "client", "src")));
app.use("/misc", express.static(path.join(__dirname, "..", "..", "client", "misc")));


app.use("/crud", new VeloxDatabaseExpress(DB).middleware()) ;

app.use('/velox/dbSync', function(req, res){
  let changeSet = req.body ;
  DB.syncChangeSet(changeSet, (err)=>{
    if(err) {
      return res.status(500).json(err) ;
    }
    res.end("OK") ;
  }) ;
}) ;

DB.updateSchema((err) => {
  if(err){
    console.error("Can't update database schema", err);
    process.exit(1) ;
  }

  console.log("DB update done") ;

  app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
  }) ;
}) ;

