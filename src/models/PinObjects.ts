import * as Sequelize from 'sequelize';
import {sequelize} from '../db/db';

const _ = require('lodash');


export const PinObjects = sequelize.define(
  'pin_object',
  {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    request_id: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    user_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    cid: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    info: Sequelize.JSON,
    meta: Sequelize.JSON,
    delegates: Sequelize.TEXT,
    origins: Sequelize.TEXT,
    create_time: Sequelize.DATE,
    update_time: Sequelize.DATE,
    deleted: Sequelize.INTEGER,
  },
  {
    timestamps: false,
    tableName: 'pin_object',
  }
);

