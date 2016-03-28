/**
 * 由于各数据库模块包的接口差异过大, 因此重新封装一层, 减少代码判断
 *
 * Usage: 对sqlite操作模块sql.js的二次封装
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

var driver = require('sql.js');
var engine;

var recordSet = require('./recordSet.js');

var fs = require('fs');

exports.State = 0;      // 默认为数据库关闭状态

exports.open = function(options) {
    this.options = options;

    if (fs.existsSync(options.dbPath)) {
        var buffer = fs.readFileSync(options.dbPath);
        engine = new driver.Database(buffer);
    } else {
        engine = new driver.Database();
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
        engine.run(sql);
        var data = engine.export();
        var buffer = new Buffer(data);
        fs.writeFileSync(this.options.dbPath, buffer);
    }
};

exports.exec = function(sql, type) {
    var extra, ret, rs;
    if (type === 0) {
        extra = 'select last_insert_rowid() as id, changes() as ar;'
        engine.run(sql);
    } else if (type === 1) {
        ret = engine.exec(sql);
    } else if (type === 2) {
        extra = 'select changes() as ar;'
        engine.run(sql);
    }

    if (extra) {
        ret = engine.exec(extra);

        var data = engine.export();
        var buffer = new Buffer(data);
        fs.writeFileSync(this.options.dbPath, buffer);

        rs = resultToRecord(ret);

        return new recordSet(rs, sql);
    } else {
        rs = resultToRecord(ret);

        return new recordSet(rs, sql);
    }
};

// http://www.jb51.net/w3school/ado/app_schemaenum.htm
exports.openSchema = function(type) {
    var sql, ret, rs;
    var args = Array.prototype.slice.call(arguments);
    switch (type) {
        case 4:
            rs = {fields: [], types: [], values: [[]]};
            sql = "PRAGMA table_info([" + args[1] + "])";
            ret = engine.exec(sql)[0];
            ret.values.forEach(function(value, index) {
                rs.fields.push(value[1]);
                rs.types.push(value[2].replace(/\s.*$/, ''));
            });

            return new recordSet(rs, "select * from [" + args[1] + "] limit 0");

            break;
        case 20:
            sql = "select name as TABLE_NAME, type as TABLE_TYPE from sqlite_master";
            ret = engine.exec(sql)[0];
            ret.values.forEach(function(value, index) {
                if (value[0] === 'sqlite_sequence') {
                    value[1] = 'SYSTEM';
                } else {
                    value[1] = value[1].toUpperCase();
                }
            });
            rs = {
                fields: ret.columns,
                values: ret.values
            };

            return new recordSet(rs, sql);

            break;
    }
};

exports.close = function() {
    this.State = 0;     // 标识数据库已经关闭
    engine.close();
};

exports.Properties = function(name) {
    var ret;
    // 查数据库版本
    ret = engine.exec('select sqlite_version(*) as version')[0];
    var version = ret.values[0][0];

    var properties = {
        'DBMS Version': {
            Name: 'DBMS Version',
            Value: version
        }
    }

    return properties[name];
};

function resultToRecord(result) {
    if ( !result.length ) {
        return {
            fields: [],
            values: []
        }
    } else {
        return {
            fields: result[0].columns,
            values: result[0].values
        }
    }
}