const  express = require('express')
const checktoken = require('../middlewares/auth')
const productrouter = express.Router()



productrouter.get ('/' , checktoken
    , (req , res)=>{

res.status(200)

.json({
    status: "success",
    count: 3,
    timestamp: new Date(),
    data: [
        {
            id: 1,
            name: "asd",
            description: "This is a cool item 😎"
        },
        {
            id: 2,
            name: "adksmfsd",
            description: "Another awesome entry 🚀"
        },
        {
            id: 3,
            name: "asddllfmsdf",
            description: "The final epic item 🌟"
        }
    ]
});


})


module.exports = productrouter;
