const { ObjectId } = require('mongodb')
const Product = require('../models/product')
const User = require('../models/user')
const Order = require('../models/order')
const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit');
const ITEMS_PER_PAGE = 1
//to process payments
const stripe = require('stripe')(process.env.STRIPE_KEY)

exports.getIndex = (req,res,next) =>{
    Product.find({})
        .then((produts)=>{
            //console.log(produts)
            produts.forEach(element => {
                
            });
            res.render('shop/index',{
                path: '/',
                pageTitle:'Home',
                allProds: produts
            })
        }).catch((err)=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })

}


//this controller was used for testing purposes, no longer utilized
exports.getTestPage = (request,response,next)=>{

    User.find({})
        .then((r)=>{
            response.render('shop/test-page',{
                path: '/',
                pageTitle: 'Test-Page',
                users: r
            })
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.addUser = (request,response,next)=>{

    const userName = request.body.userName
    const email = request.body.email
    
    const userToAdd = new User(userName,email)

    userToAdd.createUser()
        .then(res => {
            response.redirect('/')
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.getUserInfo = (request,response,next)=>{
    
    const userId = request.params.userId

    User.findById(userId)
        .then((user) =>{
            response.render('shop/user-info',{
                path: '',
                pageTitle: 'User Information',
                user: user
            })
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })

    
}

exports.getProducts = (request,response,next) =>{

    const page = +request.query.page || 1

    let totalItems

    Product.find({})
        .countDocuments()
        .then((numOfProds) => {            
            totalItems = numOfProds

            return Product.find({})
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)
        })
        .then((products)=>{
            response.render('shop/product-list',{
                path: '/products',
                pageTitle: 'Shop',
                products: products,
                activeShop: true,
                productCSS: true,
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)
            })                
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.getProductDetails = (request,response,next,)=>{

    console.log('Prod details...')

    const productId = request.params.productId
    
    Product.findById(productId)
        .then((p)=>{

            response.render('shop/product-detail',{
                path: '/product/product-detail',
                pageTitle: 'Details: ' + productId,
                product: p

            })
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.getCart = (request,response,next)=>{
    
    if(!request.user){
        response.redirect('/login')
        return
    }else{

        request.user.getCart()
        .then(products => {

            response.render('shop/cart',{
                pageTitle: 'Shoppint Cart',
                path: '/cart',
                cart: products,
                cartTotal: request.user.cart.cartTotal > 0 ? parseFloat(request.user.cart.cartTotal).toFixed(2) : parseFloat(0).toFixed(2)

            })
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
    }    
}

exports.deleteCartItemPost = (request, response, next)=>{
    
    const productId = request.body.id

    request.user.removeItemFromCart(productId)
        .then(()=>{
            response.redirect('/cart')          
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.postCart = (request,response,next)=>{
    
    const productId = request.body.productId
    const productTitle = request.body.productTitle
    
    request.user.addToCart(request.user.cart,productId,productTitle)
        .then((cart)=>{
            response.redirect('/cart')
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.deleteCart = (request,response,next)=>{
    
    request.user.deleteCart(request.user._id)
        .then(()=>{

            response.redirect('/cart')
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
    
}

exports.getCheckout = (request, response, next)=>{
    
    let checkoutProducts;
    let total = request.user.cart.cartTotal > 0 ? parseFloat(request.user.cart.cartTotal).toFixed(2) : parseFloat(0).toFixed(2);
    
    let nonce = nonceGenerator(12)

    request.user.getCart()
        .then(products => {

            checkoutProducts = products

            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: checkoutProducts.map((p) =>{
                    //SPECIFIC DETAILS FOR STRIPE
                    // console.log('======== Inside sessions.create STRIPE ==========')
                    // console.log(p)
                    return {
                        name: p.productId+'_'+p.title,
                        amount: p.price * 100,
                        currency: 'usd',
                        quantity: p.quantity
                    }
                }),//get the HOST address no matter were the server is hosted
                success_url: request.protocol+'://'+request.get('host')+'/checkout/success',
                cancel_url:request.protocol+'://'+request.get('host')+'/checkout/cancel'
            })
        })
        .then((session)=>{

            request.user.saveSessionId(session.id)
    

            response.render('shop/checkout',{
                pageTitle: 'Checking  out',
                path: '/checkout',
                cart: checkoutProducts,
                cartTotal: request.user.cart.cartTotal > 0 ? parseFloat(request.user.cart.cartTotal).toFixed(2) : parseFloat(0).toFixed(2),
                sessionId: session.id,
                nonce: request.nonce
            })
        })
        .catch(err=>{
            const error = new Error(err)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.getCheckoutSuccessPostOrder = (request, response, next)=>{
    //chech session before adding order
    if(!request.user.getSession()){
            console.log('failed to find check out session')
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
    }

    request.user.deleteSession()
        .then(()=>{
            request.user.addOrder()
                .then((newOrderId)=>{
                    //Then write the PDF invoice for later use
                    Order.findOne(newOrderId)
                        .then((order)=>{

                            const orderId = order._id
            
                            const invoiceName = 'invoice-'+orderId+'.pdf'
                                                        //folder/invoices/fileName
                            const invoicePath = path.join('data','invoices', invoiceName)
                            
                            const doc = new PDFDocument({margin: 50});
                            doc.fontSize('16')
                            //doc.pipe(response);//Only do when wanting to open a pdf in browser, being handled in /orders
                            doc.text(`Order For Purchase on ${order.purchaseTime}`,{
                                underline: true,
                                align: true
                            }) 
                            doc.text(`\nOrder Id: ${order._id}`) 
                            doc.text('==================================================')
                            
                            //loop through the products and write them to file
                            order.cartItems.map((res) =>{
                                doc.text(`${res.title} - $${res.price} per item - quantity-purchased: ${res.quantity}`)
                            })

                            doc.text('==================================================')
                            doc.text(`\nOrder Total = $${order.orderTotal}`,{
                                underline: true
                            })

                            doc.save()
                            doc.pipe(fs.createWriteStream(invoicePath));//this is the last step in creating the pdf do it writes
                            return doc.end()
                        })
                        .then(()=>{
                            response.redirect('/orders')
                        })
                        .catch(err =>{
                            console.log('failed to write order')
                            const error = new Error(err.message)
                            error.httpStatusCode = 500
                            return next(error)
                        })
                    })
                })
        .catch(err=>{
            console.log('failed to write order')
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
    
}

exports.getOrders = (request,response,next)=>{

    request.user.getOrders()
        .then(orders => {
            response.render('shop/orders',{
                pageTitle: 'Order History',
                path: '/orders',
                orders: orders,
                isAuthenticated: request.session.isAuthenticated,
                csrfToken: request.csrfToken()
            })
        })
        .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.getInvoice = (request,response,next)=>{

    const orderId = request.params.orderId

    //to Prevent someone with someone else's unauthorized order-id to view that order
    Order.findOne({_id: orderId,userId: request.user._id})
        .then((authenticatedOrder)=>{
            if(!authenticatedOrder){
                return next(new Error('Invalid Order ID!'))
            }

            const invoiceName = 'invoice-'+orderId+'.pdf'
                                //folder/invoices/fileName
            const invoicePath = path.join('data','invoices', invoiceName)

            /*This is not ideal as node will read entire file prior to displaying, use Stream BUFFER instead
            fs.readFile(invoicePath,(err,resultDataBuffer)=>{
                if(err){
                    console.log(err)
                    return next(err)
                }

                response.setHeader('Content-Type','application/pdf')
                response.setHeader('Content-Disposition',`inline; filename=${invoiceName}`)
                response.send(resultDataBuffer)
            })
            */

            //Stream to avoid PRE-LOADING the file into memeory
            const pdfFile = fs.createReadStream(invoicePath)
            response.setHeader('Content-Type','application/pdf')
            response.setHeader('Content-Disposition',`inline; filename=${invoiceName}`)
            pdfFile.pipe(response)
        })
        .catch((err)=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
    
}

const nonceGenerator = (length)=> {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}