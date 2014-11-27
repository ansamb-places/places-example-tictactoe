module.exports = function(register, DataTypes) {
  return register('tictactoe', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      references: 'contents',
      referencesKey: 'id',
      onDelete: 'cascade',
      onUpdate: 'cascade'
    },
    x: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    y: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    value: {
      type: DataTypes.STRING,
      defaultValue: 'empty'
    }
  }, {
    associate: function(models) {
      return this.belongsTo(models.global.content, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
        as: 'Content'
      });
    }
  });
};
