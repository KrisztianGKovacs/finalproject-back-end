const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex')

const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: 'postgres',
        password: 'test',
        database: 'smart-brain'
    }
});


const app = express();
// Nem mindegy a sorrend, először express, aztán body

app.use(bodyParser.json());


app.get('/', (req, res)=> {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.send('success');
})

app.post('/login', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    const {email, password} = req.body;
    if(!email || !password) {
        return res.status(400).json('incorrect form submission');
     }

    db.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if (isValid){
            return db.select('*').from('users')
            .where('email', '=', req.body.email)
            .then(user => {
                res.json(user[0])
            })
            .catch(err => res.status(400).json('unable to get user'))
        } else {
        res.status(400).json('wrong credentials')
        }

        })
        .catch(err => res.status(400).json('wrong credentials') )
})

app.post('/register', (req,res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    const { email, name, password } = req.body;
    if(!email || !name || !password) {
       return res.status(400).json('incorrect form submission');
    }
    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .returning('*')
            .insert({
            email: loginEmail[0].email,
            name: name,
            joined: new Date()
            }).then(user => {
            res.json(user[0]);
            }) 
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    
        .catch(err => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    const { id } = req.params;
    db.select('*').from('users').where({id})
    .then(user => {
        if(user.lenght){
        res.json(user[0]);
        } else {
            res.status(400).json('Not found')
        }
    })
    .catch(err => res.status(400).json('Not found'))  
})

app.put('/image', (req,res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0].entries);
    })
    .catch(err => res.status(400).json('unable to get entries'))
} )



// Load hash from your password DB.
/*bcrypt.compare("bacon", hash, function(err, res) {
    // res == true
});
bcrypt.compare("veggies", hash, function(err, res) {
    // res = false
});*/
app.use(cors({
    origin: 'http://localhost:3001',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));


app.listen(3000, () => {
    console.log('App is running on port 3000');
});
