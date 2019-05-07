var express = require("express");
var app = express();
var PORT = 8080;
app.set("view engine", "ejs")
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
  extended: true
}));


function generateRandomString() {
  return Math.random().toString(36).substring(7);
}

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};


app.get("/", (req, res) => {
  res.send("Hello!");
  //Goes to page / and sends Hello
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL]
  // sets longURL to the value of the key (even if already randomed)
  //then redirects to the link
  res.redirect(longURL);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  let templateVars = {
    urls: urlDatabase
  }
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  // generate a random number, create a key-value in urlDatabase with the number as key and  the long URL (request) as value
  let rand_url = generateRandomString()
  urlDatabase[rand_url] = req.body.longURL
  // console.log(urlDatabase)
  res.redirect(`/urls/${rand_url}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL]
  res.redirect("/urls")
})

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});


app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL]
  };
  res.render("urls_show", templateVars);
});



app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});