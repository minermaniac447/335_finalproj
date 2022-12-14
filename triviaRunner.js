"use strict";

const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const app = express();
const port = 3000; // Might need to change later, idk how the hosting site works
require("dotenv").config({ path: "credentialsDontPost\\.env" });
const { MongoClient, ServerApiVersion } = require('mongodb');

const DB = process.env.MONGO_DB_NAME;
const COLLECTION = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.69gbgtq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.set("views", "templates");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("static"));
app.use(cookieParser());

// Initial Load/Restart
app.get("/", (request, response) => {

  response.render("index", {username: request.cookies.username ?? ""});
});

// Submitting username/starting
app.post("/", async (request, response) => {
  // PLACEHOLDER, REPLACE WITH RETRIEVAL FROM API
  let apiSessionToken = "8ce18e8ab03847ba1e59a8c8984f305e303e654da208f18f02f8dcf83c2bd9aa";
  let record = {
    token: apiSessionToken,
    current_score: 0
  };

  let result = await client.db(DB).collection(COLLECTION)
  .updateOne({username: request.body.username}, {$set: record});
  if (result.matchedCount == 0) {
    record.username = request.body.username;
    record.high_score = 0;
    await client.db(DB).collection(COLLECTION)
    .insertOne(record);
  }

  response.cookie("username", request.body.username, {httpOnly: true});
  response.redirect("question");
});

// Loading in question/sending it to DB to hold
app.get("/question", async (request, response) => {
  // get username and token
  const username = request.cookies.username;
  const {token} = await client.db(DB).collection(COLLECTION)
  .findOne({username: username});

  // PLACEHOLDER QUESTION - FROM API REQUEST I NEED "question", "correct_answer", and "incorrect_answers"
  let apiResponse = JSON.parse('{"category":"Entertainment: Video Games","type":"multiple","difficulty":"easy","question":"In what year was Hearthstone released?","correct_answer":"2014","incorrect_answers":["2011","2013","2012"]}');
  let {question, correct_answer, incorrect_answers} = apiResponse;
  await client.db(DB).collection(COLLECTION)
  .updateOne({username: username}, {$set: {question, correct_answer}});

  let shuffled_answers = [correct_answer].concat(incorrect_answers);
  shuffled_answers.sort((a, b) => Math.random() - 0.5);
  response.render("question", {question: question, answers: shuffled_answers});
});

// Showing the correct answer and the selected answer to the question
app.get("/answer", async (request, response) => {
  // get username, question, correct answer, and scores
  const username = request.cookies.username;
  let {question, correct_answer, current_score, high_score} = await client.db(DB).collection(COLLECTION)
  .findOne({username: username});

  // Check if the right answer was selected, and if so update the score (and high score if applicable)
  let correct = false;
  if (request.query.selected === correct_answer) {
    correct = true;
    current_score++;
    let update = {current_score: current_score};
    if (current_score > high_score) update.high_score = current_score;
    await client.db(DB).collection(COLLECTION).updateOne({username: username}, {$set: update});
  }

  let message = "this should say something different depending on whether the user selected the right answer";
  // Need to work out next button logic for if the user correctly or incorrectly answers the question
  response.render("answer", {selected: request.query.selected, correct_answer: correct_answer, question: question, current_score: current_score});
});

// Render Leaderboard
app.get("/leaderboard", async (request, response) => {
  // get username
  const username = request.cookies.username;
  
  // get top 5 players, by score
  let top5 = await client.db(DB).collection(COLLECTION)
  .find().sort({high_score: -1}).limit(5).toArray();
  if (!top5.some(player => player.username === username)) {
    top5[5] = await client.db(DB).collection(COLLECTION).findOne({username: username});
  }

  console.log(top5);

  // Do whatever manipulation of the data to return the response table
  response.render("leaderboard", {});
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