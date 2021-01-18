const {Telegraf} = require ('telegraf')
const {MenuTemplate, MenuMiddleware} = require('telegraf-inline-menu')

// passort core
const passport = require('passport');
//passport strategy
const LocalStrategy = require('passport-local').Strategy;
const fetch = require('node-fetch')
const cors = require('cors')
cors({credentials: true, origin: true})

const AWS = require('aws-sdk');
const fs = require('fs')
var multer = require('multer');
var multipart = multer({dest: 'uploads/'});
const secureEnv = require('secure-env')
global.env = secureEnv({secret:'mySecretPassword'})
const TOKEN_SECRET = global.env.TOKEN_SECRET || 'secret'
AWS.config.credentials = new AWS.SharedIniFileCredentials('lol-bucket');
const endpoint = new AWS.Endpoint('ams3.digitaloceanspaces.com');
const s3 = new AWS.S3({
    endpoint: endpoint,
    // accessKeyId: config.accessKeyId || process.env.ACCESS_KEY,
    // secretAccessKey: config.secretAccessKey|| process.env.SECRET_ACCESS_KEY
    accessKeyId: global.env.accessKeyId,
    secretAccessKey: global.env.secretAccessKey

});

const morgan = require('morgan')
const express = require('express');
const mysql = require('mysql2/promise')
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000
const jwt = require('jsonwebtoken')
const app = express();

app.use(cors())

const SQL_COUNT_DISTINCT_COUNTRIES = 'SELECT country, count(*) FROM favouritewines WHERE username = ? GROUP BY country order by count(*) desc;'
const SQL_SAVE_WINE = 'insert into favouritewines (wineID, wineName, country, userName, digitalOceanKey ) values (?,?,?,?, ?);'
const SQL_SELECT_ALL_FROM_FAVOURITES_WHERE_USERNAME = 'select * from favouritewines where userName = ?;'
const SQL_SELECT_ALL_FROM_FAVOURITES_WHERE_ID = 'select * from favouritewines where ID = ?;'
const SQL_SELECT_ALL_FROM_FAVOURITES = 'select * from favouritewines;'
const SQL_SELECT_ALL_FROM_USERS = 'select * from users;'
const SQL_DELETE_FAVOURITE_WINE = 'delete from favouritewines where ID = ?;'
const SQL_DELETE_USER = 'delete from users where userName = ?;'
const SQL_ADD_TO_USERS = 'insert into users (userName, password) values (?, sha(?));'

const s3delete = function (params) {
    return new Promise((resolve, reject) => {
        s3.createBucket({
            Bucket: 'lol-bucket'        /* Put your bucket name */
        }, function () {
            s3.deleteObject(params, function (err, data) {
                if (err) console.log(err);
                else
                    console.log(
                        "Successfully deleted file from bucket"
                    );
                console.log(data);
            });
        });
    });
};

const VisualRecognitionV3 = require('ibm-watson/visual-recognition/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
const visualRecognition = new VisualRecognitionV3({
    version: '2018-03-19',
    authenticator: new IamAuthenticator({
      apikey: global.env.IBM_API_KEY,
    }),
    url: 'https://api.kr-seo.visual-recognition.watson.cloud.ibm.com/instances/e0cb1977-6d5e-4ad9-87a1-d977c63477e6',
  });

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
            const [ result, _ ] = await conn.query( 'select userName from users where userName = ? and password = sha1(?)', [username, password],)

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
        // host: process.env.DB_HOST || 'localhost',
        // port: parseInt(process.env.DB_PORT) || 3306,
        // database: 'lol',
        // user: global.env.DB_USER || process.env.DB_USER,
        // password: global.env.DB_PASSWORD || process.env.DB_PASSWORD,
        // connectionLimit: 4

        host: global.env.MYSQL_SERVER,
        port: global.env.MYSQL_SVR_PORT,
        database: 'lol',
        user: global.env.DO_USER || process.env.DO_USER,
        password: global.env.DO_PASSWORD || process.env.DO_PASSWORD,
        connectionLimit: 4,
        sslmode: 'REQUIRED' 
})

// Web socket
const expressWS = require('express-ws')
const ROOM = {}
const appWS = expressWS(app)

// Imports the Google Cloud client libraries
const vision = require('@google-cloud/vision');

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

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
  });

app.options('/login', function(req, res, next){
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header("Access-Control-Allow-Headers", "accept, content-type");
    res.header("Access-Control-Max-Age", "1728000");
    return res.sendStatus(200);
 });

 app.use(function (req, res, next) {
    /*var err = new Error('Not Found');
     err.status = 404;
     next(err);*/
  
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
  
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers,X-Access-Token,XKey,Authorization');
  
  //  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
    // Pass to next layer of middleware
    next();
});

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
                iss: 'LOL',
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

// adhoc auth check
app.get('/protected/secret',
    (req, resp, next) => {
        // check if the request has 'authorization' header
        const auth = req.get('Authorization')
        if (null == auth){
            console.info('Missing authorization access')
            resp.status(403)
            resp.json({message: 'Missing authorization access'})
            return
        }

        // check for bearer type auth
        const terms = auth.split(' ')
        if (terms.length != 2 || terms[0] != 'Bearer'){
            console.info('Incorrect authorization access')
            resp.status(403)
            resp.json({message: 'Incorrect authorization access'})
            return
        }
        
        const token = terms[1]
        
        token.exp
        try{
            const verified = jwt.verify(token, TOKEN_SECRET)
            req.token = verified
            next()
        } 
        catch(e){
            console.info('Incorrect token')
            resp.status(403)
            resp.json({message: 'Incorrect token', error: e})
           return
        }
    },

    (req, resp) => {
        console.info('Token valid')
        resp.status(200)
        resp.json({message: 'Token valid', status: 200})
    }
)

app.get('/searchResults/', async (req, resp) => {

    const searchText = req.query['wineName']
    const skip = req.query['offset']
    const limit = req.query['limit']
    try{
        const result = await fetch(`https://quiniwine.com/api/pub/wineKeywordSearch/${searchText}/${skip}/${limit}`, {
            headers: {
                'Authorization': 'Bearer ' + global.env.QUINI_API_KEY
            }
        }
        ) 

        console.info('Quini status ', result.status)
        if (result.status == 200){
            const quiniapiresult =  await result.json() 
            resp.status(200)
            resp.type('application/json')
            resp.json(quiniapiresult)    
        } 
        // if API server is down, return hardcoded info
        else{
            resp.status(200)
            resp.type('application/json')
            resp.json(
                    {
                        "nextskip": 10,
                        "category": "ROSES",
                        "items": [
                            {
                                "_id": "54566e1d65ade0020000001f",
                                "id": "54566e1d65ade0020000001f",
                                "Name": "Yellow Tail",
                                "Winery": "Bollinger",
                                "Area": "Champagne",
                                "Province": "",
                                "Country": "France",
                                "Varietal": "Pinot Noir, Chardonnay",
                                "vintage": "2000",
                                "Style": "",
                                "Type": "Rose"
                            },
                            {
                                "_id": "54566e1d65ade0020000001f",
                                "id": "54566e1d65ade0020000001f",
                                "Name": "Frontera",
                                "Winery": "Bollinger",
                                "Area": "Champagne",
                                "Province": "",
                                "Country": "France",
                                "Varietal": "Cabernet Sauvignon",
                                "vintage": "2014",
                                "Style": "",
                                "Type": "Rose"
                            },
                            {
                                "_id": "54566e1d65ade0020000001f",
                                "id": "54566e1d65ade0020000001f",
                                "Name": "Frontera",
                                "Winery": "Bollinger",
                                "Area": "Champagne",
                                "Province": "",
                                "Country": "France",
                                "Varietal": "Special",
                                "vintage": "2013",
                                "Style": "",
                                "Type": "Rose"
                            }
                ]}    
            )
        }

    }
    catch(e){
        console.info(e)
    }

})

app.get('/getWineDetails/:wineID', async (req, resp) => {

    const wineID = req.params['wineID']
    try{
        const result = await fetch(`https://quiniwine.com/api/pub/wineSummary.json?wine_id=${wineID}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + global.env.QUINI_API_KEY
            }
        }
        )

        if(result.status == 200){
            const wineDetailsResult = await result.json()
            resp.status(200)
            resp.type('application/json')
            resp.json(wineDetailsResult)    
        }
        // return hardcoded info if server is down
        else{
            resp.status(200)
            resp.type('application/json')
            resp.json(  {
                "aggregate": {
                  "scoreAvg": [
                    100,//Eye score
                    88.33333333333333,//Nose score
                    93.33333333333333,//Mouth score
                    93.66666666666667,//Finish score
                    91//Overall score
                  ],
                "wine": {
                  "id": "53ab5f2adab5f0020000001f",
                  "Name": "Prima Perla Prosecco NV",
                  "Winery": "Prima Perla",
                  "vintage": "nv",
                  "Country": "Italy ",
                  "Area": "Veneto ",
                  "Style": "",
                  "Varietal": "Glera ",
                  "Type": "White"
                },
                  "count": 3//Total review number of this wine
                },
                "agg_summary": {
                  "textReviews": {
                    "eye": "Clear rim, Clear depth",
                    "nose": "Citrus, Fruity, Floral aromas",
                    "mouth": "Melon, Grapefruit, Citrus, Fruity, Orange Blossom, Floral flavours, Fresh sweetness, Fresh acidity, Rich tannins, Mild alcohol",
                    "finish": "Medium duration, Good quality, Early peaktime",
                    "overall": "Simple complexity, Pleasant interest, Expected typicity, Harmonious balance"
                  }
                }
              }
            )
        }

    }
    catch(e){
        console.info(e)
    }

})

app.post('/saveWine', multipart.single('image-file'),
    async (req, resp) => {
        
        const wineID = req.query.wineID;
        const userName = req.query.userName;
        const wineName = req.query.wineName
        const country = req.query.country

        const digitalOceanKey = req.file?.filename
        
        const conn = await pool.getConnection()
        try {

            await conn.beginTransaction() // to prevent only one DB from being updated
    
            // post to digital ocean
            if (req.file != null){

                fs.readFile(req.file.path, async (err, imgFile) => {
                
                    const params = {
                        Bucket: 'lol-bucket',
                        Key: req.file.filename,
                        Body: imgFile,
                        ACL: 'public-read',
                        ContentType: req.file.mimetype,
                        ContentLength: req.file.size,
                        Metadata: {
                            originalName: req.file.originalname,
                            author: 'alvin',
                            update: 'image',
                        }
                    }
                    // post to digital ocean continued
                    s3.putObject(params, (error, result) => {
        
                        // return resp.status(200)
                        // .type('application/json')
                        // .json({ 'key': req.file.filename });
                    })
                })
            }
            // post to SQL
            await conn.query(
                SQL_SAVE_WINE, [wineID, wineName, country, userName, digitalOceanKey],
            )

            await conn.commit()
    
            resp.status(200)
            resp.json()
    
        } catch(e) {


            // delete image from digital ocean
            const params2 = {
                Bucket: 'lol-bucket',   
                Key: req.file.filename               
              };

            s3delete(params2)

            conn.rollback()
            resp.status(500).send(e)
            resp.end()

        } finally {
            conn.release()
        }

    }    
);

app.get('/favourites/:userName', async (req, resp) => {

	const userName = req.params.userName
	const conn = await pool.getConnection()
	try {
		const [ result, _ ] = await conn.query(SQL_SELECT_ALL_FROM_FAVOURITES_WHERE_USERNAME, [userName])
		resp.status(200)
		resp.type('application/json').send(result)
	} catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
		conn.release()
	}
})

app.get('/favourites', async (req, resp) => {

	const conn = await pool.getConnection()
	try {
		const [ result, _ ] = await conn.query(SQL_SELECT_ALL_FROM_FAVOURITES)
		resp.status(200)
		resp.type('application/json').send(result)
	} catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
		conn.release()
	}
})

app.get('/users', async (req, resp) => {

	const conn = await pool.getConnection()
	try {
		const [ result, _ ] = await conn.query(SQL_SELECT_ALL_FROM_USERS)
		resp.status(200)
		resp.type('application/json').send(result)
	} catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
		conn.release()
	}
})

app.get('/countryCount/:userName', async (req, resp) => {

	const userName = req.params.userName
	const conn = await pool.getConnection()
	try {
		const [ result, _ ] = await conn.query(SQL_COUNT_DISTINCT_COUNTRIES, [userName])
		resp.status(200)
		resp.type('application/json').send(result)
	} catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
		conn.release()
	}
})

app.post('/deleteSavedWine',
    async (req, resp) => {

        const ID = req.body.ID

        const conn = await pool.getConnection()
        try {
            await conn.beginTransaction() // to prevent only one DB from being updated
            const [ result, _ ] = await conn.query(SQL_SELECT_ALL_FROM_FAVOURITES_WHERE_ID, [ID])


            // delete image from digital ocean
            const params2 = {
                Bucket: 'lol-bucket',   
                Key: result[0].digitalOceanKey               
              };

            s3delete(params2)

            // delete from SQL
            await conn.query(
                SQL_DELETE_FAVOURITE_WINE, [ID],
            )

            await conn.commit()

            resp.status(200)
            resp.json()
        }


        catch(e) {
            conn.rollback()
            resp.status(500).send(e)
            resp.end()

        } finally {
            conn.release()
        }

    }    
);

app.post('/deleteUser',
    async (req, resp) => {

        const userName = req.body.userName

        const conn = await pool.getConnection()
        try {
            await conn.beginTransaction() // to prevent only one DB from being updated

            // delete from SQL
            await conn.query(
                SQL_DELETE_USER, [userName],
            )

            await conn.commit()

            resp.status(200)
            resp.json()
        }
        catch(e) {
            conn.rollback()
            resp.status(500).send(e)
            resp.end()

        } finally {
            conn.release()
        }
    }    
);

app.post('/createAccount',
    async (req, resp) => {

        const newUsername = req.body.username
        const newPassword = req.body.password

        const conn = await pool.getConnection()
        try {
            await conn.beginTransaction() // to prevent only one DB from being updated
            const [ result, _ ] = await conn.query(SQL_ADD_TO_USERS, [newUsername, newPassword])

            await conn.commit()

            resp.status(200)
            resp.json()
        }
        catch(e) {
            
            conn.rollback()
            resp.status(500)
            resp.send(e)
            resp.end()

        } finally {
            conn.release()
        }
    }    
);

// google image recognition
app.post('/uploadPictureRecognition', multipart.single('image-file'),
    async (req, resp) => {
        try {
            // post to digital ocean
            if (req.file != null){

                await fs.readFile(req.file.path, async (err, imgFile) => {      
                    
                    // Google Vision image recognition
                    const client = new vision.ImageAnnotatorClient();
                    const [result3] = await client.textDetection(imgFile);
                    console.info('Google image error status: ', [result3.error])

                    if (result3.error == null){
                        const detections = result3.textAnnotations;
                        resp.status(200)
                        resp.json({ type: 'google', response: detections[0]})    
                    }
                    // if google fails, run IBM image recognition
                    else{
                        const classifyParams = {
                            // url: 'https://picturerecognition.ams3.digitaloceanspaces.com/'+digitalOceanKey,
                            imagesFile: imgFile,
                            owners: ['me'],
                            threshold: 0.7,
                            classifierIds: ['food'],
                        };
                        visualRecognition.classify(classifyParams)
                        .then((response) => {
                            const classifiedImages = response.result;
                            console.log(JSON.stringify(classifiedImages, null, 2));
                            resp.status(200)
                            resp.json({type: 'ibm', response: response})
                        })
                        .catch(err => {
                            console.log('error:', err);
                        });   
                    }
                })
            }
        } 
        catch(e) {
            resp.status(500).send(e)
            resp.end()
        } 
    }    
);

// ibm image recognition
// app.get('/IbmPictureRecognition/:digitalOceanKey', async (req, resp) => {

//     const digitalOceanKey = req.params['digitalOceanKey']
//     // IBM watson pic recognition
//     const classifyParams = {
//         url: 'https://picturerecognition.ams3.digitaloceanspaces.com/'+digitalOceanKey,
//         owners: ['me'],
//         threshold: 0.7,
//         classifierIds: ['food'],
//     };
    
//     visualRecognition.classify(classifyParams)
//     .then((response) => {
//         const classifiedImages = response.result;
//         console.log(JSON.stringify(classifiedImages, null, 2));
//         resp.json(response)
//     })
//     .catch(err => {
//         console.log('error:', err);
//     });   
// })

// app.get('/googlePictureRecognition/:digitalOceanKey', async (req, resp) => {

//     const digitalOceanKey = req.params['digitalOceanKey']

//     // Google Vision pic recognition

//     const client = new vision.ImageAnnotatorClient();

//     const [result] = await client.textDetection('https://picturerecognition.ams3.digitaloceanspaces.com/'+digitalOceanKey);

//     console.info([result])
//     const detections = result.textAnnotations;
//     // console.log('Text:');
//     // detections.forEach(text => console.log(text));

//     resp.json(detections[0])
// })


//create a bot


const bot = new Telegraf(global.env.TELEGRAM_TOKEN)

// when a user starts a session with the bot
bot.start(ctx => {
    ctx.reply('Welcome to Wine Bot. Type /wine <wine name> to begin')
})

bot.hears('hi', ctx => ctx.reply ('Hi there! Type /wine <wine name> to begin'))

bot.command('wine', async ctx => {

    const wine = ctx.message.text.substring(6)

    // display the menu if no wineName is specified with the command
    if (wine.length>=0){
        fetchWine(wine, ctx)
    }
})

const fetchWine = async (wine, ctx) => {

    ctx.reply(`Retrieving top 3 search results for "${wine}"`)

    const result = await fetch(`https://quiniwine.com/api/pub/wineKeywordSearch/${wine}/0/3`, {
        headers: {
            'Authorization': 'Bearer ' + global.env.QUINI_API_KEY
        }
    }) 

    const quiniapiresult =  await result.json() 

    // the below works to move certain elements from an array to a new array
    const results = quiniapiresult.items.map(              //length of new array will be the same
                (d)=> {
                    return {wineID: d.id, name: d.Name, country: d.Country, varietal: d.Varietal, vintage: d.vintage, type: d.Type}          
                }
    )

    var wineDetailsArray = []
    for(var i=0; i < results.length; i++) {

        const result = await fetch(`https://quiniwine.com/api/pub/wineSummary.json?wine_id=${results[i].wineID}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + global.env.QUINI_API_KEY
            }
        }) 
        const wineDetailsResult = await result.json()
        wineDetailsArray.push(wineDetailsResult)
    }

    for(var i=0; i < results.length; i++) {
        ctx.reply(
            results[i].name +" "+ results[i].varietal+ '\n\n' 
            + "Country: " + results[i].country + '\n' 
            + "Year: " + results[i].vintage + '\n' 
            + "Type: " + results[i].type + '\n' 
            + "Score: " + wineDetailsArray[i].aggregate?.scoreAvg[0] + '\n'
            + "Description: " + wineDetailsArray[i].agg_summary?.textReviews.mouth
        )
    }
}

bot.use((ctx, next) => {
    if (ctx.callbackQuery != null) {
        const wine = ctx.callbackQuery.data.substring(1)
        return fetchWine(wine, ctx)
    }
    next()
})

bot.on('text', ctx => ctx.reply("I'm sorry. I don't understand. Type '/wine <wine name>' to search for wine information"));

// start the bot
bot.launch()


// websocket
app.ws('/chat', (ws, req) => {
    const name = req.query.name
    console.info(`New webscoket connection: ${name}`)
    // add the web socket connection to the room
    ws.particpantName = name
    ROOM[name] = ws

    const chat = JSON.stringify({
        from: name,
        message: 'is in the houzzz!',
        timeStamp: (new Date()).toString()
    })

    for (let p in ROOM) {
        ROOM[p].send(chat)
    }

    // construct the received message and broadcast back out
    ws.on('message', (payload) => {

        const chat = JSON.stringify({
            from: name,
            message: payload,
            timeStamp: (new Date()).toString()
        })

        // loop through all active websocket subscriptions and push them the message
        for (let p in ROOM) {
            ROOM[p].send(chat)
        }
    })

    ws.on('close', ()=>{
        console.info(`Closing connection for ${name}`)

        ROOM[name].close()
        // remove name from the room
        delete ROOM[name]
    })

})

app.use(
    express.static(__dirname + '/static')
)

app.use(express.static ( __dirname + '/browser'))