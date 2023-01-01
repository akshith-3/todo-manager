/* eslint-disable no-undef */
const express = require("express");
const app = express();
const { Todo } = require("./models");
var csurf=require("tiny-csrf");
const bodyParser = require("body-parser");
const path = require("path");
var cookieParser=require("cookie-parser");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended : false }));
app.use(cookieParser("shh! some secret string"));
app.use(csurf("this_should_be_32_character_long",["POST","PUT","DELETE"]));

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", async function (request, response) {
  const overdue = await Todo.overdue();
  const dueToday = await Todo.dueToday();
  const dueLater= await Todo.dueLater();
  const completed=await Todo.completedTodo();
  if (request.accepts("html")) {
    response.render("index", {
      overdue,
      dueToday,
      dueLater, 
      completed,
      csrfToken: request.csrfToken(),
    });
  } else {
    response.json({
      overdue,
      dueToday,
      dueLater,
      completed,
    });
  }
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

app.post("/todos", async function (request, response) {
  console.log("creating new todo",request.body);
  try {
    await Todo.addTodo({
      title: request.body.title,
      dueDate: request.body.dueDate,
    });
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id", async function (request, response) {
  console.log("we have to update a todo with ID:",request.params.id);
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.setCompletionStatus(request.body.completed);
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  console.log("Delete a todo with ID: ", request.params.id);
  // FILL IN YOUR CODE HERE

  // First, we have to query our database to delete a Todo by ID.
  // Then, we have to respond back with true/false based on whether the Todo was deleted or not.
  // response.send(true)
  //const affectedRow = await Todo.destroy({ where: { id: request.params.id } });
  //response.send(affectedRow ? true : false);
  try{
    console.log("We have to delete a Todo with ID: ", request.params.id);
    const todo = await Todo.remove(request.params.id);
    response.send(todo ? true : false);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

module.exports = app;
