const express = require('express');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const app = express();
const PORT = 8080;


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
const uniqueVisitors = {
  email: "userID"
};

const generateRandomString = () => Math.random().toString(36).substring(7);

const createShortURL = (longURL, userID, date, time) => {
  const shortURL = generateRandomString();
  databaseObj = {
    'longURL': longURL,
    'userID': userID,
    'date': date,
    'time': time,
    'visits': 0
  }
  urlDatabase[shortURL] = databaseObj;
  return shortURL;
};

const updateURL = (shortURL, longURL, userID, nbOfVisits) => {
  databaseObj = {
    'longURL': longURL,
    'userID': userID,
    'visits': nbOfVisits

  };
  return urlDatabase[shortURL] = databaseObj;
};

const addUsers = ({
  email,
  password
}) => {
  const randomId = generateRandomString();
  const newUser = {
    id: randomId,
    email: email,
    password: bcrypt.hashSync(password, 10)
  };
  users[randomId] = newUser;

  return randomId;
};


const findUser = (users, email) => {
  for (const findId in users) {
    if (email === users[findId].email) {
      return users[findId];
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

// const authenticate = (email, password) => {
//   const user = findUser(email);
//   if (user && bcrypt.compareSync(passwordToVerify, users[findPassword].password)) {
//     return user.id
//   }
//   return false
// }


const urlsForUniqueUser = id => {
  let uniqueUserURL = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      uniqueUserURL[shortURL] = urlDatabase[shortURL]
    }
  }
  return uniqueUserURL;
};

const findUserIDWithShortURL = id => {
  for (const shortURL in urlDatabase) {
    if (shortURL === id) {
      return urlDatabase[shortURL].userID
    }
  }
  return false
}

const checkIfShortURLExist = randomID => {
  for (const shortURL in urlDatabase) {
    if (shortURL === randomID) {
      return true;
    }
  }
  return false;
}

const getCreateDate = () => {
  const today = new Date()
  const dd = today.getDate();
  const mm = today.getMonth() + 1;
  const yyyy = today.getFullYear();

  return `${dd}/${mm}/${yyyy}`
}

const getCreateTime = () => {
  const today = new Date()
  const hours = today.getHours();
  const min = today.getMinutes();
  const sec = today.getSeconds();

  return `${hours} hours ${min} minutes and ${sec} seconds`
}

const incrementVisits = urlDatabase => {
  return urlDatabase.visits += 1
}

const updateUniqueVisitors = (email, userID) => {
  return uniqueVisitors[email] = userID
}

const incrementUniqueVisits = (email, userID) => {

  for (const emails in uniqueVisitors) {

    if (userID === uniqueVisitors[emails]) {
      return
    } else {
      updateUniqueVisitors(email, userID)
      return
    }
  }
}



app.get('/', (req, res) => {
  if (req.session.user_id) {
    res.status(302).redirect('urls');
  } else {
    res.status(302).redirect('/login');
  }
});

app.get('/u/:shortURL', (req, res) => {
  const {
    shortURL
  } = req.params;
  const {
    user_id
  } = req.session;
  if (!urlDatabase[shortURL]) {
    res.status(400).send('400: This short URL does not exist! <a href=/urls><button type="submit" class="btn btn-link">Your URLs</button></a>')
  }
  incrementUniqueVisits(user_id, users[user_id].email)
  incrementVisits(urlDatabase[shortURL])
  res.status(302).redirect(urlDatabase[shortURL].longURL);
});

app.get('/urls', (req, res) => {
  const {
    user_id
  } = req.session;
  if (user_id) {
    const templateVars = {
      user: users[user_id],
      usersURL: urlsForUniqueUser(user_id)
    };
    res.status(200).render('urls_index', templateVars);
  } else {
    res.status(302).redirect('/login')
  }
});

app.post('/urls', (req, res) => {
  const {
    user_id
  } = req.session;
  if (!user_id) {
    res.status(403).send('403: Please login first <a href=/login><button type="submit" class="btn btn-link">Login</button></a>')
  } else {
    const date = getCreateDate()
    const time = getCreateTime()
    const shortURL = createShortURL(req.body.longURL, user_id, date, time);
    res.status(302).redirect(`/urls/${shortURL}`);
  }
});


app.get('/register', (req, res) => {
  const {
    user_id
  } = req.session;
  if (!user_id) {
    const templateVars = {
      user: users[user_id]
    };
    res.status(200).render('urls_register', templateVars);
  } else {
    res.status(302).redirect('/urls')
  }
});

app.post('/register', (req, res) => {
  const {
    email,
    password
  } = req.body;

  if (email && password) {
    if (findUser(users, email)) {
      res.status(400).send('400 : Email already used <a href=/register><button type="submit" class="btn btn-link">Try again</button></a>');
    } else {
      const randomId = addUsers(req.body);
      req.session.user_id = randomId;
      res.status(302).redirect('/urls');
    }
  } else {
    res.status(400).send('400 : Please enter an email and a password <a href=/register><button type="submit" class="btn btn-link">Try again</button></a>');
  }
})

app.get('/login', (req, res) => {
  const {
    user_id
  } = req.session;

  if (!user_id) {
    const templateVars = {
      user: users[user_id]
    };
    res.status(200).render('urls_login', templateVars)
  } else {
    res.status(302).redirect('/urls')
  }
});


app.post('/login', (req, res) => {

  const {
    email,
    password
  } = req.body
  let user = findUser(users, email)
  if (!user) {
    res.status(403).send('403: Email cannot be found <a href=/login><button type="submit" class="btn btn-link">Try again</button></a>');
  }
  if (!comparePasswords(users, password)) {
    res.status(403).send('403: Wrong password <a href=/login><button type="submit" class="btn btn-link">Try again</button></a>');
  } else {
    req.session.user_id = user.id;
    res.status(302).redirect('/urls');
  }
});

app.get('/urls/new', (req, res) => {
  const {
    user_id
  } = req.session;
  const templateVars = {
    user: users[user_id]
  };

  if (!user_id) {
    res.status(302).redirect('/login');
  }
  res.status(200).render('urls_new', templateVars);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});


app.get('/urls/:shortURL', (req, res) => {
  const {
    shortURL
  } = req.params;
  const {
    user_id
  } = req.session;

  if (!checkIfShortURLExist(shortURL)) {
    res.status(404).send('404: Not found ;) <a href=/urls><button type="submit" class="btn btn-link">Your URLs</button></a>')
  }
  if (!user_id) {
    res.status(403).send('403: Please login first <a href=/login><button type="submit" class="btn btn-link">Login</button></a>')
  }
  if (findUserIDWithShortURL(shortURL) !== user_id) {
    res.status(403).send('403: You do not own this short URL! <a href=/urls><button type="submit" class="btn btn-link">Your URLs</button></a>')
  } else {
    const templateVars = {
      shortURL: shortURL,
      longURL: urlDatabase[shortURL].longURL,
      user: users[user_id],
      date: urlDatabase[shortURL].date,
      time: urlDatabase[shortURL].time,
      visits: urlDatabase[shortURL].visits,
      uniqueVisitors: Object.keys(uniqueVisitors).length - 1
    };

    res.status(200).render('urls_show', templateVars);
  }
});

app.post('/urls/:shortURL', (req, res) => {
  const {
    user_id
  } = req.session;
  const {
    shortURL
  } = req.params;
  if (user_id === urlDatabase[shortURL].userID) {

    updateURL(shortURL, req.body.longURL, user_id);
    res.status(302).redirect('/urls');
  } else {
    res.status(302).redirect('/login');
  }
});

app.post('/urls/:shortURL/delete', (req, res) => {
  const {
    shortURL
  } = req.params;
  if (req.session.user_id === urlDatabase[shortURL].userID) {
    delete urlDatabase[shortURL];
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