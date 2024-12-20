const express = require("express");
const server = express();
const session = require("express-session");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const expressLayouts = require("express-ejs-layouts");
const multer = require("multer");
const path = require("path");

// Models
const User = require("./models/user.model");
const Product = require("./models/products");
const Category = require("./models/category");
const Order = require("./models/order");

// Middlewares
const authMiddleware = require("./middlewares/auth-middleware");
const adminMiddleware = require("./middlewares/admin-middleware");
const siteMiddleware = require("./middlewares/site-middleware");

// Session Setup
server.use(
  session({
    secret: "secretKey",
    resave: false,
    saveUninitialized: true,
  })
);

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.set("view engine", "ejs");
server.use(express.static("public"));
server.use(expressLayouts);

// MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/Fusionic")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// Middleware for global cart count
server.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = [];
  res.locals.cartCount = req.session.cart.length;
  res.locals.user = req.session.user || null; // Make user data available globally
  next();
});

// Multer setup for image uploads
//const path = require("path");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads"); // Directory to store uploaded images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Generate unique filenames
  }
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and JPG are allowed."));
  }
};
const upload = multer({ storage, fileFilter });

// Set the number of products per page
const ITEMS_PER_PAGE = 6;

/********* AUTHENTICATION ROUTES *********/
// Register Page
server.get("/register", (req, res) => {
  res.render("admin/auth/register",{ layout: "mainLayout" });
});

server.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      // User already exists, render an error message
      return res.status(400).send("User already exists. Please log in.");
    }

    // If user does not exist, hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: ["user"], // Assign default role as "user"
    });

    // Save the new user
    await user.save();

    // Redirect to the login page after successful registration
    res.redirect("/login");
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).send("Error registering user.");
  }
});

// Login Page
server.get("/login", (req, res) => {
  res.render("admin/auth/login",{ layout:"mainLayout" });
});

server.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("Invalid email or password.");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send("Invalid email or password.");

    req.session.user = user; // Set user in session
    res.redirect(user.role.includes("admin") ? "/admin" : "/");
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).send("Error logging in.");
  }
});

server.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");  // Redirect to the login page
  });
});


/********* AUTHORIZED ADMIN ROUTES *********/
server.get("/admin", authMiddleware, adminMiddleware, (req, res) => {
  res.render("admin",{ layout: "layout" });
});

// Manage Categories route
server.get("/add-category", async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch all categories
    res.render("admin/manageCategories", { categories , layout:"layout" }); // Pass categories to the EJS view
  } catch (err) {
    res.status(500).send("Error fetching categories");
  }
});

// Add a new category
server.get("/categories/add", (req, res) => {
  res.render("admin/addCategory",{ layout: "layout" }); // Create this EJS file
});

// Post to add a category
server.use(bodyParser.urlencoded({ extended: true }));
server.post("/categories/add", async (req, res) => {
  try {
    const category = new Category({ name: req.body.name });
    await category.save();
    res.redirect("/add-category"); // Redirect to manage categories page
  } catch (err) {
    res.status(500).send("Error adding category");
  }
});

// Edit an existing category
server.get("/categories/edit/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    res.render("admin/editCategory", { category ,layout: "layout" }); // Create this EJS file
  } catch (err) {
    res.status(500).send("Error fetching category");
  }
});

// Post to edit a category
server.post("/categories/edit/:id", async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { name: req.body.name });
    res.redirect("/add-category");
  } catch (err) {
    res.status(500).send("Error updating category");
  }
});

// Delete a category
server.get("/categories/delete/:id", async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect("/add-category");
  } catch (err) {
    res.status(500).send("Error deleting category");
  }
});


// Manage Products Page (Search, Filter, Sort, and Pagination)
server.get("/add-product", async (req, res) => {
  const { search, category, sort, page = 1 } = req.query;

  const perPage = 5; // Number of products per page
  const query = {};

  // Search Logic
  if (search) {
    query.name = { $regex: search, $options: "i" }; // Case-insensitive search
  }

  // Filter by Category
  if (category) {
    query.category = category;
  }

  // Sorting Logic
  let sortOption = {};
  if (sort) {
    if (sort === "price_asc") sortOption.price = 1;
    else if (sort === "price_desc") sortOption.price = -1;
    else if (sort === "name_asc") sortOption.name = 1;
    else if (sort === "name_desc") sortOption.name = -1;
  }

  try {
    // Fetch total products count for pagination
    const totalProducts = await Product.countDocuments(query);

    // Fetch filtered, sorted, and paginated products
    const products = await Product.find(query)
      .populate("category")
      .sort(sortOption)
      .skip((page - 1) * perPage)
      .limit(perPage);

    // Fetch all categories for filtering dropdown
    const categories = await Category.find();

    res.render("admin/manageProducts", {
      products,
      categories,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / perPage),
      search,
      selectedCategory: category,
      sort,
      perPage,
      layout: "layout"
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products.");
  }
});


// Add New Product Page
server.get("/products/add", async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch all categories for the dropdown
    res.render("admin/addProduct", { categories,layout: "layout"  });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Error fetching categories.");
  }
});

// POST route to add a new product
server.post("/products/add", upload.single("image"), async (req, res) => {
  try {
    const { name, price, description, category } = req.body;
    const image = req.file.filename; // Store the filename of the uploaded image

    const newProduct = new Product({
      name,
      price,
      description,
      category,
      image
    });

    await newProduct.save(); // Save the product to the database
    res.redirect("/add-product");
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Error adding product.");
  }
});

// Edit Product Page
server.get("/products/edit/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find(); // Fetch categories for the dropdown
    res.render("admin/editProduct", { product, categories,layout: "layout" });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send("Error fetching product.");
  }
});

// POST route to edit a product
server.post("/products/edit/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, price, description, category } = req.body;

    // Fetch the existing product
    const product = await Product.findById(req.params.id);

    // Check if a new image was uploaded
    const updatedData = {
      name,
      price,
      description,
      category,
      image: req.file ? req.file.filename : product.image // Keep the old image if no new image is uploaded
    };

    // Update the product in the database
    await Product.findByIdAndUpdate(req.params.id, updatedData);

    res.redirect("/add-product");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send("Error updating product.");
  }
});

// Delete Product
server.get("/products/delete/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/add-product");
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).send("Error deleting product.");
  }
});

/********* USER ROUTES *********/
// Route to fetch and render products with pagination
server.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter (default to page 1)
  const skip = (page - 1) * ITEMS_PER_PAGE; // Calculate the number of products to skip

  try {
    // Fetch products with pagination
    const products = await Product.find()
      .skip(skip) // Skip products based on the page
      .limit(ITEMS_PER_PAGE); // Limit the number of products per page

    // Get the total number of products in the database
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE); // Calculate total pages

    // Render the homepage with products and pagination data
    res.render('homepage', {
      products: products,
      currentPage: page, // Current page number
      totalPages: totalPages, // Total number of pages
      layout:"mainLayout"
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Server error");
  }
});

// Route to add product to cart
server.post("/cart/add", (req, res) => {
  const { productId } = req.body;
  req.session.cart.push(productId);
  res.redirect("back");
});

//Route for cart page
server.get('/cart', async (req, res) => {
  try {
    const cartProductIds = req.session.cart; // Get product IDs from session
    const productsInCart = await Product.find({ '_id': { $in: cartProductIds } }); // Find the products in the cart by their IDs

    // Render the cart page with the products
    res.render('cart', {
      products: productsInCart,
      cartCount: req.session.cart.length, // Show number of products in cart
      layout:"mainLayout"
    });
  } catch (err) {
    console.error("Error fetching cart products:", err);
    res.status(500).send("Error fetching cart products.");
  }
});
//Route for checkout
server.get('/checkout', async (req, res) => {
  try {
    const cartProductIds = req.session.cart || []; // Get product IDs from session (default to empty array)
    const productsInCart = await Product.find({ '_id': { $in: cartProductIds } }); // Find the products by their IDs

    // Calculate total price
    const totalPrice = productsInCart.reduce((total, product) => total + product.price, 0);

    // Render checkout page with products and total price
    res.render('checkout', {
      products: productsInCart,
      totalPrice: totalPrice,
      layout:"mainLayout"
    });
  } catch (err) {
    console.error("Error fetching cart products:", err);
    res.status(500).send("Error fetching cart products.");
  }
});
//Post
server.post('/checkout', async (req, res) => {
  console.log(req.body);  // Log the request body for debugging

  const { name, address, phone, totalPrice } = req.body;

  if (!name || !address || !phone || !totalPrice) {
    return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
  }

  const newOrder = new Order({
    name,
    address,
    phone,
    products: req.session.cart, // Assuming the cart products are in session
    totalPrice
  });

  try {
    await newOrder.save();
    req.session.cart = [];  // Clear the cart after order is saved
    res.status(200).json({ success: true, message: 'Your order has been confirmed!' });
  } catch (err) {
    console.error('Error processing the order:', err);
    res.status(500).json({ success: false, message: 'Error processing the order. Please try again.' });
  }
});


// Admin Orders (protected)
server.get("/admin/orders", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("products")
      .sort({ createdAt: -1 }); // Sort by creation date in descending order
    res.render("admin/orders", { orders, layout: "layout" });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).send("Error fetching orders.");
  }
});

// Start Server
server.listen(5000, () => {
  console.log("Server Started at http://localhost:5000");
});
