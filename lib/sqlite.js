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

        getSchemas(options.dbPath);
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

        // 将查询结果转为js对象, 兼容其它数据库
        formatValues(rs, sql, this.options.dbPath);

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

        // 将查询结果转为js对象, 兼容其它数据库
        formatValues(rs, sql, this.options.dbPath);

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

function getSchemas(dbPath) {
    var crypto = require('crypto');
    var sha1 = crypto.createHash('sha1');
    sha1.update(dbPath);
    var schemaKey = sha1.digest('hex');

    if (schemaCache[schemaKey]) return;

    var ret, sql, tables = [], schema = {}, fields;

    // 先查所有的表名
    sql = "select name from sqlite_master where type='table'";
    ret = engine.exec(sql)[0];
    ret.values.forEach(function(value) {
        if (value[0] !== 'sqlite_sequence') {
            tables.push(value[0]);
        }
    });

    // 依次查每个表中对应的字段类型
    tables.forEach(function(table, index) {
        fields = {};
        sql = "PRAGMA table_info([" + table + "])";
        ret = engine.exec(sql)[0];
        ret.values.forEach(function(value, index) {
            var func = null;   // 转换函数
            var name = value[1];
            var type = value[2].replace(/\s.*$/, '').toLowerCase();

            switch (type) {
                case "bit":
                case "boolean":
                    func = function(value) {
                        return value === 1;
                    }
                    break;
                case "date":
                case "datetime":
                    func = function(value) {
                        return new Date(value);
                    }
                    break;
            }

            fields[name] = func;
        });

        schema[table] = fields;
    });

    schemaCache[schemaKey] = schema;
}

function formatValues(result, sql, dbPath) {
    var crypto = require('crypto');
    var sha1 = crypto.createHash('sha1');
    sha1.update(dbPath);
    var schemaKey = sha1.digest('hex');
    sha1 = crypto.createHash('sha1');
    sha1.update(dbPath + sql);
    var formatKey = sha1.digest('hex');

    if (!result.values.length || !sql || !dbPath || !schemaCache[schemaKey]) return;

    var schema = schemaCache[schemaKey];
    var format = formatCache[formatKey];

    if (format) {
        format(result.values);
        return;
    }

    // 解析sql语句
    sql = sql.substring(0, sql.search(/\s(where|having|order|group|for|limit|offset|union)\s|$/i));
    sql = sql.replace(/select\s(top\s\d+\s)?/i, '');

    var tables = sql.split(/\sfrom\s/i)[1].split(',');  // 查询的表格
    var fields = sql.split(/\sfrom\s/i)[0].split(',');  // 查询的字段

    // 找出所有表的名称和别名
    var alias = {};
    tables.forEach(function(table, i) {
        table = table.trim().replace(/\[|]|`/g, '');
        if (table.contains(' ')) {
            // 有别名的情况
            table = table.split(/\s+/);
            tables[i] = table[0];
            alias[table.slice(-1)[0]] = table[0];
        } else {
            // 无别名的情况
            tables[i] = table;
        }
    });

    // 找出所有的查询字段
    var formats = [];
    fields.forEach(function(field) {
        // 跳过查询函数
        if (field.contains('(')) {
            formats.push(null);
            return;
        }

        field = field.trim().replace(/\[|]|`/g, '');
        field = field.split(/\s+/);
        field = field[0];

        if (field.contains('.')) {
            var piece = field.split('.');
            var table = piece[0];
            if (tables.indexOf(table) === -1) {
                table = alias[table];
            }
            if (field.contains('*')) {
                Object.keys(schema[table]).forEach(function(field) {
                    formats.push({
                        table: table,
                        field: field
                    });
                });
            } else {
                formats.push({
                    table: table,
                    field: piece[1]
                });
            }
        } else {
            if (field.contains('*')) {
                tables.forEach(function(table) {
                    Object.keys(schema[table]).forEach(function(field) {
                        formats.push({
                            table: table,
                            field: field
                        });
                    });
                })
            } else {
                formats.push({
                    table: tables[0],
                    field: field
                });
            }
        }
    });

    if (formats.length !== result.fields.length) {
        format = function() {};
    } else {
        var index = {}, length = 0;
        formats.forEach(function(f, i) {
            if (f && schema[f.table] && schema[f.table][f.field]) {
                length++;
                index[i] = schema[f.table][f.field];
            }
        });

        if ( !length ) {
            format = function() {};
        } else {
            var code = [];

            code.push('var index = {};');

            for (var i in index) {
                code.push(
                    'index[' + i + '] = ' + String(index[i]).replace(/ {20}/g, '') + ';'
                )
            }

            code.push('values.forEach(function(array) {');
            code.push('    for (var i in index) {');
            code.push('        array[i] = index[i](array[i]);');
            code.push('    }');
            code.push('});');

            code = code.join('\n');

            format = new Function('values', code);
        }
    }

    format(result.values);

    formatCache[formatKey] = format;
}

var schemaCache = {};   // 缓存表结构信息
var formatCache = {};   // 缓存格式化方法