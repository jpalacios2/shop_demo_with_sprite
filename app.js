const https = require('https')
//core node modules
const path = require('path')
const fs = require('fs')
//project modules
const adminRoutes = require('./Routes/admin')
const shopRoutes = require('./Routes/shop')
const authRoutes = require('./Routes/auth')
const errorController = require('./controllers/error')

//Database objects for association
const mongoose = require('mongoose')

//Use process in node apps for environmental variables, it is part of the node core runtime - available globably
let mongoUri = `${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.aw3kw.mongodb.net/${process.env.MONGO_DEFAULT_DB}`

//3rd party modules
const express = require('express')
const bodyParser = require('body-parser')
const multer = require('multer')

//to secure headers
const helmet = require('helmet')

//to compress static files
const compression = require('compression')

//for logging/log file
const morgan = require('morgan')

//to create a hash
const crypto = require('crypto');
let nonce = crypto.randomBytes(16).toString('base64');

const fileStorage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null, 'images')
    },
    filename: (req,file,cb) =>{
        cb(null, Date.now() +'_prodName_'+req.body.productName+'_'+file.originalname)
    }
})

const fileFilter = (req, file, cb) =>{
 
    if( file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){

        // To accept the file pass `true`, like so:
        cb(null, true)
    }else{
        // To reject this file pass `false`, like so:
        cb(null, false)
        }

    // You can always pass an error if something goes wrong:
    //cb(new Error('I don\'t have a clue!'))
}


//Models
const User = require('./models/user') 

//for Sessions
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session)
const csrf = require('csurf')
const connectFlash = require('connect-flash')//initiliaze after session is initialized
const { request } = require('http')

//======INVOKE EXPRESS============
const app = express()
const store = new MongoDBStore({
    uri: mongoUri,
    collection: 'sessions'
})

const csrfProtection = csrf()

//will lock code exuction until the file is read
//const privateKey = fs.readFileSync('-server.key')
//const certificate = fs.readFileSync('server.cert')

app.set('view engine', 'ejs')
app.set('views','./views')//not necessary unless located elsewhere from default

//header security
app.use(helmet({
    contentSecurityPolicy: false
}))

//set headers to avoid CORS errors in browser
app.use((req,res,next)=>{

    if(nonce)req.nonce = nonce
    //script-src 'self'
    res.set({
         'Content-Security-Policy-Report-Only': 
            `script-src-elem 'self' 'nonce-${nonce}';`
    })

    if(req.method === 'OPTIONS')
    {
        return res.sendStatus(200)
    }
    next()
})

app.use(compression())

const accessLogStream = fs.createWriteStream(path.join(__dirname,'access.log'),{
    flags: 'a'//a = append new data to file instead of overriding
})

app.use(morgan('combined',{
    stream: accessLogStream
}))

app.use(bodyParser.urlencoded({extended: true}))

app.use(multer({
    storage: fileStorage,
    fileFilter: fileFilter
}).single('image'))//pass the same value of the input name that will hold the file

app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
}))
app.use(csrfProtection)//for any non get-request token is needed!
//pass data via request, make sure the execution order is correct!!!
app.use(connectFlash())
//extracting the user
app.use((request,response,next)=>{

    if(request.session.user)
    {
        const userId = request.session.user._id

        User.findById(userId)
        .then(u => {
            
            if(!u) return next()//incase user gets deleted after finging

            request.user = u
            next()
        })
        .catch(e => {
            throw new Error(e)
        })
    }else{
        return next()
    }
})
//pass data needed for all views, avoids having to do this for each render
app.use((request,response,next)=>{
    //for variables needed in the rendered views
    response.locals.isAuthenticated = request.session.isAuthenticated
    response.locals.csrfToken = request.csrfToken()
    next()
})
//routes/views
app.use('/admin',adminRoutes.adminRoutes)
app.use(shopRoutes)
app.use(authRoutes)

//to serve files statically
app.use(express.static(path.join(__dirname + '/public')))//for css and cliet side js
app.use('/images',express.static(path.join(__dirname + '/images')))//for image rendering

app.use('/500',errorController.get500Response)

//404 response
app.use(errorController.error404Response)

//error handling middleware, reached when calling next with an error as an arguement
//top to bottom handling when there are multiple
app.use((error,request,response,next)=>{
    console.log(error)
    
    response.redirect('/500')
})

mongoose.connect(mongoUri,{
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(()=>{
        console.log('connected to db')
        
        //let hosting manage ssl certifications
        /*
        https.createServer({
            key: privateKey,
            cert: certificate
            },app).listen(process.env.DEFAULT_PORT || '8080',()=>{
        })
        */
       if(process.env.DEFAULT_PORT)
       {
        app.listen(process.env.DEFAULT_PORT,()=>{
            console.log('running server')
        })
       }else{
        app.listen(5000,()=>{
            console.log('running server')
        })
       }
        
    })
    .catch(err => {console.log('CONNECTING TO DB ERROR!',err)})