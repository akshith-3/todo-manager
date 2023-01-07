/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Todo.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }

    static async overdue(userId) {
      return await Todo.findAll({
        where: {
          dueDate: { [Op.lt]: new Date().toLocaleDateString("en-CA") },
          userId: userId,
          completed:false,
        },
        order:[["id","ASC"]],
      });
    }

    static async dueToday(userId) {
      return await Todo.findAll({
        where: {
          dueDate: { [Op.eq]: new Date().toLocaleDateString("en-CA") },
          userId: userId,
          completed:false,
        },
        order:[["id","ASC"]],
      });
    }

    static async dueLater(userId) {
      return await Todo.findAll({
        where: {
          dueDate: { [Op.gt]: new Date().toLocaleDateString("en-CA") },
          userId: userId,
          completed:false,
        },
        order:[["id","ASC"]],
      });
    }

    static async completedTodo(userId){
      return await Todo.findAll({
        where:{
          completed:true,
          userId: userId,
        }
      })
    }

    setCompletionStatus(completed){
      console.log(completed);
      return this.update({completed:completed});
    }

    static getTodos(){
      return this.findAll();
    }
    static addTodo({ title, dueDate }) {
      return this.create({ title: title, dueDate: dueDate, completed: false,userId: userId, });
    }

    markAsCompleted() {
      return this.update({ completed: true });
    }

    static async remove(id,userId) {
      return this.destroy({
        where: {
          id: id,
          userId: userId,
        },
      });
    }

  }
  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
