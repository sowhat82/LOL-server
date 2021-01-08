// passort core
const passport = require('passport');
//passport strategy
const LocalStrategy = require('passport-local').Strategy;

const morgan = require('morgan')
const express = require('express');
const mysql = require('mysql2/promise')
const secureEnv = require('secure-env')
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000
const jwt = require('jsonwebtoken')
global.env = secureEnv({secret:'mySecretPassword'})
const TOKEN_SECRET = global.env.TOKEN_SECRET || 'secret'
const app = express();

app.use(morgan('combined'))
app.use (express.json())
app.use(express.urlencoded({extended:true}))

// initialize passport only afer json and form-urlencoded
app.use(passport.initialize())

passport.use(
    new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // to be able to use req below to obtain more information from the request
        },
        async (req, username, password, done) => {
            // perform authentication
            const conn = await pool.getConnection()
            const [ result, _ ] = await conn.query( 'select user_id from user where user_id like ? and password like sha1(?)', [username, password],)

            console.info('result', result.length)
            if (result.length) {

                authResult = true
            }
            else {
                authResult = false
            }

            if(authResult){
                done(null,
                    // info about the user
                    {
                        username: username,
                        loginTime: new Date().toString(),
                    }    
                )    
                return
            }
            // incorrect login
            done ('Incorrect username and password', false)
        }
    )
)

// create SQL connection pool
const pool = mysql.createPool({
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT) || 3306,
	database: 'paf2020',
	user: global.env.DB_USER || process.env.DB_USER,
	password: global.env.DB_PASSWORD || process.env.DB_PASSWORD,
	connectionLimit: 4
})

const startApp = async (app, pool) => {
	const conn = await pool.getConnection()
	try {
		console.info('Pinging database...')
		await conn.ping()

        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)        
        })

    } catch(e) {
		console.error('Cannot ping database', e)
	} finally {
		conn.release()
	}
}

// start the app
startApp(app, pool)

app.post('/login', 
// passport.authenticate('local', {session: false}),
    (req, resp, next)=>{
        const func = passport.authenticate('local',
            (err, user, info)=>{
                if (null != err || !user) {
                    resp.status(401)
                    resp.json({error: err})
                    console.info(err)
                    return
                }
                // attach user to request object
                req.user = user
                next()  // call the next middleware if there's no error
            }
        ) 
        func(req, resp, next)
    },
    (req, resp)=> {
        // do something
        const currTime = (new Date()).getTime()/1000

        console.info( currTime)
        // generate JWT token
        const token = jwt.sign(
            {
                sub: req.user.username,
                iss: 'myapp',
                iat: currTime,
                exp: currTime + (60 * 60), // token expiring in x seconds
                data: {
                    avatar: 'your avatar',
                    loginTime: req.user.loginTime
                }
            },
            TOKEN_SECRET
        )

        resp.status(200)
        resp.type('application/json')
        resp.json({message: 'login on this date', token})
    }
)