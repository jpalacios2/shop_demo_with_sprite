const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const productSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        require: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
})

module.exports = mongoose.model('Product',productSchema)

/*
const {getDB} = require('../util/database') 
const mongoDB = require('mongodb')

class Product{
    constructor(title, price, imageUrl, description, userId){
        this.title = title
        this.price = price
        this.imageUrl = imageUrl
        this.description = description,
        this.userId = userId
    }

    save(){
        
        return getDB().collection('products')
        .insertOne(this)
            .then(()=>{
                console.log('Added product!')
            })
            .catch(err => {
                console.log(err)
            })
    }

    static fetchProducts(){
            return getDB().collection('products').find().toArray()
    }

    static fetchProduct(id){
        return getDB().collection('products').find({_id: mongoDB.ObjectId(id)})
    }

    static deleteProduct(id){
        return getDB().collection('products').deleteOne({_id: mongoDB.ObjectId(id)})
    }

    static updateProduct(id,title,imageUrl,price,description){
        return getDB().collection('products').updateOne(
                {
                    _id: mongoDB.ObjectId(id)
                },
                {$set: {
                    title: title,
                    imageUrl: imageUrl,
                    price: price,
                    description: description
                }}
            )
    }
}

module.exports = Product
*/