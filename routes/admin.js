var express = require('express');
const { render, response } = require('../app')
var router = express.Router();
var productHelper = require('../helper/product-helper')
const userHelper=require('../helper/user-helper');



/* GET users listing. */
router.get('/', function (req, res, next) {
if(req.session.admin){
    productHelper.getAllProducts().then((item) => {
    res.render('admin/table', { admin: true, item });//to call table page

  })

  
}else{
  res.render('admin/adminLogin',{admin:true})


}



});
router.get('/adminLogin',(req,res)=>{
    res.render('admin/adminLogin',{admin:true})

});
router.post('/adminLogin',function(req,res){
  console.log(req.body)
  userHelper.adminLogin(req.body).then((response)=>{
    if(response.status)
    {
      req.session.admin=response.admin
      req.session.admin.loggedIn=true
  

      res.redirect('/admin')
    }
    else
    {
      req.session.adminLoginErr=true

      res.render('admin/adminLogin',{"loginErr":req.session.userLoginErr})
    }
 

  })

});
router.get('/adminLogout',(req,res)=>{
    req.session.destroy();
    res.render('admin/adminLogin',{admin:true})

})

router.get('/add-product', function (req, res) {
  res.render('admin/add-product')
});
router.post('/add-product', (req, res) => {

  productHelper.addProduct(req.body, (id) => {
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render("admin/add-product")
      }
      else {
        console.log(err);
      }
    })
  })
});
router.get('/delete-product/:id',(req,res,next)=>{
  let proId=req.params.id
  productHelper.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/')


  })
  
});
router.get('/edit-product/:id',async(req,res,next)=>{
  let product= await productHelper.getProductDetails(req.params.id)
  console.log(product)
  res.render('admin/edit-product',{product})
});
router.post('/update-product/:id',(req,res)=>{
  productHelper.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin/')
    if(req?.files?.Image){
      let id=req.params.id
      let image=req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')

    }
  })
})




module.exports = router;
