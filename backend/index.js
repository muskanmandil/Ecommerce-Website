// declaring the port
const port = 4000;

// importing or initializing all the packages we installed
const express = require("express");

// creating app instance in backend
const app = express();

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { createClient } = require('@supabase/supabase-js');

// declaring path 
const path = require("path")

const cors = require("cors");
require('dotenv').config();

app.use(express.json());
app.use(cors());

// Database Connection with MongoDB
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
mongoose.connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster0.hh0qjyj.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`);


// API Creation
app.get("/", (req, res) => {
    res.send("Express app is running");
})

// Image Storage Engine
const storage = multer.memoryStorage();
const upload = multer({ storage: storage })

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Creating Upload Endpoint for images
app.use('/images', express.static('upload/images'))

app.post("/upload", upload.single('product'), async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send({ success: 0, error: "No file uploaded" });
    }

    const fileName = `products/${Date.now()}_${file.originalname}`;
    const { data, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
        });

    if (error) {
        console.error(error);
        return res.status(500).send({ success: 0, error: "Failed to upload image" });
    }

    // Generate public URL
    const { data: publicData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

    res.json({
        success: 1,
        image_url: publicData.publicUrl,
    });

})

// Schema for creating products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
})

// Creating API for adding Products
app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    })
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})

// Creating API for deleting Products
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name,
    })
})

// Creating API for getting all Products
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})


// Schema creating for User Model
const Users = mongoose.model('Users', {
    name: {
        type: String
    }, email: {
        type: String,
        unique: true
    }, password: {
        type: String
    },
    cartData: {
        type: Object
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

// Creating API for user registration
app.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, error: "existing user found with same email address" })
    }
    let cart = {}
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new Users({
        name: req.body.user_name,
        email: req.body.email,
        password: req.body.password,
        cartData: cart
    })
    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token })
})

// Creating endpoint for user login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({ success: true, token })
        }
        else {
            return res.json({ success: false, error: "wrong password" })
        }

    } else {
        return res.json({ success: false, error: "no user found" })
    }

})

// Creating endpoint for new collections data
app.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollections = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollections);
})

// Creating endpoint for popular in women section
app.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" });
    let popular_in_women = products.slice(0, 4);
    console.log("Popular in women Fetched");
    res.send(popular_in_women);
})


// Creating endpoint for related products data
app.get('/relatedproducts', async (req, res) => {
    let products = await Product.find({});
    let relatedproducts = products.slice(0, 4);
    console.log("RelatedProducts Fetched");
    res.send(relatedproducts);
})

//  creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ error: "Please authenticate using a valid token" });
    } else {
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({ error: "please authenticate using a valid token" })
        }
    }

}

// creating add to cart endpoint
app.post('/addtocart', fetchUser, async (req, res) => {

    console.log("added", req.body.itemId)

    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData })
    res.send("Added")
})

//  creating remove from cart endpoint
app.post('/removefromcart', fetchUser, async (req, res) => {

    console.log("removed", req.body.itemId)

    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] > 0) {
        userData.cartData[req.body.itemId] -= 1;
        await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData })
        res.send("Removed")
    }
})

// creating endpoint to get cart data
app.post('/getcart', fetchUser, async (req, res) => {
    console.log("GetCart");
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
})


// starting express server
app.listen(port, (error) => {
    if (!error) {
        console.log("Server running on Port " + port)
    } else {
        console.log("Error : " + error);
    }

})