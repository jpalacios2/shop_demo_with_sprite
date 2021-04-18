const crypto = require('crypto')

const mongoose = require('mongoose')
const User = require('../models/user')
const {userSchema} = User
const bcrypt = require('bcryptjs')
const { localeCompare } = require('../util/path')

//for sending emails
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')

//for validation
const {validationResult} = require('express-validator')

let apiKeys = {
    //sendgrid_ApiKey: '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',
    sendinBlue_ApiKey: process.env.SENDINBLUE_KEY
}

//below is for SendinBlue
const SibApiV3Sdk = require('sib-api-v3-sdk');
let defaultClient = SibApiV3Sdk.ApiClient.instance;

let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = apiKeys.sendinBlue_ApiKey;

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

//below is for SendGrid, emails are getting blocked for some domains and limited to 100 daily
/*
const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: apiKeys.sendgrid_ApiKey
    }
}))
*/

/*
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey('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')
*/

exports.loginPage = (request, response, next)=>{
    
    response.render('auth/login',{
        path: '/login',
        pageTitle: 'login page',
        errorMessage: request.flash('error'),
        validationErrors: [],
        oldInput:{
            email: '',
            password: ''
        }
    })
}

exports.loginRedirect = (request,response,next) => {
    
    let userEmail = request.body.email
    let userPassword = request.body.password

    let errors = validationResult(request)

    if(!errors.isEmpty()){//if there is an error then return render with error message
        request.flash('error',errors.array()[0].msg)

        return response.status(422).render('auth/login',{
            pageTitle: 'login page',
            path: '/login',
            errorMessage: request.flash('error'),
            validationErrors: errors.array(),
            oldInput:{
                email: userEmail,
                password: userPassword
            }
        })
    }

    User.findOne({email: userEmail})
        .then(u => {
            if(!u){
                request.flash('error',"Account doesn't exist!")
                    return response.status(422).render('auth/login',{
                        pageTitle: 'login page',
                        path: '/login',
                        errorMessage: request.flash('error'),
                        validationErrors: [{param: 'email'}],
                        oldInput:{
                            email: userEmail,
                            password: userPassword
                        }
                    })
            }else{
                bcrypt.compare(userPassword, u.password)
                    .then(res => {
                        if(res){
                            //we have the correct password
                            request.session.isAuthenticated = true
                            request.session.user = u
                            
                            request.session.save((err)=>{//use for situations when timing is needed
                                if(!err){
                                    response.redirect('/')
                                }else{
                                    console.log(err)
                                }
                            })
                        }else{
                            request.flash('error','Incorrect Password!')
                            return response.status(422).render('auth/login',{
                                pageTitle: 'login page',
                                path: '/login',
                                errorMessage: request.flash('error'),
                                validationErrors: [{param: 'password'}],
                                oldInput:{
                                    email: userEmail,
                                    password: userPassword
                                }
                            })
                        }
                    })
            }
        })
}

exports.logOut = (request,response,next) => {
    request.session.destroy((err)=>{//use this instead of setting session data to null
        if(!err){
            response.redirect('/products')
        }else{
            console.log(err)
        }
            
    })
}

exports.registerNewAccount = (request,response,next) =>{
    response.render('auth/signup',{
        pageTitle: 'Registration page',
        path: '/register',
        errorMessage: request.flash('error'),
        oldInput: {
            email: "", 
            password: "",
            confirmPassword: ""
        },
        validationErrors: []
    })
}

exports.postRegistration = (request,response,next) => {

    let email = request.body.email
    let password = request.body.password
    let confirmPassword = request.body.confirmPassword
    let errors = validationResult(request)

    if(!errors.isEmpty()){//if no errors from the validation in routes the proceed, if not then return with message

        request.flash('error',errors.array()[0].msg)

        return response.status(422).render('auth/signup',{
            pageTitle: 'Registration page',
            path: '/register',
            errorMessage: request.flash('error'),
            oldInput: {
                email: email, 
                password: password,
                confirmPassword: confirmPassword
            },
            validationErrors: errors.array()
        })
    }
    
    if(password.localeCompare(confirmPassword) === 0){        
        bcrypt.hash(password, 12)
            .then(pw => {

                let newUser = new User(
                    {
                        userName: email,
                        email: email,
                        password: pw,
                        cart: {
                            cartItems: [],
                            cartTotal: 0
                        }
                    })

                newUser.save()
                    .then(()=>{

                        response.redirect('/')

                        sendSmtpEmail.subject = "Successful registration to JP's Node-Store";
                        sendSmtpEmail.htmlContent = "<html><body><h1>Thank you for joining JP's node store</h1></body></html>";
                        sendSmtpEmail.sender = {"name":"Node Store - Test Admin","email":"admin@reactivews.com"};
                        sendSmtpEmail.to = [{"email":email,"name":"none"}];
                        sendSmtpEmail.replyTo = {"email":"reactivewebsolutions@gmail.com","name":"Geo Admin"};

                        apiInstance.sendTransacEmail(sendSmtpEmail)
                            .then(()=>{})
                            .catch((e)=>{console.log('sending email error:',e.message)})
                    })
                    .catch(err=>{
                        const error = new Error(err.message)
                        error.httpStatusCode = 500
                        return next(error)
                    })
            })
    }else{
        console.log('pw not a match')
        request.flash('error','passwords do not match')
        response.status(422).render('auth/signup',{
            pageTitle: 'Registration page',
            path: '/register',
            errorMessage: request.flash('error')
        })
    }
}

exports.getReset =(request,response,next) =>{
    response.render('auth/reset',{
        pageTitle: 'Password Reset',
        path: '/reset',
        errorMessage: request.flash('error')
    })
}

exports.postReset =(request,response,next) =>{

    let email = request.body.email

    crypto.randomBytes(32, (err,buffer)=>{
        if(err){
            request.flash('error',err.message)
            return response.redirect('/reset')
        }

        //if no error, generate token from buffer
        let token = buffer.toString('hex')//pass 'hex' to convert hexidecimal to ASCII characters

        //Set token for specific user in DB
        User.findOne({email: email})
            .then((u)=>{
                if(!u){
                    request.flash('error','email not found')
                    return response.redirect('/reset')
                }

                u.resetToken = token
                u.resetTokenExpiration = Date.now() + 3600000//1 hour in milliseconds
                return u.save()
            })
            .then(()=>{
                response.redirect('/')
                //send reset email here
                sendSmtpEmail.subject = "Password reset for JP's Node-Store";
                sendSmtpEmail.htmlContent = `
                    <p>There was a password reset request made on ${Date(Date.now())}.</p>
                    <p>Click this <a href="http://localhost:8080/reset/${token}">link</a> to set a new password. (Link will expire in 1 hour)</p>
                `;
                sendSmtpEmail.sender = {"name":"Node Store - Test Admin","email":"admine@reactivews.com"};
                sendSmtpEmail.to = [{"email":email,"name":"none"}];
                sendSmtpEmail.replyTo = {"email":"reactivewebsolutions@gmail.com","name":"Geo Admin"};

                apiInstance.sendTransacEmail(sendSmtpEmail)
                    .then(() => {
                        //console.log('email sent:',JSON.stringify(emailResult))
                    })
                    .catch(e => {console.log('email error',e.message)})
            })
            .catch(err => {
                const error = new Error(err.message)
                error.httpStatusCode = 500
                return next(error)    
            })
    })
}

exports.getNewPassword = (request,response,next) =>{

    const token = request.params.token

    User.findOne({resetToken: token, resetTokenExpiration:{$gt: Date.now()}})//$gt = greater than, as is the token expires later
        .then((u)=>{
            response.render('auth/new-password',{
                pageTitle: 'New password',
                path: '/new-password',
                errorMessage: request.flash('error'),
                userId: u._id.toString(),
                passwordToken: token
            })
        })
        .catch(err => {
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.postNewPassword =(request,response,redirect)=>{
    
    //use as much criteria as possible to stay secure
    let password = request.body.password
    let userId = request.body.userId
    let token = request.body.passwordToken


    User.findOne({
        resetToken: token,
        _id: userId,
        resetTokenExpiration: {$gt: Date.now()}
    })
        .then(u => {

            bcrypt.hash(password,12)
                .then(updatePassword => {
                    u.password = updatePassword
                    u.resetToken = undefined
                    u.resetTokenExpiration = undefined

                    return u.save()
                })
        })
        .then(()=>{
            request.flash('error','password has been updated')
            response.redirect('/login')
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
        
}