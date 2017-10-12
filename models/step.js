'use strict';
module.exports = function(sequelize, DataTypes) {
  var Step = sequelize.define('Step', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    key: {
      type: DataTypes.STRING
    }
  }, {
    classMethods: {
    }
  });
  Step.associate = function(models){
    Step.belongsTo(models.User, {foreignKey: 'user_id'})
  };
  return Step;
};