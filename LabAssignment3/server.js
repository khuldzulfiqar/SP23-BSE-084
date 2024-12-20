const express = require("express");
let server = express(); // Consistently use 'server' as the variable name

const bodyParser = require("body-parser");
const Product = require("./models/products");
const Category = require('./models/category'); 
const mongoose = require('mongoose');
const expressLayouts = require("express-ejs-layouts");

server.set("view engine", "ejs"); // Set EJS as the view engine

server.use(express.static("public")); // Serve static files from the 'public' folder

server.use(expressLayouts);



mongoose
  .connect('mongodb://localhost:27017/Fusionic')
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));


  const multer = require("multer");
  const path = require("path");
  
  // Configure storage for Multer
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./public/uploads"); // Directory to store uploaded images
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Generate unique filenames
    }
  });
  
  // File filter to accept only image files
  const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and JPG are allowed."));
    }
  };
  
  // Initialize Multer with the storage and file filter
  const upload = multer({ storage, fileFilter });
  

// Set the number of products per page
const ITEMS_PER_PAGE = 6;

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
          layout: false
      });
  } catch (err) {
      console.error("Error fetching products:", err);
      res.status(500).send("Server error");
  }
});


// Admin panel route
server.get("/admin", (req, res) => {
  return res.render("admin"); // Specify the admin layout
});


// Manage Categories route
server.get("/add-category", async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch all categories
    res.render("admin/manageCategories", { categories }); // Pass categories to the EJS view
  } catch (err) {
    res.status(500).send("Error fetching categories");
  }
});


// Add a new category
server.get("/categories/add", (req, res) => {
  res.render("admin/addCategory"); // Create this EJS file
});
//Post

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
    res.render("admin/editCategory", { category }); // Create this EJS file
  } catch (err) {
    res.status(500).send("Error fetching category");
  }
});
//Post
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


// Manage Products page
server.get("/add-product", async (req, res) => {
  try {
    const products = await Product.find().populate("category"); // Populate category info
    res.render("admin/manageProducts", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products.");
  }
});

// Add New Product Page
server.get("/products/add", async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch all categories for the dropdown
    res.render("admin/addProduct", { categories });
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
    res.render("admin/editProduct", { product, categories });
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


server.listen(5000, () => {
  console.log("Server Started at http://localhost:5000");
});