const mongoose = require('mongoose')
const Schema = mongoose.Schema
const {ObjectId} = require('mongodb')

//Models
const Product = require('./product')
const Order = require('./order')
const {productSchema} = Product
const {orderSchema} = Order


const userShcema = new Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: {
        type: String,
        required: false
    },
    resetTokenExpiration:{
        type: Date,
        required: false
    },
    cart:{
        cartItems: 
            [
                {
                    productId: {
                        type: Schema.Types.ObjectId,
                        ref: 'Product',
                        required: true
                    }, 
                    title:{
                        type: String
                    },
                    quantity: {
                        type: Number,
                        required: true
                    }}
            ],
        cartTotal: {
            type: Number,
            required: true
        }
    },
    sessionId:{
        type: String
    }
})

userShcema.methods.addToCart = function(userCart, productId, title){

    let originalCartCopy = {cartItems:[]}
        let productIDs = []
        let productPrices = []
        let cartTotal = 0.00

        if(userCart.cartItems.length > 0){
            originalCartCopy = userCart
        }
        
        let indexOfRepeatProd = originalCartCopy.cartItems.findIndex((p)=>{
            return JSON.stringify(ObjectId(productId)) === JSON.stringify(ObjectId(p.productId))
        })
    

        //findIndex() returns -1 if condition not found
        if(indexOfRepeatProd > -1){
            originalCartCopy.cartItems[indexOfRepeatProd].quantity = originalCartCopy.cartItems[indexOfRepeatProd].quantity + 1
        }else{
            originalCartCopy.cartItems.push({productId: productId, title: title ,quantity: 1})

            
        }

        //once the item is added to cartItems get the prices
        originalCartCopy.cartItems.map(res =>{
            productIDs.push(ObjectId(res.productId))    
        })



        return Product.find({_id:{$in: productIDs}})
            .then((products) => {

                //this is where you ADD title                

                products.map(res =>{
                    for(let index in productIDs){
                        if(JSON.stringify(ObjectId(productIDs[index])) === JSON.stringify(ObjectId(res._id))){
                            productPrices.push({productId: productIDs[index],price: parseFloat(res.price)})
                        }
                    }
                })

                //add the prices to get total   
                originalCartCopy.cartItems.map(cartItem => {
                    for(let i in productPrices){
                        if(JSON.stringify(ObjectId(productPrices[i].productId)) === JSON.stringify(ObjectId(cartItem.productId)))
                        {
                            let cartItemTotal = (productPrices[i].price * cartItem.quantity)
                            cartTotal = (cartTotal + cartItemTotal)
                        }
                    }
                })

                return cartTotal
            })
            .then((total)=>{
                originalCartCopy.cartTotal = total

                return originalCartCopy
            })
            .then(finalCart => {
                //finally add the new cart
                return mongoose.model('user',userShcema).updateOne({_id: ObjectId(this._id)},{$set:{cart: finalCart}})
                    })
            .then(()=>{
                
                return originalCartCopy
            })
            .catch(e => {console.log(e)})

}

userShcema.methods.getCart = function(){
    //if the cart is empty the user is being returned
    if(this.cart.cartItems.length < 1)
    {
        return Promise.resolve([])
    }

    //check if all items in the cart are still active
    let cartItemsIds = []
    let cartLength = 0
    let innacurateCart = false

    this.cart.cartItems.map((id, index) => {
        cartItemsIds.push(ObjectId(id.productId))
        
        cartLength++
    })

    return mongoose.model('Product', productSchema).find({_id:{$in: cartItemsIds}})
        .then(prods => {
            if(prods.length < cartLength){
                innacurateCart = true
                let updateCart = {cartItems:[],cartTotal: 0.00}

                prods.map((prod, prodIndex) => {
                    for(let i in this.cart.cartItems){
                        if(JSON.stringify(ObjectId(prod._id)) === JSON.stringify(ObjectId(this.cart.cartItems[i].productId))){
                            updateCart.cartItems.push(this.cart.cartItems[i])
                        }
                    }
                })

                if(innacurateCart){
                    return mongoose.model('user',userShcema).updateOne({_id: ObjectId(this._id)},{$set:{cart: updateCart}})
                }

            }
        })
        .then(()=>{
            let productIds = []
            let didCopy = false

            for(let i = 0; i < this.cart.cartItems.length; i++){

                productIds.push( ObjectId(this.cart.cartItems[i].productId))

                if(i == (this.cart.cartItems.length - 1)){
                    didCopy = true
                }
            }

            if(didCopy){

            return mongoose.model('Product',productSchema).find({_id:{$in: productIds}})
                .then((prods) => {

                    let finalObjToReturn = []

                    for(let id in prods){

                        this.cart.cartItems.map(res =>{
                            if(JSON.stringify(res.productId) === JSON.stringify(prods[id]._id)){
                                finalObjToReturn.push({
                                    productId: res.productId,
                                    title: res.title,
                                    quantity: res.quantity, 
                                    imageUrl: prods[id].imageUrl,
                                    price: prods[id].price
                                })
                            }
                        })
                    }

                    //calculate and add new total
                    let newCartTotal = 0.00

                    finalObjToReturn.map(cartItem => {
                        newCartTotal = newCartTotal + (cartItem.quantity * cartItem.price)
                    })

                    //update the cart for correct total then post to db
                    this.cart.cartTotal = parseFloat(newCartTotal).toFixed(2)

                    
                    mongoose.model('user',userShcema).updateOne({_id: ObjectId(this._id)},{$set:{cart: this.cart}})

                    return finalObjToReturn                   
                })
            }
        })
        .catch(e => {
            console.log(e)
        })
}

userShcema.methods.removeItemFromCart = function(productId){
    const updatedCart = {cartItems: []}

    this.cart.cartItems.map(cartItem => {
        if(JSON.stringify(cartItem.productId) != JSON.stringify(productId)){
            updatedCart.cartItems.push(cartItem)
        }
    })

    let whereToUpdate = {_id: ObjectId(this._id)}
    let whatToUpdate = {$set:{cart: updatedCart}}
    
    return mongoose.model('user',userShcema).updateOne(whereToUpdate, whatToUpdate)
}

userShcema.methods.addOrder = function(){
    
    let orderArr = []
    let finalOrderItems = []
    let didCopy = false
    let didFinalizeOrder = false
    let newOrderId = undefined

    if(this.cart.cartItems.length > 0){
        for(let i = 0; i < this.cart.cartItems.length; i++){
            orderArr.push(ObjectId(this.cart.cartItems[i].productId))

            if(i === (this.cart.cartItems.length - 1)){
                didCopy = true
            }
        }
    }


    if(didCopy){

        return mongoose.model('Product',productSchema).find({_id: {$in: orderArr}})
        .then(prods => {

            for(let id in prods){
                this.cart.cartItems.map((res, index) => {
                    
                    
                    if(JSON.stringify(ObjectId(res.productId)) === JSON.stringify(ObjectId(prods[id]._id)))
                    {
                        finalOrderItems.push({
                            itemId: res.productId,
                            quantity: res.quantity,
                            title: prods[id].title,
                            price: prods[id].price,
                            imageUrl: prods[id].imageUrl
                        })

                    }

                    if(index === (this.cart.cartItems.length - 1)){
                        didFinalizeOrder = true
                        return finalOrderItems
                    }
                })
            }
        })
        .then(()=>{
            if(didFinalizeOrder){

                let orderTotal = 0.00

                //calcutate the total of an order
                finalOrderItems.map(res =>{
                    orderTotal = orderTotal + (parseFloat(res.price) * res.quantity)
                })


                let purchaseInfo = {
                    userId: this._id,
                    cartItems: finalOrderItems,
                    orderTotal: orderTotal,
                    purchaseTime: Date(Date.now())
                }
    
                
                return mongoose.model('Order',orderSchema).create(purchaseInfo)
                    .then(res =>{
                        newOrderId = res._id    
                        this.cart = 
                        {
                            cartItems:[],
                            cartTotal: 0.00
                        }

                        return mongoose.model('User',userShcema).updateOne({
                            _id: ObjectId(this._id)
                        },
                        {
                            $set:{
                                cart : {
                                    cartItems:[],
                                    cartTotal: 0.00
                                }
                            }
                        })
                        
                    })
            }
        })
        .then(()=>{
            return newOrderId//this will be used to create the invoice
        })
        .catch(e => {console.log(e)})
    }
}

userShcema.methods.getOrders = function(){
    return mongoose.model('Order',orderSchema).find({userId: ObjectId(this._id)})
}

userShcema.methods.deleteCart = function(userId){
    
    const emptyCartItems = {
        cartItems: [],
        cartTotal: 0.00
    }

    return mongoose.model('User',userShcema).updateOne({_id: userId},
        {
            $set:{
                cart: emptyCartItems
            }
        })
}

userShcema.methods.saveSessionId = function(sessionId){
    this.sessionId = sessionId
    return this.save()
}

userShcema.methods.getSession = function(){
    return this.sessionId
}

userShcema.methods.deleteSession = function(){
    this.sessionId = undefined
    return this.save()
}

module.exports = mongoose.model('User',userShcema)
/*
const { ObjectId } = require('mongodb')
const {getDB} = require('../util/database')


class User{
    constructor(userName,email, cart, id){
        this.userName = userName
        this.email = email

        if(!cart) {
            this.cart = {cartItems:[]}
        }else{
            this.cart = cart
        }
        this._id = id
    }

    //User specific methods
    createUser(){
        console.log(this)
        return getDB().collection('users').insertOne(this)
    }

    static findUserById(id){
        return getDB().collection('users').findOne({_id: ObjectId(id)})
    }

    static fetchAllUsers(){
        return getDB().collection('users').find().toArray()
    }

    
    //DELETES THE ENTIRE CART
    deleteCart(userId){
        const emptyCartItems = {cartItems: []}

        return getDB().collection('users').updateOne({_id: userId},
            {
                $set:{
                    cart: emptyCartItems
                }
            })
    }

    removeItemFromCart(productId){
        const updatedCart = {cartItems: []}

        this.cart.cartItems.map(cartItem => {
            if(JSON.stringify(cartItem.productId) != JSON.stringify(productId)){
                updatedCart.cartItems.push(cartItem)
            }
        })

        let whereToUpdate = {_id: ObjectId(this._id)}
        let whatToUpdate = {$set:{cart: updatedCart}}
        
        return getDB().collection('users').updateOne(whereToUpdate, whatToUpdate)
    }

    addToCart(userCart,productId){

        let originalCartCopy = {cartItems:[]}
        let productIDs = []
        let productPrices = []
        let cartTotal = 0.00

        if(userCart.cartItems.length > 0){
            originalCartCopy = userCart
        }
        
        let indexOfRepeatProd = originalCartCopy.cartItems.findIndex((p)=>{
            return JSON.stringify(ObjectId(productId)) === JSON.stringify(ObjectId(p.productId))
        })
    

        //findIndex() returns -1 if condition not found
        if(indexOfRepeatProd > -1){
            originalCartCopy.cartItems[indexOfRepeatProd].quantity = originalCartCopy.cartItems[indexOfRepeatProd].quantity + 1
        }else{
            originalCartCopy.cartItems.push({productId: productId, quantity: 1})
        }

        //once the item is added to cartItems get the prices
        originalCartCopy.cartItems.map(res =>{
            productIDs.push(ObjectId(res.productId))    
        })



        return getDB().collection('products').find({_id:{$in: productIDs}}).toArray()
            .then((products) => {
                products.map(res =>{
                    for(let index in productIDs){
                        if(JSON.stringify(ObjectId(productIDs[index])) === JSON.stringify(ObjectId(res._id))){
                            productPrices.push({productId: productIDs[index],price: parseFloat(res.price)})
                        }
                    }
                })

                //add the prices to get total   
                originalCartCopy.cartItems.map(cartItem => {
                    for(let i in productPrices){
                        if(JSON.stringify(ObjectId(productPrices[i].productId)) === JSON.stringify(ObjectId(cartItem.productId)))
                        {
                            let cartItemTotal = (productPrices[i].price * cartItem.quantity)
                            cartTotal = (cartTotal + cartItemTotal)
                        }
                    }
                })

                return cartTotal
            })
            .then((total)=>{
                originalCartCopy.cartTotal = total
                return originalCartCopy
            })
            .then(finalCart => {
                //finally add the new cart
                return getDB().collection('users').updateOne(
                        {_id: ObjectId(this._id)},
                        {$set:{cart: finalCart}})
                    })
            .then(()=>{
                return originalCartCopy
            })
            .catch(e => {console.log(e)})
    }

    getCart(){
        //if the cart is empty the user is being returned
        if(this.cart.cartItems.length < 1)
        {
            let emptyCartWithZeroTotal = {cartItems:[],cartTotal: 0.00}

            getDB().collection('users').updateOne({_id: ObjectId(this._id)},{$set:{cart: emptyCartWithZeroTotal}})
                
            return Promise.resolve([])
        }

        //check if all items in the cart are still active
        let cartItemsIds = []
        let cartLength = 0
        let innacurateCart = false

        this.cart.cartItems.map((id, index) => {
            cartItemsIds.push(ObjectId(id.productId))
            
            cartLength++
        })

        return getDB().collection('products').find({_id:{$in: cartItemsIds}}).toArray()
            .then(prods => {
                if(prods.length < cartLength){
                    innacurateCart = true
                    let updateCart = {cartItems:[],cartTotal: 0.00}

                    prods.map((prod, prodIndex) => {
                        for(let i in this.cart.cartItems){
                            if(JSON.stringify(ObjectId(prod._id)) === JSON.stringify(ObjectId(this.cart.cartItems[i].productId))){
                                updateCart.cartItems.push(this.cart.cartItems[i])
                            }
                        }
                    })

                    if(innacurateCart){

                        return getDB().collection('users').updateOne(
                            {_id: ObjectId(this._id)},
                            {$set:{cart: updateCart}}
                            )
                    }

                }
            })
            .then(()=>{
                let productIds = []
                let didCopy = false

                for(let i = 0; i < this.cart.cartItems.length; i++){

                    productIds.push( ObjectId(this.cart.cartItems[i].productId))

                    if(i == (this.cart.cartItems.length - 1)){
                        didCopy = true
                    }
                }

                if(didCopy){

                return getDB().collection('products').find({_id:{$in: productIds}}).toArray()
                    .then((prods) => {

                        let finalObjToReturn = []

                        for(let id in prods){

                            this.cart.cartItems.map(res =>{
                                if(JSON.stringify(res.productId) === JSON.stringify(prods[id]._id)){
                                    finalObjToReturn.push({
                                        productId: res.productId,
                                        quantity: res.quantity, 
                                        imageUrl: prods[id].imageUrl,
                                        price: prods[id].price
                                    })
                                }
                            })
                        }

                        //calculate and add new total
                        let newCartTotal = 0.00

                        finalObjToReturn.map(cartItem => {
                            newCartTotal = newCartTotal + (cartItem.quantity * cartItem.price)
                        })

                        //update the cart for correct total then post to db
                        this.cart.cartTotal = parseFloat(newCartTotal).toFixed(2)
                        console.log(newCartTotal)
  
                        
                        getDB().collection('users').updateOne(
                            {_id: ObjectId(this._id)},
                            {$set:{cart: this.cart}}
                            )
                        

                        return finalObjToReturn                   
                    })
                }
            })
            .catch(e => {
                console.log(e)
            })
    }

    addOrder(){
        let orderArr = []
        let finalOrderItems = []
        let didCopy = false
        let didFinalizeOrder = false

        if(this.cart.cartItems.length > 0){
            for(let i = 0; i < this.cart.cartItems.length; i++){
                orderArr.push(ObjectId(this.cart.cartItems[i].productId))

                if(i === (this.cart.cartItems.length - 1)){
                    didCopy = true
                }
            }
        }


        if(didCopy){

            return getDB().collection('products').find({_id: {$in: orderArr}}).toArray()
            .then(prods => {

                for(let id in prods){
                    this.cart.cartItems.map((res, index) => {
                        
                        
                        if(JSON.stringify(ObjectId(res.productId)) === JSON.stringify(ObjectId(prods[id]._id)))
                        {
                            console.log('match')
                            finalOrderItems.push({
                                itemId: res.productId,
                                quantity: res.quantity,
                                title: prods[id].title,
                                price: prods[id].price,
                                imageUrl: prods[id].imageUrl
                            })
    
                        }

                        if(index === (this.cart.cartItems.length - 1)){
                            didFinalizeOrder = true
                            return finalOrderItems
                        }
                    })
                }
            })
            .then(()=>{
                if(didFinalizeOrder){
                    
                    console.log('did finalize order')

                    let orderTotal = 0.00

                    //calcutate the total of an order
                    finalOrderItems.map(res =>{
                        orderTotal = orderTotal + (parseFloat(res.price) * res.quantity)
                        console.log(orderTotal)
                    })


                    let purchaseInfo = {
                        userId: this._id,
                        cartItems: finalOrderItems,
                        orderTotal: orderTotal,
                        purchaseTime: Date(Date.now())
                    }
        
                    
                    return getDB().collection('orders').insertOne(purchaseInfo)
                        .then(res =>{
                            this.cart = {cartItems:[]}
        
                            return getDB().collection('users').updateOne({
                                _id: ObjectId(this._id)
                            },
                            {
                                $set:{
                                    cart : {cartItems:[]}
                                }
                            })
                        })
                }
            })
            .catch(e => {console.log(e)})
        }
    }

    getOrders(){
        return getDB().collection('orders').find({userId: ObjectId(this._id)}).toArray()
    }
}

module.exports = User
*/