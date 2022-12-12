"use strict";

const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3000; // Might need to change later, idk how the hosting site works
require("dotenv").config({ path: ".env" });
const { MongoClient, ServerApiVersion } = require('mongodb');

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.69gbgtq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.set("views", ".\\templates");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("static"));

app.get("/", (request, response) => {
  response.render("index", {});
});

app.listen(port);



// EVERYTHING HERE ON DOWN IS SUMMERCAMP, NOT NEEDED DIRECTLY BUT MAY BE HELPFUL FOR CODE REUSE
app.get("/apply", (request, response) => {
  response.render("sendApp", {});
});

app.post("/processApplication", async (request, response) => {
  let applicant = {name: request.body.name, email: request.body.email, gpa: Number(request.body.gpa), bginfo: request.body.bginfo ?? ""};
  await client.db(databaseAndCollection.db)
  .collection(databaseAndCollection.collection)
  .insertOne(applicant);
  response.render("appConf", applicant);
});

app.get("/reviewApplication", (request, response) => {
  response.render("reviewApp", {});
});

app.post("/processReviewApplication", async (request, response) => {
  let result = await client.db(databaseAndCollection.db)
  .collection(databaseAndCollection.collection)
  .findOne({email: request.body.email});
  response.render("reviewConf", result);
});

app.get("/adminGPA", (request, response) => {
  response.render("adminGPA", {});
});

app.post("/processAdminGPA", async (request, response) => {
  let table = "<table border=1>\n<tr><th>Name</th><th>GPA</th></tr>";
  
  let result = await client.db(databaseAndCollection.db)
  .collection(databaseAndCollection.collection)
  .find({gpa: {$gte: Number(request.body.gpa)}}).toArray();

  result.forEach(item => {
    table += `\n<tr><td>${item.name}</td><td>${item.gpa}</td></tr>`;
  });
  table += `\n</table>`;
  response.render("adminGPAResult", {table: table});
});

app.get("/adminRemove", (request, response) => {
  response.render("removeAll", {});
});

app.post("/processAdminRemove", async (request, response) => {
  let result = await client.db(databaseAndCollection.db)
  .collection(databaseAndCollection.collection)
  .deleteMany({});
  response.render("removeAllResult", {deleted: result.deletedCount});
});

// Command Line Interpreter
console.log("Web server started and running at http://localhost:" + port);
process.stdout.write("Stop to shutdown the server: ");
process.stdin.setEncoding("utf8");
process.stdin.on("readable", () => {
  let command = process.stdin.read();
  if (command !== null) {
    command = command.trim();
    if (command === "stop") {
      console.log("Shutting down the server");
      process.exit(0);
    } else {
      console.log("Invalid command: \"" + command + "\"");
    }
  }
  process.stdout.write("Stop to shutdown the server: ");
  process.stdin.resume();
});