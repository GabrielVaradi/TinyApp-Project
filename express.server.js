const express = require("express");
const bcrypt = require('bcrypt');
const app = express();
const PORT = 8080;
const cookieParser = require('cookie-parser')
const bodyParser = require("body-parser");

app.use(cookieParser())
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({
  extended: true
}));


const urlDatabase = {};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
}

function generateRandomString() {
  return Math.random().toString(36).substring(7);
}

var updateURL = (shortURL, longURL, userID) => {
  dataBaseObj = {
    'longURL': longURL,
    'userID': userID
  }
  return urlDatabase[shortURL] = dataBaseObj
}
const addUsers = (userObject, randomId) => {
  const newUser = {
    id: randomId,
    email: userObject.email,
    password: bcrypt.hashSync(userObject.password, 10)
  }
  users[randomId] = newUser

  return [users, randomId]
}

const emailAlreadyUsed = (users, emailToVerify) => {
  for (const findEmail in users) {
    if (emailToVerify === users[findEmail].email) {
      return true
    }
  }
  return false
}

const comparePasswords = (users, passwordToVerify) => {
  for (const findPassword in users) {
    if (bcrypt.compareSync(passwordToVerify, users[findPassword].password)) {
      return true
    }
  }
  return false
}

const findEmailToId = (users, Email) => {
  for (const findId in users) {
    if (Email === users[findId].email) {
      return users[findId].id
    }
  }
}

const urlsForUser = id => {
  let longURLS = {}
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      longURLS[shortURL] = urlDatabase[shortURL]
    }
  }

  return longURLS
}

//## GET PART ##//
//## <('.')>  ##//
//## GET PART ##//

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
    urls: urlDatabase,
    users: users,
    user: req.cookies["user_id"],
    URL: urlsForUser(req.cookies["user_id"])
  }
  console.log(users)
  res.render("urls_index", templateVars);
});

app.get("/register", (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    users: users,
    user: req.cookies["user_id"]
  }
  res.render("urls_register", templateVars)
})

app.get("/login", (req, res) => {

  let templateVars = {
    urls: urlDatabase,
    users: users,
    user: req.cookies["user_id"]
  }
  res.render("urls_login", templateVars)
})

app.get("/urls/new", (req, res) => {
  let templateVars = {
    user: req.cookies["user_id"],
    users: users
  };
  //if not logged in
  if (!req.cookies["user_id"]) {
    res.redirect('/login')
  }
  res.render("urls_new", templateVars);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});


app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    users: users,
    user: req.cookies["user_id"]
  };
  res.render("urls_show", templateVars);
});


//## POST PART ##//
//##  <('.')>  ##//
//## POST PART ##//


app.post("/urls", (req, res) => {
  // generate a random number, create a key-value in urlDatabase with the number as key and  the long URL (request) as value
  let rand_url = generateRandomString()
  updateURL(rand_url, req.body.longURL, req.cookies['user_id'])
  res.redirect(`/urls/${rand_url}`);
});


app.post("/register", (req, res) => {
  const randomId = generateRandomString()
  if (req.body.email && req.body.password) {
    if (emailAlreadyUsed(users, req.body.email)) {
      res.send("400 : Email already used")
    } else {
      addUsers(req.body, randomId)
      res.cookie('user_id', randomId)
      res.redirect('/urls')
    }
  } else {
    res.send("400 : Enter a email and a password")
  }
})




app.post('/login', (req, res) => {
  if (!emailAlreadyUsed(users, req.body.email)) {
    res.send("403: Email cannot be found")
  }
  if (!comparePasswords(users, req.body.password)) {
    res.send("403: Wrong password")
  } else {
    res.cookie('user_id', findEmailToId(users, req.body.email))
    res.status(302).redirect('/urls')
  }
})

app.post("/urls/:shortURL", (req, res) => { //what does it do?

  if (req.cookies['user_id'] === urlDatabase[req.params.shortURL].userID) {
    const shortURL = req.params.shortURL
    const longURL = req.body.longURL
    updateURL(shortURL, longURL, req.cookies['user_id'])
    res.status(302).redirect('/urls')
  } else {
    res.redirect('/login')
  }

})

app.post("/urls/:shortURL/delete", (req, res) => {
  // if the user ID in the link is the same as the current user ID, allow to delete
  if (req.cookies['user_id'] === urlDatabase[req.params.shortURL].userID) {
    delete urlDatabase[req.params.shortURL]
    res.redirect("/urls")
  }

})

app.post('/logout', (req, res) => {
  res.clearCookie('user_id')
  res.status(302).redirect('/login')
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});