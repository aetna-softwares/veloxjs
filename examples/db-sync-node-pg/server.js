const express = require('express');
const app = express();
const VeloxDatabase = require("../../database/server/src/VeloxDatabase");
const VeloxSqlModifTracker = require("../../database/server/src/ext/VeloxSqlModifTracker");
const VeloxSqlDeleteTracker = require("../../database/server/src/ext/VeloxSqlDeleteTracker");

const path = require("path");

VeloxDatabase.registerExtension(new VeloxSqlModifTracker()) ;
VeloxDatabase.registerExtension(new VeloxSqlDeleteTracker()) ;

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

app.use(express.static('public'));

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

