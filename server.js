const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai = require('clarifai');

const db = knex({
  client: 'mysql',
  connection: {
    host : '127.0.0.1',
    user : '',
    password : '',
    database : ''
  }
});

const api = new Clarifai.App({
 apiKey: '7109bda60779429fb587a65ef636a55d'
});

const app = express();

app.use(cors())
app.use(bodyParser.json());

app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) {
    return res.status(400).jsin('Wrong credentials!');
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if(!email || !name || !password) {
    return res.status(400).jsin('Incorrect form submission');
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        email: email,
        hash: hash
      })
      .into('login')
      .then(loginEmail => {
        return trx('users')
          .insert({
            email: email,
            name: name,
          })
          .then(user => {
            res.json(user[0]);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.send(err))
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0]);
  })
  .catch(err => res.status(400).json('unable to get entries'))
})

app.post('/imagedemo', (req,res) => {
  api.models.predict(Clarifai.DEMOGRAPHICS_MODEL,req.body.input)
  .then(imgData => {
    res.json(imgData);
  })
  .catch(err => res.status(400).json('unable to work with api'))
})

app.post('/imageface', (req,res) => {
  api.models.predict(Clarifai.FACE_DETECT_MODEL,req.body.input)
  .then(imgData => {
    res.json(imgData);
  })
  .catch(err => res.status(400).json('unable to work with api'))
})

app.listen(5000, ()=> {
  console.log('app is running on port 5000');
})
