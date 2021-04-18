module.exports = (request,response,next) =>{
    if(!request.session.isAuthenticated){
        return response.redirect('/login')
    }else{
        next()
    }
}