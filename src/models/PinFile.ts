import {sequelize} from '../db/db';
const { DataTypes } = require('sequelize');
import { Sequelize } from 'sequelize';
export const PinFile = sequelize.define(
    'pin_file',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        cid: { type: DataTypes.STRING, allowNull: false },
        pin_status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        order_retry_times: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        local_pin_status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        local_pin_retry_times: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        thunder_pin_status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        file_size: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
        calculated_at: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
        expired_at: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
        replica_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
        create_time: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        update_time: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    },
    {
        timestamps: false,
        tableName: 'pin_file',
    }
);
