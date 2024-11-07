const express = require("express");
let server = express();

server.set("view engine", "ejs");

server.use(express.static("public"));

// Route for Portfolio page
server.get("/Portfolio", (req, res) => {
  res.render("Portfolio");
});

// Route for Bootstrap page (home route)
server.get("/", (req, res) => {
  res.render("Bootstrap");
});

server.listen(5000, () => {
  console.log("Server Started at localhost:5000");
});
