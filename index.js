console.log("Hello via Bun!");

// import express
const express = require("express");

// create express object
const app = express();

// import express-session to create a session variable
const session = require("express-session");

// load environment variables from the .env file
require("dotenv").config()

// set the port using the .env file
const port = process.env.PORT;

// use ejs for the webpages - refer to the views directory
app.set("view engine", "ejs");

// import body-parser to pull data from submitted forms 
const bodyParser = require("body-parser");

// set up connection to database
const knex = require("knex") ({
    client: "pg",
    connection: {
        host : process.env.DB_HOST,
        user : process.env.POSTGRES_USER,
        password : process.env.POSTGRES_PASSWORD,
        database : process.env.POSTGRES_DATABASE,
    }
});

app.get("/health", (req, res) => {
    res.status(200).send("OK");
})