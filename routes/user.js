var express = require('express');
var router = express.Router();
var productHelper=require('../helper/product-helper')
const userHelper=require('../helper/user-helper');
const { response } = require('../app');

/* GET home page. */
router.get('/',async function(req, res, next) {
  let user=req.session.user
  console.log(user)
  cartCount=null
  if(req.session.user)
  {
    cartCount=await userHelper.getCartCount(req.session.user._id)

  }
  productHelper.getAllProducts().then((item)=>{

    res.render('user/view-product',{item,user,cartCount});//to call view product page

  })

  
});
router.get('/login',function(req,res,next){
  if(req.session.user)
  {
    res.redirect('/')
  }
  else
  {

    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.loginErr=false
  }
});
router.get('/signup',function(req,res,next){
  res.render('user/signup')
});
router.post('/signup',function(req,res){
  userHelper.doSignup(req.body).then((response)=>{
    console.log(response)
    req.session.user.loggedIn=true
    req.session.user=response
    res.redirect('/')
  })


});
router.post('/login',function(req,res){
  userHelper.doLogin(req.body).then((response)=>{
    if(response.status)
    {
      req.session.user=response.user
      req.session.user.loggedIn=true

      res.redirect('/')
    }
    else
    {
      req.session.userLoginErr=true

      res.redirect('/login')
    }
  })


});
router.get('/logout',function(req,res,next){
  req.session.destroy()
  res.redirect('/')
});
router.get('/cart',async(req,res,next)=>{
  let user=req.session.user
  let products=await userHelper.getCartProduct(req.session.user._id)
  let total=0
  if(products.length){
  total=await userHelper.totalAmount(req.session.user._id)
  }
    res.render('user/cart',{products,user,total})



});
router.get('/add-to-cart/:id',(req,res)=>{
  userHelper.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
});
router.post('/changeproquantity',(req,res,next)=>{
  userHelper.changeProQuantity(req.body).then(async(response)=>{
    response.total=await userHelper.totalAmount(req.body.user)
    res.json(response)
  })
});
router.post('/deleteProduct',(req,res,next)=>{
  userHelper.deleteProduct(req.body).then((response)=>{
    res.json(response)
  })
});
router.get('/placeOrder',async(req,res,next)=>{
  let user=req.session.user
  let total=await userHelper.totalAmount(req.session.user._id)
  res.render('user/place-order',{total,user})
});
router.post('/placeOrder',async(req,res,next)=>{
  product= await userHelper.cartElement(req.body.userId)
  let total=await userHelper.totalAmount(req.body.userId)

  userHelper.placeOrder(req.body,product,total).then((orderId)=>{
    if(req.body['payment-method']=='COD'){
      res.json({codSuccess:true})


    }
    else{
      userHelper.generateRazorpay(orderId,total).then((response)=>{
        res.json(response)

      })
    }
  

  })
});
router.get('/order-placed',(req,res,next)=>{
  res.render('user/succesful')


});
router.get('/orders',async(req,res)=>{
  let order=await userHelper.orderList(req.session.user._id)
 res.render('user/orders',{order})
});
router.get('/show-orderd-product/:id',async(req,res,next)=>{
  let orderProducts=await userHelper.orderProduct(req.params.id)
  res.render('user/order-product',{orderProducts})

});
router.post('/verify-payment',(req,res)=>{
  console.log(req.body)
  userHelper.verifypayment(req.body).then(()=>{
    userHelper.changeOrderstatus(req.body['order[receipt]']).then(()=>{
      res.json({status:true})
    })

  }).catch((err)=>{
    res.json({status:false})
  })
})
module.exports = router;
