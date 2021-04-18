const fs = require('fs')

exports.deleteFile =(filePath,cb) =>{

    let pathToDelete = filePath.split('/')[1]//slash was added to avoid adding them in each template

    fs.unlink(pathToDelete,(error) => {
        if(error){
            return cb(error,null)
        }
        
        return cb(null,[{pathToDelete}])
    })
}