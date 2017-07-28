const express = require('express');
const app = express();
const VeloxDatabase = require("../../database/server/src/VeloxDatabase");
const path = require("path");

const DB = new VeloxDatabase({
  user: "odoo",
  password: "odoo",
  database: "velox_todo",
  host: "localhost",
  port: 9432,
  backend: "pg",
  migrationFolder: path.join(__dirname, "database", "updates")
}) ;

app.get('/', function (req, res) {
  res.send('Hello World!');
}) ;

app.use(express.static('public'));

DB.updateSchema((err) => {
  if(err){
    console.error("Can't update database schema");
  }

  console.log("DB update done") ;

  app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
  }) ;
}) ;

