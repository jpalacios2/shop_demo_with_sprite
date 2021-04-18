//core node modules
const path = require('path')
const rootDir = require('../util/path')
//third party modules
const express = require('express')
const expressRouter = express.Router()

const productsController = require('../controllers/shop')

//auth middleware
const isAuthenticated = require('../middleware/is-auth')
const { response } = require('express')


//Routes
expressRouter.get('/',productsController.getIndex)

expressRouter.post('/add-user', productsController.addUser)

expressRouter.get('/user/:userId',productsController.getUserInfo)

expressRouter.get('/products',productsController.getProducts)

expressRouter.get('/products/:page',productsController.getProducts)
//class with pagination so changed to /products/details/: 
expressRouter.get('/products/details/:productId',productsController.getProductDetails)

expressRouter.get('/cart', isAuthenticated,productsController.getCart)

expressRouter.post('/cart', isAuthenticated,productsController.postCart)

expressRouter.get('/delete-cart', isAuthenticated,productsController.deleteCart)

expressRouter.post('/cart-delete-item', isAuthenticated,productsController.deleteCartItemPost)

expressRouter.get('/checkout',isAuthenticated,productsController.getCheckout)

expressRouter.get('/checkout/success',isAuthenticated,productsController.getCheckoutSuccessPostOrder)

expressRouter.get('/checkout/cancel',isAuthenticated,productsController.getCheckout)

expressRouter.get('/orders',isAuthenticated,productsController.getOrders)

//no longer needed as this will be the success route after a payment
//expressRouter.post('/create-order', isAuthenticated,productsController.postOrder)

expressRouter.get('/orders/:orderId',isAuthenticated,productsController.getInvoice)

module.exports = expressRouter;