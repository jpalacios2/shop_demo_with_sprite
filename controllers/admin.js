const Product = require('../models/product')
const fileHelper = require('../util/file')

//for obtaining validation results
const {validationResult} = require('express-validator')

const ITEMS_PER_PAGE = 1

exports.getAddProduct = (request, response, next)=>{
    
    response.render('admin/edit-product',{
            path: '/admin',
            pageTitle: 'Admin Edit Product Page',
            activeAddProduct: true,
            formsCSS: true,
            productCSS: true,
            editing: false,
            errorMessage: '',
            values:{
                title: '',
                price:'',
                description: ''
            }
        })
    }

exports.postAddProduct = (request,response,next)=>{

    title = request.body.productName
    price = request.body.price
    imageUrl = request.file
    description = request.body.description
    userId = request.session.user._id

    if(!imageUrl){
        return response.status(422).render('admin/edit-product',{
            path: '/admin',
            pageTitle: 'Admin Edit Product Page',
            activeAddProduct: true,
            formsCSS: true,
            productCSS: true,
            editing: false,
            errorMessage: 'Image declined',
            values:{
                title: title,
                price: price,
                description: description
            }
        })
    }

    let errors = validationResult(request)

    if(!errors.isEmpty()){
        return response.status(422).render('admin/edit-product',{
            path: '/admin',
            pageTitle: 'Admin Edit Product Page',
            activeAddProduct: true,
            formsCSS: true,
            productCSS: true,
            editing: false,
            errorMessage: errors.array()[0].msg,
            values:{
                title: title,
                price: price,
                description: description
            }
        })
    }

    const newProduct = new Product({
        title: title,
        price: price,
        imageUrl: '/'+imageUrl.path,
        description: description,
        userId: userId
    })
    
    newProduct.save()
                .then(() =>{
                    response.redirect('/admin/add-product')
                })
                .catch(err =>{
                    const error = new Error(err.message)
                    error.httpStatusCode = 500
                    return next(error)
                })
}
    

exports.getEditProduct = (request, response, next)=>{

    const editMode = request.query.edit


    if(!editMode){
        response.redirect('/')
    }else{
        const productId = request.params.productId

        Product.find({_id: productId, userId: request.user._id})
            .then((p)=>{
                
                if(p.length > 0){
                    response.render('admin/edit-product',{
                        path: '/none',
                        pageTitle: 'Admin Edit Product Page',
                        editing: editMode,
                        product: p[0],
                        errorMessage: '',
                        values:{
                            title: '',
                            price: '',
                            description: ''
                        }
                    })
                }else{
                    response.redirect('/')
                }
                
            })
            .catch((err)=>{
                const error = new Error(err.message)
                error.httpStatusCode = 500
                return next(error)
            })
    }
}

exports.postEditProduct = (request, response, next)=>{
    
    const productId = request.body.id
    const title = request.body.productName
    const image = request.file
    const price = request.body.price
    const description = request.body.description

    let errors = validationResult(request)

    if(!errors.isEmpty()){
        
        return response.status(422).render('admin/edit-product',{
            path: '/admin',
            pageTitle: 'Admin Edit Product Page',
            activeAddProduct: true,
            formsCSS: true,
            productCSS: true,
            editing: false,
            errorMessage: errors.array()[0].msg,
            values:{
                title: title,
                price: price,
                description: description
            }
        })
    }

   Product.find({_id: productId , userId: request.user._id})
    .then(()=>{
        console.log('found prod to edit')
    })
    .catch(err=>{
            const error = new Error(err.message)
            error.httpStatusCode = 500
            return next(error)
        })
   
   Product.findById(productId)
        .then((prod)=>{

            if(request.user._id.toString() !== prod.userId.toString()){
                console.log('fraud attempt!')
                return
            }

            prod.title = title
            //only if we select an image should we bother with the path
            //if there is a new image for that product delete the old one
            if(image){

                fileHelper.deleteFile(prod.imageUrl)

                prod.imageUrl = image.path
            }
            
            prod.price = price
            prod.description = description
            
            return prod.save()
        })
        .then(()=>{
            response.redirect('/admin/products')
        })
        .catch(err =>{
            /*
            response.render('error',{
                pageTitle: 'ERROR 404',
                    path: '/error',
                    errorMessage: err.message
            })*/

            //response.redirect('/500')
            const error = new Error(err.message)
            error.httpStatusCode = 500
            //passing an error as an argument when calling next will skip all other middlewares and route to the error route
            return next(error)
        })
}

exports.deleteAdminProduct = (request, response, next)=>{
    
    /*
    console.log('DELETE MODE in Controller')
    console.log(request.params)
    console.log(request.query)
    */
    const deleteMode = request.query.delete
    //const deleteMode = request.body.deleteMode
    
    if(deleteMode)
    {
        const idToDelete = request.params.productId
        //const idToDelete = request.body.productId

        Product.find({_id: idToDelete,userId: request.user._id})
            .then((productToRemove) => {
                
                if(!productToRemove){
                    throw new Error(err)
                }

                //delete the file before removing from database
                fileHelper.deleteFile(productToRemove[0].imageUrl,(errorDeleting,deletedProd)=>{
                    if(errorDeleting){
                        console.log(`deleting without removing image, check image path or if image is still in images folder
                        Image Id = ${idToDelete}
                        Image path: ${productToRemove[0].imageUrl}
                        `)
                        //TODO - Send message to admin to delete check for missing image
                    }
                    //Product.deleteOne({_id: idToDelete})//could aslo use find and delete if contents are needed after deleting
                    Product.deleteOne({_id: idToDelete,userId: request.user._id})
                        .then(()=>{
                        })
                        .catch((err)=>{
                            const error = new Error(err.message)
                            error.httpStatusCode = 500
                            return next(error)
                        })   
                })
            })
            .then(()=>{
                //if we made it this fat the item has been deleted
                response.status(200).json({
                    message: 'Success!'
                })
            })
            .catch((err)=>{
                response.status(500).json({
                    message: 'Deleting Product Failed!'
                })
            })
    }else{
        return response.redirect('/products')
    }
}

exports.getAdminProducts = (request,response,next)=>{

    Product.find({userId: request.user._id})
    //.select('title')
    //.populate('userId')
    .then((products)=>{
        response.render('admin/products',{
            pageTitle: 'Admin-Products',
            path: '/admin/products',
            products: products,
            csfrToken: request.csrfToken()
        })
    })
    .catch((err)=>{
        console.log(err)
        const error = new Error(err.message)
        error.httpStatusCode = 500
        return next(error)
    })
}