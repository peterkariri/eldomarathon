const express=require('express');
const path=require('path');
const app=express();
const port=8080;
const mysql=require('mysql');
const bcrypt=require("bcrypt")
const session=require("express-session");
const cookieParser=require("cookie-parser");
const { log } = require('console');
//creating sql connection
const connection = mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password:"",
    database:"house_management"

});
connection.connect((err)=>{
    if(err){
        console.log("error connecting to database ");
    }
    else{
        console.log("database connected successfully");
    }
})

app.set('view engine','ejs' )

//using ejs 

//serve static files 
app.use(express.static("public"))
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(session({ secret:'point',resave:false,saveUninitialized:false,cookie:{maxAge:3000000}}))

//defining routes
//protected routes
const maintenanceRequests = [
  {
    residence: "123 Main St",
    tenantName: "John Doe",
    roomNumber: "101",
    maintenanceType: "Leaky Faucet",
    urgency: "High",
    status: false,
    description: "Water is leaking from the base of the faucet in the bathroom sink. It seems to be getting worse and is causing a puddle on the floor.",
  },
  {
    residence: "456 Elm St",
    tenantName: "Jane Smith",
    roomNumber: "202",
    maintenanceType: "Clogged Drain",
    urgency: "Medium",
    status: false,
    description: "The kitchen sink drain is clogged and water is not draining properly. I've tried using a plunger but it's not working.",
  },
  {
    residence: "789 Oak St",
    tenantName: "Bob Johnson",
    roomNumber: "303",
    maintenanceType: "Broken Light",
    urgency: "Low",
    status: false,
    description: "The overhead light fixture in the living room is not working. I've tried replacing the bulb but that didn't fix it.",
  },
  // Add more requests here following the same structure
  {
    residence: "987 Maple St",
    tenantName: "Alice White",
    roomNumber: "404",
    maintenanceType: "Faulty Outlet",
    urgency: "Medium",
    status: false,
    description: "The electrical outlet in the bedroom is not working. It seems to have tripped the circuit breaker a few times.",
  },
  {
    residence: "543 Pine St",
    tenantName: "Charles Jones",
    roomNumber: "212",
  },
];
const protectedRoutes = [
  "/tenant/dashboard",
  "/tenant/lease_details",
  "/tenant/maintenance_requests",
  "/landlord/dashboard",
  "/landlord/manage_properties",
  "/landlord/tenant_information",
];
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    next();
  } else if (protectedRoutes.includes(req.path)) {
    // Set redirection history cookie
    let path = req.path;
    if (Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query).toString();
      path += `?${queryString}`;
    }
    res.cookie("redirectHistory", path, {
      maxAge: 1000 * 60 * 60 * 24, // Expires in 24 hours
      httpOnly: false, // Restricts access from client-side JavaScript
    });
    res.redirect("/login?message=login");
  } else {
    next();
  }
});
//public routes
app.get('/',(req,res)=>{
   res.render("home.ejs")
})
app.get('/about',(req,res)=>{
    res.render("about.ejs")
 })
 app.get('/services',(req,res)=>{
    res.render("services.ejs")
 })
 app.get('/contact',(req,res)=>{
  res.render("contact.ejs")
})
//tenants` routes
app.get('/tenant/dashboard', (req, res) => {
    const tenantId = req.session.user.tenantId;
  
    // Prepare parameterized queries to prevent SQL injection
    const tenantSql = `SELECT * FROM tenant WHERE id = ?`;
    const paymentSql = `SELECT * FROM payment WHERE id = ?`;
    const leaseSql = `SELECT * FROM lease WHERE id = ?`;
    const maintenanceSql = `SELECT * FROM maintenance_request WHERE id = ?`;
  
    connection.query(tenantSql, tenantId, (err, tenantData) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error fetching tenant data');
      }
  
      const user = tenantData[0];
  
      // Execute remaining queries in parallel using Promise.all
      Promise.all([
        connection.query(paymentSql, tenantId),
        connection.query(leaseSql, tenantId),
        connection.query(maintenanceSql, tenantId),
      ])
        .then(([paymentData, leaseData, maintenanceData]) => {
          res.render('tenant/dashboard.ejs', {
            user,
            paymentData,
            leaseData,
            maintenanceData,
          });
        })
        .catch((error) => {
          console.error(error);
          return res.status(500).send('Error fetching tenant information');
        });
    });
  });
  
app.get('/tenant/lease_details',(req,res)=>{
    res.render('tenant/lease_details.ejs')

})
app.get('/tenant/payment', (req, res) => {
  res.render('tenant/payment.ejs')
})

app.get('/tenant/maintenance_requests',(req,res)=>{
    res.render('tenant/maintenance_requests.ejs',{maintenanceRequests})
})
//post routes for maintenance requests
app.post('tenant/maintenance-requests', (req, res) => {
  // Extract form data
/*   const { urgency, category, description } = req.body;
 */
  // Insert form data into database
  const sql = 'INSERT INTO  maintenance_request(urgency,category,description) VALUES (?, ?, ?)';
  connection.query(sql, [req.body.urgency, req.body.category, req.body.description], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error submitting maintenance request');
    } else {
      res.status(200).send('Maintenance request submitted successfully');
    }
  });
});


// Landlord routes
app.get('/landlord/dashboard', (req, res) => {
    res.render('landlord/dashboard1.ejs');
});

app.get('/landlord/manage_properties', (req, res) => {
     res.render('landlord/manage_properties.ejs');
});
app.get('/landlord/payments', (req, res) => {
  res.render('landlord/payment.ejs');
});
app.get('/landlord/tenant_information', (req, res) => {
    res.render('landlord/tenant_information.ejs');
});
app.get('/landlord/maintenance', (req, res) => {
  res.render('landlord/maintenance.ejs',{maintenanceRequests});
});

app.get("/signup",(req,res)=>{
    res.render('signup.ejs');
})

app.get("/login", (req,res)=>{   
    if(req.query.signupSuccess){
        res.render("login.ejs", {message: "Signup successful!! You can now log in."})
    }else if(req.query.message){
        res.render("login.ejs", {message: "Sign in to your dashboard."})
    }else{
         res.render("login.ejs")
    }
})       




//post routes

//login routes
app.post("/login",(req,res)=>{
      // Get the email from the request body
      const email = req.body.email;

      // Define the login query with a parameterized placeholder
      const loginStatement = `SELECT * FROM users WHERE email =?`;
  
      // Execute the query with the provided email
      connection.query(loginStatement, [email], (sqlErr, userData) => {
          if (sqlErr) {
              // Log the error and render the login page with an error message
              console.log(sqlErr.message);
              res.status(500).render("login.ejs", {
                  error: true,
                  message: "Server Error, Contact Admin if this persists!",
                  prevInput: req.body
              });
          } else {
              // Check if the user exists
              if (userData.length === 0) {
                  // Render the login page with an error message
                  res.status(401).render("login.ejs", {
                      error: true,
                      message: "Email or Password Invalid",
                      prevInput: req.body
                  });
              } else {
                  // Compare the provided password with the stored hash
                  if (bcrypt.compareSync(req.body.password, userData[0].password)) {
                      // Create a session
                      res.cookie("email", userData[0].email, { maxAge: 6000 });
                      req.session.user = {
                          id: userData[0].id,
                          email: userData[0].email,
                          tenantId: userData[0].id
                      };
  
                      // Check if this was a redirection and redirect the user back to where they were
                      if (req.cookies.redirectHistory) {
                        let redirectPath = req.cookies.redirectHistory;
                        res.clearCookie("redirectHistory");
                        res.redirect(redirectPath);
                      } else {
                        res.redirect("/");
                      }
                  } else {
                      // Render the login page with an error message
                      res.status(401).render("login.ejs", {
                          error: true,
                          message: "Email or Password Invalid",
                          prevInput: req.body,
                          
                      }
                     
                    );
                    console.log(err)
                  }
              }
          }
      });
  });
  


//sign up
app.post("/signup", (req,res)=>{
    if(req.body.password === req.body.confirmPass){
      let hashedPassword = bcrypt.hashSync(req.body.password, 5);
      let sqlStatement = `INSERT INTO users(fullname,email,phone,password,role) VALUES( "${req.body.fullname}","${req.body.email}","${req.body.phone}", "${hashedPassword}","${req.body.role}" )`
      connection.query(sqlStatement, (sqlErr)=>{
        if(sqlErr){
          res.status(500).render("signup.ejs", {error: true, errMessage: "Server Error: Contact Admin if this persists.", prevInput: req.body  } )
        }else{
          connection.query(`SELECT email FROM users WHERE email = "${req.body.email}"`, (sqlError, emailData)=>{
            if(sqlError){
              res.status(500).render("signup.ejs", {error: true, errMessage: "Server Error: Contact Admin if this persists.", prevInput: req.body  } )
            }else{
              if(emailData.length>0){
                res.render("signup.ejs", {error: true, errMessage: "Email Already Registered. Login with email and password!", prevInput: req.body  } )
              }else{
                res.status(304).redirect("/signin?signupSuccess=true")
              }
            }
          })             
        }
      })             
    }else{
      res.render("signup.ejs", {error: true, errMessage: "password and confirm password do not match!", prevInput: req.body  } )
    }
    console.log(req.body)
  })

  //login out route
  app.get("/logout", (req,res)=>{
    req.session.destroy()
    res.redirect("/")
})
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});





