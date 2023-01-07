/* eslint-disable no-undef */
const express = require("express");
const app = express();
const { Todo,User } = require("./models");
var csurf=require("tiny-csrf");
const bodyParser = require("body-parser");
const path = require("path");
var cookieParser=require("cookie-parser");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
const saltRounds = 10;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended : false }));
app.use(cookieParser("shh! some secret string"));
app.use(csurf("this_should_be_32_character_long",["POST","PUT","DELETE"]));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(flash());
app.use(
  session({
    secret: "my-super-secret-key-1234567890",
    Cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, {
              message: "Invalid Emailid or password",
            });
          }
        })
        .catch((error) => {
          return done(null, false, { message: "Invalid Emailid or password" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async function (request, response) {
  if (request.user) {
    return response.redirect("/todos");
  } else {
    response.render("index", {
      title: "Todo Application",
      csrfToken: request.csrfToken(),
    });
  }
});
app.get("/todos",connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try{
    const loggedInUser = request.user.id;
    const firstName = request.user.firstName;
    const lastName = request.user.lastName;
    const overdue = await Todo.overdue(loggedInUser);
    const dueToday = await Todo.dueToday(loggedInUser);
    const dueLater= await Todo.dueLater(loggedInUser);
    const completed=await Todo.completedTodo(loggedInUser);
    if (request.accepts("html")) {
      response.render("todos", {
        firstName,
        lastName,
        title: "Todo Application",
        overdue,
        dueToday,
        dueLater, 
        completed,
        csrfToken: request.csrfToken(),
    });
    } else {
      response.json({
        firstName,
        lastName,
        overdue,
        dueToday,
        dueLater,
        completed,
      });
    }catch(err){
      console.log(err);
  }
});
  app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "signup",
    csrfToken: request.csrfToken(),
  });
});

app.get("/login", (request, response) => {
  response.render("login", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});

app.get("/signout", (request, response) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.get("/todos", async function (_request, response) {
  console.log("Processing list of all Todos ...");
  // FILL IN YOUR CODE HERE

  // First, we have to query our PostgerSQL database using Sequelize to get list of all Todos.
  // Then, we have to respond with all Todos, like:
  // response.send(todos)
  try {
    const todos = await Todo.findAll({ order: [["id", "ASC"]] });
    return response.json(todos);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});
  app.post("/users", async function (request, response) {
  let pattern = new RegExp("^\\s");
  let result = Boolean(pattern.test(request.body.firstname));
  console.log(result);
  if (result) {
    request.flash("error", "First name Required");
    return response.redirect("/signup");
  }
  if (request.body.email.length == 0) {
    request.flash("error", "Email Required");
    return response.redirect("/signup");
  }
  if (request.body.password.length == 0) {
    request.flash("error", "Password Required");
    return response.redirect("/signup");
  }
  console.log("creating new User", request.body);
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: request.body.firstname,
      lastName: request.body.lastname,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/todos");
      } else {
        request.flash("success", "Successfully Signed up");
        response.redirect("/todos");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "Email already Exists");
    return response.redirect("/signup");
  }
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/todos");
  }
);

app.post("/todos",connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
    let pattern = new RegExp("^\\s");
    let result = Boolean(pattern.test(request.body.title));
    console.log(result);
    if (result) {
      request.flash("error", "Enter the title");
      return response.redirect("/todos");
    } else if (request.body.title.length < 5) {
      request.flash("error", "Title should be atleast 5 character");
      return response.redirect("/todos");
    }
    if (request.body.dueDate.length == 0) {
      request.flash("error", "Enter the dueDate");
      return response.redirect("/todos");
    }
  console.log("creating new todo",request.body);
  try {
    await Todo.addTodo({
      title: request.body.title,
      dueDate: request.body.dueDate,
      userId:request.user.id,
    });
    return response.redirect("/todos");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id",connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  console.log("we have to update a todo with ID:",request.params.id);
  try {
    const todo = await Todo.findByPk(request.params.id);
    const updatedTodo = await todo.setCompletionStatus(request.body.completed);
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id",connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  console.log("Delete a todo with ID: ", request.params.id);
  // FILL IN YOUR CODE HERE

  // First, we have to query our database to delete a Todo by ID.
  // Then, we have to respond back with true/false based on whether the Todo was deleted or not.
  // response.send(true)
  //const affectedRow = await Todo.destroy({ where: { id: request.params.id } });
  //response.send(affectedRow ? true : false);
  try{
    console.log("We have to delete a Todo with ID: ", request.params.id);
    const loggedInUser = request.user.id;
    const todo = await Todo.remove(request.params.id,loggedInUser);
    response.send(todo ? true : false);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

module.exports = app;
