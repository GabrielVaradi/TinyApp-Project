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
  for (const shortURL in urlDatabase){
    console.log(shortURL)
    console.log(id)
    if(shortURL === id){
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
    res.redirect('urls');
  } else {
    res.redirect('/login');
  }
});

app.get('/u/:shortURL', (req, res) => {
  res.redirect(urlDatabase[req.params.shortURL]);
});

app.get('/hello', (req, res) => {
  res.send('<html><body>Hello <b>World</b></body></html>\n');
});

app.get('/urls', (req, res) => {
  if (req.session.user_id) {
    const templateVars = {
      users: users,
      user: req.session.user_id,
      usersURL: urlsForUser(req.session.user_id)
    };
    res.render('urls_index', templateVars);
  } else {
    res.redirect('/login')
  }
});

app.post('/urls', (req, res) => {
  // generate a random number, create a key-value in urlDatabase with the number as key and  the long URL (request) as value
  const rand_url = generateRandomString();
  updateURL(rand_url, req.body.longURL, req.session.user_id);
  res.redirect(`/urls/${rand_url}`);
});


app.get('/register', (req, res) => {
  const templateVars = {
    users: users,
    user: req.session.user_id
  };
  res.render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  const randomId = generateRandomString();
  if (req.body.email && req.body.password) {
    if (emailAlreadyUsed(users, req.body.email)) {
      res.send('400 : Email already used');
    } else {
      addUsers(req.body, randomId);
      req.session.user_id = randomId;
      res.redirect('/urls');
    }
  } else {
    res.send('400 : Enter a email and a password');
  }
})

app.get('/login', (req, res) => {

  const templateVars = {
    users: users,
    user: req.session.user_id
  };
  res.render('urls_login', templateVars)
});

app.post('/login', (req, res) => {
  if (!emailAlreadyUsed(users, req.body.email)) {
    res.send('403: Email cannot be found');
  }
  if (!comparePasswords(users, req.body.password)) {
    res.send('403: Wrong password');
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
    res.redirect('/login');
  }
  res.render('urls_new', templateVars);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});


app.get('/urls/:shortURL', (req, res) => {
  if (!checkIfIdExist(req.params.shortURL)) {
    res.send('404 Not found ;)')
  }
  if (!req.session.user_id) {
    res.send('Please login first')
  }
  if (findUserIDWithShortURL(req.params.shortURL) !== req.session.user_id) {
    res.send('You do not own this short URL!')
  } else {
    const templateVars = {
      shortURL: req.params.shortURL,
      longURL: urlDatabase[req.params.shortURL].longURL,
      users: users,
      user: req.session.user_id
    };
    res.render('urls_show', templateVars);
  }
});

app.post('/urls/:shortURL', (req, res) => { //what does it do?

  if (req.session.user_id === urlDatabase[req.params.shortURL].userID) {
    updateURL(req.params.shortURL, req.body.longURL, req.session.user_id);
    res.status(302).redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

app.post('/urls/:shortURL/delete', (req, res) => {
  // if the user ID in the link is the same as the current user ID, allow to delete
  if (req.session.user_id === urlDatabase[req.params.shortURL].userID) {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  } else {
    res.redirect('/login')
  }
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.status(302).redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});