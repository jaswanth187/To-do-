import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const saltRounds = 10;

app.use(express.static("public"));

// Using session we are bypassing the users login
// The session should always be above the passport middleware
app.use(
  session({
    secret: "TOPSECRET",
    // resave helps in saving the session to the database
    resave: false,
    // saveUninitialized helps in saving the session to the server
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "permalist",
  password: "12345",
  port: "5432",
});
db.connect();
let result = [];

app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const result = await db.query("SELECT * FROM todo ORDER BY id ASC");
      const data = result.rows;
      console.log(data);
      res.render("index.ejs", { result: data });
    } catch (err) {
      res.sendStatus("400");
    }
  } else {
    res.redirect("/login");
    return; // Add this return statement
  }
});

app.get("/home", (req, res) => {
  res.render("welcome.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});
app.post("/register", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  // if (username && password) {
  try {
    const checkResult = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("error hashing password", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
            [username, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
  // }
  //   res.render("register.ejs");
});

// LOGGING IN WITH PASSPORT MIDDLEWARE
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.post("/add", async (req, res) => {
  const new_item = req.body.new_item;

  try {
    await db.query("INSERT INTO  todo (title) VALUES($1)", [new_item]);
    res.redirect("/");
  } catch (err) {
    console.log("there is an error", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/edit", async (req, res) => {
  const id = req.body.updatedItemId;
  const title = req.body.updatedItemTitle;
  try {
    await db.query("UPDATE todo SET title=$1 WHERE id=$2", [title, id]);
    res.redirect("/");
  } catch (err) {
    console.log("there is an error", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/delete", async (req, res) => {
  const id = req.body.deleteItemId;
  try {
    await db.query("DELETE FROM todo WHERE id=$1", [id]);
    res.redirect("/");
  } catch (e) {
    console.log("there is an error", err);
    res.status(500).send("Internal Server Error");
  }
});

passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query(
        "SELECT * FROM users WHERE username = $1 ",
        [username]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              //Passed password check
              return cb(null, user);
            } else {
              //Did not pass password check
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(3000, (req, res) => {
  console.log("this is listening");
});

//   try {
//     await new Promise((resolve) => {
//       result.push(new_item);
//       resolve();
//     });
//     res.redirect("/");
//   }

// if (username && password) {
//   console.log("this is in if statemtn");
//   // if (!username || !password) return res.redirect("/login?error=emptyinput");
//   try {
//     await db.query("INSERT INTO users (username, password) values ($1, $2)", [
//       username,
//       password,
//     ]);
//     res.redirect("/login");
//   } catch (err) {
//     console.log("there is an error", err);
//     res.status(500).send("Internal Server Error");
//   }
// }

// LOGGIND WITHOUT THE PASSPORT MIDDLEWARE
// app.post("/login", async (req, res) => {
//   const username = req.body.username;
//   const password = req.body.password;
//   try {
//     const result = await db.query("SELECT * FROM users WHERE username = $1", [
//       username,
//     ]);
//     if (result.rows.length > 0) {
//       const user = result.rows[0];
//       const storedPassword = user.password;
//       bcrypt.compare(password, storedPassword, (err, result) => {
//         if (err) {
//           console.log("Error comparing password");
//         } else {
//           if (result) {
//             console.log("redirected to the home page");
//             res.redirect("/");
//           } else {
//             res.send("Incorrect username or password");
//           }
//         }
//       });
//     }
//   } catch (err) {
//     console.log("user not found");
//   }
//   // try {
//   //   const result = await db.query(
//   //     "SELECT * FROM users WHERE username = $1 AND password = $2",
//   //     [username, password]
//   //   );
//   //   const user = result.rows[0];
//   //   const storedPassword=user.password
//   //   if (result.rows.length > 0) {
//   //     res.redirect("/");
//   //   } else {
//   //     res.send("Incorrect username or password");
//   //   }
//   // } catch (err) {
//   //   console.log(err);
//   // }
// });

// SIGN UP ROUTE
// app.post("/register", async (req, res) => {
//   let username = req.body.username;
//   let password = req.body.password;
//   if (username && password) {
//     try {
//       const result = await db.query(
//         "INSERT INTO users (username, password) values ($1, $2)",
//         [username, password]
//       );
//       console.log(result);
//       res.redirect("login");
//     } catch (err) {
//       console.log("there is an error", err);
//       res.status(500).send("Internal Server Error");
//     }
//   }
//   res.render("register.ejs");
// });
