const express = require('express');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 8080;
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');

app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cookieSession({
  name: 'session',
  keys: ['KKonaClap'],
  maxAge: 24 * 60 * 60 * 1000
}));

const urlDatabase = {};
const users = {};

const generateRandomString = () => Math.random().toString(36).substring(7);

const updateURL = (shortURL, longURL, userID) => {
  databaseObj = {
    'longURL': longURL,
    'userID': userID
  }
  return urlDatabase[shortURL] = databaseObj;
};

const addUsers = (userObject, randomId) => {
  const newUser = {
    id: randomId,
    email: userObject.email,
    password: bcrypt.hashSync(userObject.password, 10)
  }
  users[randomId] = newUser;

  return [users, randomId];
};

const emailAlreadyUsed = (users, emailToVerify) => {
  for (const findEmail in users) {
    if (emailToVerify === users[findEmail].email) {
      return true;
    }
  }
  return false;
};

const comparePasswords = (users, passwordToVerify) => {
  for (const findPassword in users) {
    if (bcrypt.compareSync(passwordToVerify, users[findPassword].password)) {
      return true;
    }
  }
  return false;
};

const findEmailMatchingId = (users, Email) => {
  for (const findId in users) {
    if (Email === users[findId].email) {
      return users[findId].id;
    }
  }
};

const urlsForUser = id => {
  let longURLS = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      longURLS[shortURL] = urlDatabase[shortURL]
    }
  }
  return longURLS;
};

const findUserIDWithShortURL = id => {
  for (const shortURL in urlDatabase) {
    if (shortURL === id) {
      return urlDatabase[shortURL].userID
    }
  }
  return false
}

const checkIfIdExist = randomID => {
  for (const shortURL in urlDatabase) {
    if (shortURL === randomID) {
      return true;
    }
  }
  return false;
}



app.get('/', (req, res) => {
  if (req.session.user_id) {
    res.status(302).redirect('urls');
  } else {
    res.status(302).redirect('/login');
  }
});

app.get('/u/:shortURL', (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.status(400).send('400: This short URL does not exist! <a href=/urls><button type="submit" class="btn btn-link">Your URLs</button></a>')
  }
  res.status(302).redirect(urlDatabase[req.params.shortURL].longURL);
});

app.get('/hello', (req, res) => {
  res.status(200).send('<html><body>Hello <b>World</b></body></html>\n');
});

app.get('/urls', (req, res) => {
  if (req.session.user_id) {
    const templateVars = {
      users: users,
      user: req.session.user_id,
      usersURL: urlsForUser(req.session.user_id)
    };
    res.status(200).render('urls_index', templateVars);
  } else {
    res.status(302).redirect('/login')
  }
});

app.post('/urls', (req, res) => {
  // generate a random number, create a key-value in urlDatabase with the number as key and  the long URL (request) as value
  if (!req.session.user_id) {
    res.status(403).send('403: Please login first <a href=/login><button type="submit" class="btn btn-link">Login</button></a>')
  } else {
    const rand_url = generateRandomString();
    updateURL(rand_url, req.body.longURL, req.session.user_id);
    res.status(302).redirect(`/urls/${rand_url}`);
  }
});


app.get('/register', (req, res) => {
  const templateVars = {
    users: users,
    user: req.session.user_id
  };
  res.status(200).render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  const randomId = generateRandomString();
  if (req.body.email && req.body.password) {
    if (emailAlreadyUsed(users, req.body.email)) {
      res.status(400).send('400 : Email already used <a href=/register><button type="submit" class="btn btn-link">Try again</button></a>');
    } else {
      addUsers(req.body, randomId);
      req.session.user_id = randomId;
      res.status(302).redirect('/urls');
    }
  } else {
    res.status(400).send('400 : Please enter an email and a password <a href=/register><button type="submit" class="btn btn-link">Try again</button></a>');
  }
})

app.get('/login', (req, res) => {

  const templateVars = {
    users: users,
    user: req.session.user_id
  };
  res.status(200).render('urls_login', templateVars)
});

app.post('/login', (req, res) => {
  if (!emailAlreadyUsed(users, req.body.email)) {
    res.status(403).send('403: Email cannot be found <a href=/login><button type="submit" class="btn btn-link">Try again</button></a>');
  }
  if (!comparePasswords(users, req.body.password)) {
    res.status(403).send('403: Wrong password <a href=/login><button type="submit" class="btn btn-link">Try again</button></a>');
  } else {
    req.session.user_id = findEmailMatchingId(users, req.body.email);
    res.status(302).redirect('/urls');
  }
});

app.get('/urls/new', (req, res) => {
  const templateVars = {
    user: req.session.user_id,
    users: users
  };
  //if not logged in
  if (!req.session.user_id) {
    res.status(302).redirect('/login');
  }
  res.status(200).render('urls_new', templateVars);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});


app.get('/urls/:shortURL', (req, res) => {
  if (!checkIfIdExist(req.params.shortURL)) {
    res.status(404).send('404: Not found ;) <a href=/urls><button type="submit" class="btn btn-link">Your URLs</button></a>')
  }
  if (!req.session.user_id) {
    res.status(403).send('403: Please login first <a href=/login><button type="submit" class="btn btn-link">Login</button></a>')
  }
  if (findUserIDWithShortURL(req.params.shortURL) !== req.session.user_id) {
    res.status(403).send('403: You do not own this short URL! <a href=/urls><button type="submit" class="btn btn-link">Your URLs</button></a>')
  } else {
    const templateVars = {
      shortURL: req.params.shortURL,
      longURL: urlDatabase[req.params.shortURL].longURL,
      users: users,
      user: req.session.user_id
    };
    res.status(200).render('urls_show', templateVars);
  }
});

app.post('/urls/:shortURL', (req, res) => { //what does it do?

  if (req.session.user_id === urlDatabase[req.params.shortURL].userID) {
    updateURL(req.params.shortURL, req.body.longURL, req.session.user_id);
    res.status(302).redirect('/urls');
  } else {
    res.status(302).redirect('/login');
  }
});

app.post('/urls/:shortURL/delete', (req, res) => {
  // if the user ID in the link is the same as the current user ID, allow to delete
  if (req.session.user_id === urlDatabase[req.params.shortURL].userID) {
    delete urlDatabase[req.params.shortURL];
    res.status(302).redirect('/urls');
  } else {
    res.status(403).send('403: Please login first <a href=/login><button type="submit" class="btn btn-link">Login</button></a>')
  }
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.status(302).redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});