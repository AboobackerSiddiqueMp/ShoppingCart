var db = require('../config/connection')
var collections = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('../app')
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay')
const { resolve } = require('path')
const { rejects } = require('assert')
var instance = new Razorpay({
    key_id: 'rzp_test_zNYYWFiqIix30e',
    key_secret: 'GDKeYeG79WZC7ow9GrpgePRE'
});


module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((response) => {
                resolve(response)
            })
        })
    },


    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log('login successful');
                        response.user = user
                        response.status = true
                        resolve(response)
                    }
                    else {
                        console.log('password and email not mach');
                        resolve({ status: false })
                    }

                })

            } else {
                console.log('no user')
                resolve({ status: false })

            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: new objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collections.CART_COLLECTION)
                        .updateOne({ user: new objectId(userId), 'products.item': new objectId((proId)) },
                            {
                                $inc: { 'products.$.quantity': 1 }

                            }
                        ).then(() => {
                            resolve()
                        })
                }
                else {

                    db.get().collection(collections.CART_COLLECTION).updateOne({ user: new objectId(userId) },
                        {
                            $push: { products: proObj }
                        }
                    ).then((response) => {
                        resolve()
                    })
                }


            }
            else {
                let cartObj = {
                    user: new objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }


        })
    },
    getCartProduct: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: { user: new objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantitys: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantitys: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }

                }

            ]).toArray()
            resolve(cartItems)

        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (cart) {
                count = cart.products.length

            }
            resolve(count)

        })
    },
    changeProQuantity: (details) => {
        details.count = parseInt(details.count)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collections.CART_COLLECTION)
                    .updateOne({ _id: new objectId(details.cart) },
                        {
                            $pull: { products: { item: new objectId(details.product) } }

                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })

            } else {
                db.get().collection(collections.CART_COLLECTION)
                    .updateOne({ _id: new objectId(details.cart), 'products.item': new objectId((details.product)) },
                        {
                            $inc: { 'products.$.quantity': details.count }

                        }

                    ).then((response) => {
                        console.log(response)
                        resolve({ status: true })
                    })
            }


        })
    },
    deleteProduct: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.CART_COLLECTION)
                .updateOne({ _id: new objectId(details.cart) },
                    {
                        $pull: { products: { item: new objectId(details.product) } }

                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })

        })
    },
    totalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: { user: new objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantitys: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantitys: 1,
                        product: { $arrayElemAt: ['$product', 0] }

                    }


                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantitys', { $toInt: '$product.price' }] } }
                    }

                }

            ]).toArray()
            console.log("abus=",total.length)
            let ftotal=0
            if(total.length>0){
                resolve(total[0].total)
            }else{
                resolve(ftotal)
            }





        })


    },
    cartElement: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objectId(userId) })
            resolve(cart.products)

        })
    },
    placeOrder: (order, product, total) => {
        return new Promise((resolve, reject) => {
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode

                },
                userId: new objectId(order.userId),
                paymentMethod: order['payment-method'],
                total: total,
                product: product,
                status: status
            }
            db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collections.CART_COLLECTION).deleteOne({ user: new objectId(order.userId) })
                console.log(response.insertedId)
                resolve(response.insertedId)
            })

        })

    },
    orderList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $match: { userId: new objectId(userId) }
                },
                {
                    $project: {
                        paymentMethod: 1,
                        total: 1,
                        _id: 1
                    }
                }

            ]).toArray()
            resolve(orders)
        })
    },
    orderProduct: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: new objectId(orderId) }

                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }

                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }



                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }


            ]).toArray()
            console.log(product)
            resolve(product)
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total*100,
                currency: "INR",
                receipt: '' + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err)
                } else {
                    console.log("new order=", order);
                    resolve(order)
                }
            });



        })
    },
    verifypayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'GDKeYeG79WZC7ow9GrpgePRE');
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve();
            }
            else {
                reject();
            }
        })
    },
    changeOrderstatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collections.ORDER_COLLECTION)
            .updateOne({ _id:new objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
                
            }).then(()=>{
                console.log('update ayi')
                resolve()
            })


        })
    },
    adminLogin:(userData)=>{
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let admin = await db.get().collection(collections.ADMIN_COLLECTION).findOne({ email: userData.email })
            if (admin) {
                bcrypt.compare(userData.password, admin.password).then((status) => {
                    if (status) {
                        console.log('login successful');
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    }
                    else {
                        console.log('password and email not mach');
                        resolve({ status: false })
                    }

                })

            } else {
                console.log('no user')
                resolve({ status: false })

            }
        })
        

    }

}