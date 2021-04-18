const {Schema, model} = require('mongoose')

const orderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cartItems: {
        type: Array,
        required: true
    },
    orderTotal: {
        type: Number,
        required: true
    },
    purchaseTime: {
        type: String,
        required: true
    }
})

module.exports = model('Order',orderSchema)