import {sequelize} from '../db/db';
import * as Sequelize from 'sequelize';
import {DataTypes} from "sequelize";

const Configs = sequelize.define(
    'configs',
    {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        key: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        value: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        create_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        last_update_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    },
    {
        timestamps: false,
        tableName: 'configs',
    }
);

module.exports = Configs;
