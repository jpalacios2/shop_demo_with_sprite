
const deleteProduct =(btn) =>{
    const csrfTokem = btn.parentNode.querySelector('#csrfToken').value
    const productId = btn.parentNode.querySelector('#productId').value
    const deleteMode = btn.parentNode.querySelector('#deleteMode').value

    const productElement = btn.closest('article')
    
    //fetch is supported by the browser for sending HTTP requests
    fetch(`/admin/delete-product/${productId}?delete=${deleteMode}`,{
        method: 'DELETE',
        headers: {
            'csrf-token': csrfTokem
        }
    })
    .then((result)=>{
        return result.json()
    })
    .then((data)=>{
        console.log(data)
        productElement.parentNode.removeChild(productElement)
    })
    .catch((err) => {
        console.log(err)
    })
}