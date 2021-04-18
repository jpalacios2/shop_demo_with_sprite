const express = require('express')
const expressRouter = express.Router()
const isAuthenticated = require('../middleware/is-auth')
//for validation, no need regular expressions!
const {check,body} = require('express-validator')


//====Internal Controller Functions====
//==> requests travel from left to right
const adminController = require('../controllers/admin')
const { request, response } = require('express')


expressRouter.get('/add-product', isAuthenticated,adminController.getAddProduct)

expressRouter.post('/add-product',
    [
        body('productName','Title must be alphanumeric and minimum 3 characters long').isLength({min: 3,max: 100}).trim(),
        body('price','Price must be a floating value').isFloat(),
        body('description','Description must be at least 5 characters long and max 500 characters').trim().isLength({min: 5, max: 500})
    ],
    isAuthenticated,adminController.postAddProduct)

expressRouter.get('/products', isAuthenticated,adminController.getAdminProducts)

expressRouter.get('/edit-product/:productId', isAuthenticated,adminController.getEditProduct)

expressRouter.post('/edit-product', 
    [
        body('productName','Title must be alphanumeric and minimum 3 characters long').isLength({min: 3, max: 100}).trim(),
        body('price','Price must be a floating value').isFloat(),
        body('description','Description must be at least 5 characters long and max 500 characters').trim().isLength({min: 5, max: 500})
    ],
    isAuthenticated,adminController.postEditProduct)

expressRouter.delete('/delete-product/:productId',isAuthenticated,adminController.deleteAdminProduct)

//expressRouter.post('/delete-product',isAuthenticated,adminController.deleteAdminProduct)





exports.adminRoutes = expressRouter
