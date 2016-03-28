/**
 * 由于各数据库模块包的接口差异过大, 因此重新封装一层, 减少代码判断
 *
 * Usage: 对mysql操作模块node-mysql的二次封装
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

var sync = require('deasync');
var driver = require('mysql');
var engine;

var recordSet = require('./recordSet.js');

exports.State = 0;      // 默认为数据库关闭状态

exports.open = function(options) {
    this.options = options;

    engine = driver.createConnection({
        host     : options.server,
        port     : options.dbPort,
        user     : options.dbUser,
        password : options.dbCode,
        database : options.dbName
    });

    engine.connect();

    // 将mysql包装成同步，便于统一API
    engine.exec = function(sql) {
        var done = false;
        var data;

        var options = {
            sql: sql,
            nestTables: '_',
            typeCast: function (field, next) {
                if (field.type == 'BIT') {
                    return (field.buffer()[0] === 1); // 1 = true, 0 = false
                }
                return next();
            }
        };

        engine.query(options, function(err){
            var args = Array.prototype.slice.call(arguments, 1);
            data = {err: err, result: args};
            done = true;
        });

        sync.loopWhile(function(){return !done;});

        if (data.err) {
            throw data.err;
        } else {
            return data.result;
        }
    }

    this.State = 1;     // 标识数据库已经打开

    return this;
};

/**
 * 暂时没有处理一次执行多条sql查询语句的情况
 * @param sql
 * @returns {RecordSet}
 */
exports.execute = function(sql) {
    // 如果是查询语句
    if ( /^(select|call|exec)\s/i.test(sql) ) {
        var ret = engine.exec(sql);
        var rs = resultToRecord(ret);

        return new recordSet(rs, sql);
    } else {
        engine.exec(sql);
    }
};

exports.exec = function(sql, type) {
    var rs;
    var ret = engine.exec(sql);

    if (type === 0) {
        rs = {
            fields: ['id', 'ar'],
            values: [[ret[0].insertId, ret[0].affectedRows]]
        };
    } else if (type === 1) {
        rs = resultToRecord(ret);
    } else if (type === 2) {
        rs = {
            fields: ['ar'],
            values: [[ret[0].affectedRows]]
        };
    }

    return new recordSet(rs, sql);
};

// http://www.jb51.net/w3school/ado/app_schemaenum.htm
exports.openSchema = function(type) {
    var sql, ret, rs;
    var args = Array.prototype.slice.call(arguments);
    switch (type) {
        case 4:
            rs = {fields: [], types: [], values: [[]]};
            sql = "select * from `" + args[1] + "` limit 0";
            ret = engine.exec(sql)[1];
            ret.forEach(function(field) {
                rs.fields.push(field.name);
                rs.types.push(field.type);
            });

            return new recordSet(rs, sql);

            break;
        case 20:
            sql = "select TABLE_NAME, TABLE_TYPE from information_schema.tables where table_schema='" + this.options.dbName + "'";
            ret = engine.exec(sql);

            rs = resultToRecord(ret);
            rs.values.forEach(function(value, index) {
                if (value[1] === 'BASE TABLE') {
                    value[1] = 'TABLE';
                }
            });

            return new recordSet(rs, sql);

            break;
    }
};

exports.close = function() {
    this.State = 0;     // 标识数据库已经关闭
    engine.destroy();
};

exports.Properties = function(name) {
    var ret;
    // 查数据库版本
    ret = engine.exec('select version() as version');
    var version = ret[0][0]._version;

    var properties = {
        'DBMS Version': {
            Name: 'DBMS Version',
            Value: version
        }
    }

    return properties[name];
};

function resultToRecord(result) {
    var fields = [], values = [];

    result[0].forEach(function(RowDataPacket) {
        var arr = [];
        for (var i in RowDataPacket) {
            arr.push(RowDataPacket[i]);
        }
        values.push(arr);
    });

    result[1].forEach(function(FieldPacket) {
        fields.push(FieldPacket.orgName);
    });

    return {
        fields: fields,
        values: values
    }
}