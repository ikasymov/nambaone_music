'use strict';
module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    sender_id: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false
    },
    current_data: {
      type: DataTypes.TEXT,
    },
  }, {
    classMethods: {
    }
  });
  User.associate = function(models){
    User.hasMany(models.Step, {foreignKey: 'user_id'})
  };
  return User;
};