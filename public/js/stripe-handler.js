const orderBtn = document.getElementById('order-btn')

//const stripe = Stripe('pk_test_51IDkDsArv1QrI4Bx0FZSUZfasfwxL6uVpPllkXwNeieHKwrhe7RFNzcgiRnHHN4NCryij7rCucqy02WQsDml9l5p00r1PqEsB3');
const stripe = Stripe('pk_test_51IDkDsArv1QrI4Bx0FZSUZfasfwxL6uVpPllkXwNeieHKwrhe7RFNzcgiRnHHN4NCryij7rCucqy02WQsDml9l5p00r1PqEsB3')
console.log('Stripe Loaded In')

const onStripeRedirect =() =>{
    console.log('Should sent to stripe')
    
    stripe.redirectToCheckout({
        sessionId: 'asdasdsadasds'
    })
    
}

orderBtn.addEventListener('click',onStripeRedirect)

