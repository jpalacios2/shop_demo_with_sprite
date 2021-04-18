const { response, request } = require('express')
//const e = require('express')
const express = require('express')
const expressRouter = express.Router()
const authController = require('../controllers/auth')
const User = require('../models/user')
const bcrypt = require('bcryptjs')

//for validation
const {check, body} = require('express-validator')

expressRouter.get('/login',authController.loginPage)
expressRouter.post('/login',
    [
        body('email','Enter a valid email')
            .isEmail().
            normalizeEmail(),
        body('password','password must be greater than 7 characters long')
            .isLength({
                min:8
            })
            .trim()
    ]
    ,authController.loginRedirect)
//for logging out
expressRouter.post('/logout',authController.logOut)
//for signing up
expressRouter.get('/signup',authController.registerNewAccount)
expressRouter.post('/signup',
    [
        check('email')
            .isEmail()
            .withMessage('Enter a valid email address')
            .normalizeEmail()
            .custom((value,{request})=>{
                return User.find({email: value})
                    .then(result => {

                        if(result.length > 0){
                            return Promise.reject('User already exist')
                        }
                    })
            })
        ,//do not chain multiple body errors, rather, check for all potential errors in one body check
        body('password','Password must contain at least 8 characters.')
            .custom((value, {req}) => {
                if(value !== req.body.confirmPassword){
                    
                    throw new Error('Passwords must match')
                }
                return true
            })
            .isLength({
                min: 8,
                max: 20
            })
            .trim(),
        body('confirmPassword')
            .trim()
   ],
    authController.postRegistration)
//for reseting password
expressRouter.get('/reset',authController.getReset)
expressRouter.post('/reset',authController.postReset)
expressRouter.get('/reset/:token',authController.getNewPassword)
expressRouter.post('/new-password',authController.postNewPassword)

module.exports = expressRouter
