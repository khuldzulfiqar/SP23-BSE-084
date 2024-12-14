const express = require("express");
let server = express(); // Consistently use 'server' as the variable name

server.set("view engine", "ejs"); // Set EJS as the view engine

server.use(express.static("public")); // Serve static files from the 'public' folder

server.get("/", (req, res) => { // Use 'server' instead of 'app'
  res.render("index"); // Render the 'index.ejs' view
});

server.listen(5000, () => {
  console.log("Server Started at http://localhost:5000");
});
