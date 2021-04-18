
exports.error404Response = (req,res,next)=>{
    //res.sendFile(path.join(__dirname,'views','error.html'))
    res.status(404).render('error',{
        pageTitle: 'ERROR 404',
        path: '/error',
        errorMessage: null,
        isAuthenticated: req.session.isAuthenticated
    })
}

exports.get500Response = (req,res,next)=>{
    //res.sendFile(path.join(__dirname,'views','error.html'))

    res.render('500',{
        pageTitle: 'ERROR 500',
        path: '/500',
        errorMessage: null,
        isAuthenticated: req.session.isAuthenticated
    })
}
