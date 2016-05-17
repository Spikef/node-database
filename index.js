/***
 * Usage: 通用数据库操作模块
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

// uglifyjs index.dev.js -m -o index.js

var dbTypes = exports.dbTypes = require('./lib/databaseTypeCode.js');
var fdTypes = exports.fdTypes = require('./lib/commonFieldType.js');
var fdCodes = exports.fdCodes = require('./lib/fieldTypeCode.js');

/** 默认参数 **/
exports.options = { dbType: 0 };

/**
 * 连接并打开数据库
 * @param options: 数据库连接参数，具体参考config.json
 * @returns {exports|*}
 */
exports.connect = function(options) {
    var driver;     // 数据库操作模块, 因为不同模块的接口差异比较大, 因此全部封装成统一接口
    switch (options.dbType) {
        case dbTypes.access:
            // 不支持
            // 因为access和mssql数据库只能在windows平台下运行, 所以仍然考虑用ODBC来实现
            // https://github.com/Nuintun/node-adodb
            break;
        case dbTypes.mssql:
            // 不支持
            break;
        case dbTypes.mysql:
            options.dbPort = options.dbPort || 3306;
            driver = require('./lib/mysql');
            break;
        case dbTypes.sqlite:
            options.dbPath = require('path').resolve(options.dbPath);
            driver = require('./lib/sqlite');
            break;
    }

    if (driver) {
        try{
            this.conn = driver.open(options);
            this.options = options;

            return this;
        }catch (e){
            helper.throwError('数据库连接失败:' + e.message);
        }
    } else {
        helper.throwError('不支持的数据库连接类型。');
    }
};

/**
 * 设置要操作的表格，返回this。便于多次操作的链式写法。
 * @param tables: 表名，如果是多个表则使用数组
 * @returns {exports}
 */
exports.table = function(tables) {
    if ( !tables ) {
        helper.throwError('请指定正确的表格。');
    }

    if (typeof tables === 'string') tables = [tables];

    this.tables = tables;
    return this;
};

/**
 * 查询记录，返回this。后面可跟toJSON()以JSON返回，或者rs返回原始记录集对象。
 * @param tables: 表名，如果是多个表则使用数组
 * @param fields: 字段，如果是多个字段则使用数组
 * @param where: 可选，查询条件
 * @param orders: 可选，排序字段，如果是多个字段则使用数组
 * @param top: 可选，查询记录条数
 * @returns {exports}
 */
exports.select = function(tables, fields, where, orders, top) {
    var sql = this.produceSQL("select", tables, fields, where, orders, top);
    return helper.exec(sql, 1);
};

/**
 * 查询记录，返回this，用于链式写法操作相同表格。后面可跟toJSON()以JSON返回，或者rs返回原始记录集对象。
 * @param fields: 字段，如果是多个字段则使用数组
 * @param where: 可选，查询条件
 * @param orders: 可选，排序字段，如果是多个字段则使用数组
 * @param top: 可选，查询记录条数
 * @returns {exports}
 */
exports.sel = function(fields, where, orders, top) {
    return this.select(this.tables, fields, where, orders, top);
};

/**
 * 获取最后一条记录的id值
 * @param id: 要查询的id字段名称
 * @param table: 要查询的表格，如果省略则使用上一次操作的表格
 * @returns {number}
 */
exports.getLastId = function(id, table) {
    table = table || this.tables[0];

    if ( !id || !table) {
        helper.throwError('未指定表格或者字段名称。');
    }

    return this.select(table, 'max(' + id + ') as id').toJSON(0).id;
};

/**
 * 判断表中是否存在某字段值
 * @param where: 要查询的条件
 * @param table: 要查询的表格，如果省略则使用上一次操作的表格
 * @returns {boolean}
 */
exports.exist = function(where, table) {
    table = table || this.tables[0];

    if ( !where || !table) {
        helper.throwError('未指定表格或者判断条件。');
    }

    var rs = this.select(table, "*", where).rs;

    return rs && !(rs.EOF && rs.BOF);
};

/**
 * 插入记录，返回this。后面可跟ar返回受影响的行数。
 * @param tables: 表名，如果是多个表则使用数组
 * @param fields: 字段，如果是多个字段则使用数组
 * @returns {exports}
 */
exports.insert = function(tables, fields) {
    var sql = this.produceSQL("insert", tables, fields);
    return helper.exec(sql, 0);
};

/**
 * 插入记录，返回this，用于链式写法操作相同表格。后面可跟ar返回受影响的行数。
 * @param fields: 字段，如果是多个字段则使用数组
 * @returns {exports}
 */
exports.ins = exports.add = function(fields) {
    return this.insert(this.tables, fields);
};

/**
 * 更新记录，返回this。后面可跟ar返回受影响的行数。
 * @param tables: 表名，如果是多个表则使用数组
 * @param fields: 字段，如果是多个字段则使用数组
 * @param where: 可选，查询条件
 * @returns {exports}
 */
exports.update = function(tables, fields, where) {
    var sql = this.produceSQL("update", tables, fields, where);
    return helper.exec(sql, 2);
};

/**
 * 更新记录，返回this，用于链式写法操作相同表格。后面可跟ar返回受影响的行数。
 * @param fields: 字段，如果是多个字段则使用数组
 * @param where: 可选，查询条件
 * @returns {exports}
 */
exports.upd = function(fields, where) {
    return this.update(this.tables, fields, where);
};

/**
 * 删除记录，返回this。后面可跟ar返回受影响的行数。
 * @param tables: 表名，如果是多个表则使用数组
 * @param fields: 字段，如果是多个字段则使用数组
 * @param where: 可选，查询条件
 * @param orders: 可选，排序字段，如果是多个字段则使用数组
 * @param top: 可选，查询记录条数
 * @returns {exports}
 */
exports.remove = function(tables, fields, where, orders, top) {
    var sql = this.produceSQL("delete", tables, fields, where, orders, top);
    return helper.exec(sql, 2);
};

/**
 * 删除记录，返回this，用于链式写法操作相同表格。后面可跟ar返回受影响的行数。
 * @param fields: 字段，如果是多个字段则使用数组
 * @param where: 可选，查询条件
 * @param orders: 可选，排序字段，如果是多个字段则使用数组
 * @param top: 可选，查询记录条数
 * @returns {exports}
 */
exports.rem = exports.del = function(fields, where, orders, top) {
    return this.remove(this.tables, fields, where, orders, top);
};

/**
 * 执行SQL语句，返回记录集(this.rs)或受影响的行数(this.ar)。
 * @param sql: 要执行的sql语句(access语法)，为了兼容多种数据库，sql语句中的字符串全部需要使用'包围。
 * @returns {exports}
 */
exports.runsql = exports.runSQL = function(sql) {
    // 转换sql语句
    sql = this.resolveSQL.apply(this, arguments);

    // 判断是否是查询语句
    if ( /^(insert|select into)\s/i.test(sql) ) {
        helper.exec(sql, 0);
    } else if ( /^(select|call|exec)\s/i.test(sql) ) {
        helper.exec(sql, 1);
    } else {
        helper.exec(sql, 2);
    }

    // 构造toString();
    this.toString = function() { return sql };

    return this;
};

/**
 * 分页查询，可以是单表、多表连接或者包含子查询的复杂SQL查询语句。
 * 为了兼容所有数据库，查询语句必须满足以下条件：
 *     1、联表查询时，如果不同表中有同名字段，必须指定别名
 *     2、所有参与排序的字段必须在Select出的字段中包含
 *     3、Order By语句中不能出现括号
 *     4、Order By字段的值必需唯一，否则top查询的数目不准确
 * @param sql(access语法)
 * @param pageIndex: 页码索引，从1开始
 * @param pageSize: 每页记录条数，正整数
 * @returns {{minRow: number, maxRow: number, pageSize: number, pageIndex: number, pageTotal: number, rowsTotal: number, result: boolean|{}}}
 * @thanks: @codestone(easyasp)
 */
exports.page = function(sql, pageIndex, pageSize) {
    helper.checkConnection();

    // 定义临时变量
    var tmp = {};
    // 返回结果
    var pages = {
        minRow: 0,
        maxRow: 0,
        pageSize: 0,
        pageIndex: 0,
        pageTotal: 0,
        rowsTotal: 0,
        result: false
    };
    // 处理参数
    tmp.pageIndex = Number(pageIndex) || 1;
    tmp.pageSize = Number(pageSize) || 1;
    // 获取数据库版本
    var version;
    if ( this.options.dbType === dbTypes.mssql ) {
        version = this.getVersion();
    } else if ( this.options.dbType === dbTypes.mysql ) {
        version = 'MySQL';
    } else if ( this.options.dbType === dbTypes.sqlite ) {
        version = 'SQLite';
    } else {
        version = 'Access';
    }
    // 取排序字段
    tmp.str = sql.substring(sql.lastIndexOf(")") + 1);
    // 取主键名
    tmp.isPrimaryKey = !/order by/i.test(tmp.str) && /Access|SQL Server/i.test(version);
    // 取所有字段
    tmp.isSelectStar = /\*/.test(sql) && /SQL Server 200(5|8)/i.test(version);
    // 取所有待查表的全部字段
    if (tmp.isPrimaryKey || tmp.isSelectStar) {
        tmp.tables = [];
        tmp.sqlTable = sql.substring(sql.search(/ from /i) + 6, sql.search(/\s(where|having|order|group|for|limit|offset|union)\s|$/i));
        tmp.sqlTable.split(',').forEach(function(table) {
            table = table.split(/ as /i);
            var name = table[0].trim();
            var alias = table[1] ? table[1].trim() : name;
            var fields = Object.keys(exports.getFields(name));
            tmp.tables.push({
                name: name,
                alias: alias,
                fields: fields
            });
        });

        tmp.isSelectStar = tmp.isSelectStar && tmp.tables.length > 1;
    }
    if (tmp.isSelectStar) {
        tmp.tableStars = [];
        tmp.tableFields = {};
        tmp.tables.forEach(function(table) {
            var fields = [];
            table.fields.forEach(function(field) {
                fields.push(table.alias + '.' + field);
            });

            tmp.tableFields[table.alias] = fields.join(',');
            tmp.tableStars.push(table.alias + '.*');
        });

        sql = sql.replace(/([,\s])\*(?=[,\s])/g, '$1' + tmp.tableStars.join(','));

        sql = sql.replace(/([^,\s]+)\.\*(?=[,\s])/g, function($0, $1) {
            return tmp.tableFields[$1] || $0;
        });
    }
    if (tmp.isPrimaryKey) {
        tmp.primaryKey = [];
        tmp.tables.forEach(function(table) {
            var key = table.fields[0];
            if ( tmp.tables.length === 1 ) {
                tmp.primaryKey.push(key);
            } else {
                tmp.primaryKey.push(table.alias + '.' + key);
            }
        });
    }
    // 取不包含排序的sql语句
    if (/order by/i.test(tmp.str)) {
        tmp.order = tmp.str.match(/order by.+$/i)[0];
        tmp.sqlNoOrder = sql.substring(0, sql.length - tmp.order.length).trim();
    } else {
        tmp.sqlNoOrder = sql;
        if (tmp.isPrimaryKey && tmp.primaryKey.length) {
            tmp.orderFields = [];
            tmp.primaryKey.forEach(function(key) {
                tmp.orderFields.push(key + " asc");
            });

            tmp.order = "order by " + tmp.orderFields.join(',')
            sql = sql + " " + tmp.order;
        }
    }
    // 取总记录数
    if (/Access|SQL Server 2000/i.test(version)) {
        tmp.sqlCount = "select count(*) from (" + tmp.sqlNoOrder + ") as __count_table__";
    } else {
        tmp.sqlCount = tmp.sqlNoOrder.replace(/(select).+?(?= from)/i, '$1 count(*)');
    }
    tmp.rs = this.conn.execute(tmp.sqlCount);
    tmp.recordTotal = Number(tmp.rs.Fields(0).Value);
    // 查询结果
    if (tmp.recordTotal>0) {
        // 计算总页数
        tmp.pageTotal = Math.ceil(tmp.recordTotal / tmp.pageSize);
        // 修正页码范围
        tmp.pageIndex = Math.min(tmp.pageIndex, tmp.pageTotal);
        // 计算记录行号
        tmp.minRow = tmp.pageSize * (tmp.pageIndex - 1) + 1;
        tmp.maxRow = Math.min(tmp.pageSize * tmp.pageIndex, tmp.recordTotal);
        // 修正每页数量
        tmp.pageSize = tmp.maxRow - tmp.minRow + 1;
        // 计算偏移量
        tmp.offset = tmp.minRow - 1;
        // 按不同类型的数据库来处理分页
        if (/MySQL|SQLite/i.test(version)) {
            // 如果是MySQL或者SQLite数据库，采用limit取分页记录
            tmp.sqlSelect = sql + " limit " + tmp.offset + ", " + tmp.pageSize;
        } else if (/Access|SQL Server 2000/i.test(version)) {
            // 如果是Access或者SQL Server 2000及以下版本
            // 反向排序
            tmp.orderBack = "";
            tmp.order.split(/(?=,)/g).forEach(function(Field) {
                var field = Field.toLowerCase();
                if (field.endsWith(" desc")) {
                    tmp.orderBack += Field.substring(0, field.lastIndexOf(' desc')) + " asc";
                } else if (field.endsWith(" asc")) {
                    tmp.orderBack += Field.substring(0, field.lastIndexOf(' asc')) + " desc";
                } else {
                    tmp.orderBack += Field + " desc";
                }
            });
            // 查别名字段，解决别名的问题
            tmp.fields = [];
            sql.substring(7, sql.search(/ from /i)).split(/\s*,\s*/).forEach(function(field) {
                field = field.split(/\s+/);
                field.length > 1 && tmp.fields.push({
                    name: field[0],
                    alias: field.slice(-1)[0]
                });
            });
            tmp.fields.forEach(function(field) {
                tmp.order = tmp.order.replace(new RegExp(field.name, 'i'), field.alias);
                tmp.orderBack = tmp.orderBack.replace(new RegExp(field.name, 'i'), field.alias);
            });

            tmp.sqlTop = sql.replace(/select/i, "select top " + tmp.maxRow);
            tmp.sqlSelect = "select * from (select top " + tmp.pageSize + " * from (" + tmp.sqlTop + ") as __result_table__ " + tmp.orderBack + ") as __range_table__ " + tmp.order;
        } else if (/SQL Server 200(5|8)/i.test(version)) {
            // 如果是SQL Server 2005及2008版本数据库，利用ROW_NUMBER函数取分页记录
            // 查重名字段，解决多表字段重名问题
            tmp.fields = [];
            sql.substring(7, sql.search(/ from /i)).split(/\s*,\s*/).forEach(function(field) {
                field = field.split(/\s+/);
                field.length === 1 && field[0].contains('.') && tmp.fields.push({
                    name: field[0],
                    full: field[0] + " as " + field[0].replace('.', '_')
                })
            });
            tmp.fields.forEach(function(field) {
                tmp.sqlNoOrder = tmp.sqlNoOrder.replace(new RegExp(field.name, 'i'), field.full);
            });

            tmp.sqlRowId = tmp.sqlNoOrder.replace(/(?= from )/i, ", row_number() over (" + tmp.order + ") as __rowid__");
            tmp.sqlSelect = "select * from (" + tmp.sqlRowId + ") as __row_table__ where __rowid__ between " + tmp.minRow + " and " + tmp.maxRow;
        } else if (/SQL Server 201(2|4|6)/i.test(version)) {
            // 如果是SQL Server 2012及以上版本数据库
            tmp.sqlSelect = sql + " offset " + tmp.offset + " row fetch next " + tmp.pageSize + " rows only";
        }

        // 执行sql语句，获取最终结果
        pages = {
            minRow: tmp.minRow,
            maxRow: tmp.maxRow,
            pageSize: tmp.pageSize,
            pageIndex: tmp.pageIndex,
            pageTotal: tmp.pageTotal,
            rowsTotal: tmp.recordTotal,
            result: helper.exec(tmp.sqlSelect, 1).toJSON(sql)
        }
    }

    return pages;
};

/**
 * 创建数据库，通常在虚拟主机上没有足够的权限创建。
 * @param options
 * @returns {boolean}
 */
exports.createDatabase = function(options) {
    var conn;
    try {
        switch (options.dbType) {
            case dbTypes.access:
                break;
            case dbTypes.mssql:
                break;
            case dbTypes.mysql:
                options.dbPort = options.dbPort || 3306;
                driver = require('./lib/mysql');
                conn = drive.open(options);
                conn.execute("create database " + options.dbName);
                conn.close();
                break;
            case dbTypes.sqlite:
                var fs = require('fs');
                var path = require('path');
                options.dbPath = path.resolve(options.dbPath);
                fs.writeFileSync(options.dbPath, '', 'utf8');
                break;
        }

        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

/**
 * 创建一张数据表。为了兼容所有数据库，字段类型请使用
 * @param table: 表名
 * @param fields: 字段列表，第一个字段自动作为主键
 * @returns {boolean}
 */
exports.createTable = function(table, fields) {
    helper.checkConnection();

    if ( helper.getType(table) === 'array' ) {
        fields = table;
        table = this.tables[0];
    }

    fields.forEach(function(field, i) {
        fields[i] = helper.resolveField(field);
    });

    var sql = "create table " + table + "(" + fields.join() + ")";

    try {
        this.conn.execute(sql);

        return true;
    } catch(e) {
        console.error(e);
        return false;
    }
};

/**
 * 清除一张表中所有数据，并重置索引。该操作不可恢复，请慎用。
 * @param table：表名
 */
exports.clearTable = function(table) {
    helper.checkConnection();

    table = table || this.tables[0];

    switch (this.options.dbType) {
        case dbTypes.access:
            // 清空数据
            this.conn.execute("delete * from [" + table + "]");
            // 使用压缩并修复来重置索引
            this.close();
            helper.compactAccess(this.connStr);
            this.open();
            break;
        case dbTypes.mssql:
            this.conn.execute("truncate table [" + table + "]");
            break;
        case dbTypes.mysql:
            this.conn.execute("truncate table `" + table + "`");
            break;
        case dbTypes.sqlite:
            // 清空数据
            this.conn.execute("delete from [" + table + "]");
            // 重置索引
            this.conn.execute("update sqlite_sequence set seq = 0 where name ='" + table + "'");
            break;
    }
};

/**
 * 彻底删除一张表，不可恢复，请慎用。
 * @param table：表名
 */
exports.deleteTable = function(table) {
    helper.checkConnection();

    table = table || this.tables[0];

    this.conn.execute(this.resolveSQL("drop table [" + table + "]"));
};

/**
 * 添加字段。
 * @param table：表名
 * @param fields：字段列表，Array
 */
exports.appendFields = function(table, fields) {
    helper.checkConnection();

    if ( helper.getType(table) === 'array' ) {
        fields = table;
        table = this.tables[0];
    }

    var that = this;
    fields.forEach(function(field) {
        that.conn.execute(that.resolveSQL("alter table [" + table + "] add column " + field));
    });
};

/**
 * 删除字段。
 * @param table：表名
 * @param fields：字段列表，Array
 */
exports.deleteFields = function(table, fields) {
    helper.checkConnection();

    if ( helper.getType(table) === 'array' ) {
        fields = table;
        table = this.tables[0];
    }

    var that = this;
    fields.forEach(function(field) {
        that.conn.execute(that.resolveSQL("alter table [" + table + "] drop column " + field));
    });
};

/**
 * 将Access的语句转换为Mssql/Mysql的语句。
 * @param sql: 原始的sql语句(access语法)，为了兼容多种数据库，sql语句中的字符串全部需要使用'包围。
 * @returns {string}
 */
exports.resolveSQL = function(sql) {
    if (this.options.dbType === dbTypes.mysql || this.options.dbType === dbTypes.sqlite) {
        // 如果前后有空白字符，则删除
        sql = sql.trim();
        // 对于TOP，MySQL/SQLite中使用LIMIT
        var exp = /(select)(\s+top\s+(\d+))/i;
        var match = sql.match(exp), start = sql.length - 1;
        while (match) {
            var top = " limit " + match[3];

            if (match.index === 0) {
                sql += top;
            } else {
                var flag = 0;
                for (var i=start; i>=match.index+match[0].length; i--) {
                    if (sql[i] === '"' || sql[i] === "'") {
                        flag = 1 - flag;
                    } else if (sql[i] === ")" && flag === 0) {
                        sql = sql.substring(0, i) + top + sql.substring(i);
                        start = i - match[2].length;
                        break;
                    }
                }
            }
            sql = sql.replace(exp, "$1");
            match = sql.match(exp);
        }
    }

    switch (this.options.dbType) {
        case dbTypes.sqlite:
            // 对于rand函数, SQLite使用 random
            sql = sql.replace(/( order by )rand\((.*)\)/i, '$1random()');
            break;
        case dbTypes.access:
            // 对于rand函数, Access使用 rnd + time()
            sql = sql.replace(/( order by )rand\((.*)\)/i, '$1rnd(time()-$2)');
            break;
        case dbTypes.mysql:
            // 对于关键字，MySQL中使用`代替[]
            sql = sql.replace(/\[|]/g, "`");
            // 对于rand函数, MySQL使用 rand()
            sql = sql.replace(/( order by )rand\((.*)\)/i, '$1rand()');
            break;
        case dbTypes.mssql:
            // 如果前后有空白字符，则删除
            sql = sql.trim();
            // 日期分隔符
            sql = sql.replace(/#([\d\-\.\s:]+)#/g, "'$1'")
            // 对于rand函数, MsSQL使用 newid()
            sql = sql.replace(/( order by )rand\((.*)\)/i, '$1newid()');
            break;
    }

    // 替换变量
    if (/\{\d+}/.test(sql)) {

        var args = Array.prototype.slice.call(arguments, 1);
        sql = sql.replace(/\{(\d+)}/g, function($0, $1) {
            var value;
            if (args[$1]) {
                value = args[$1];
            } else {
                value = $0;
            }

            return value;
        })
    }

    return sql;
};

/**
 * 根据当前连接的数据库类型，生成SQL语句。该方法对于复杂的SQL语句无力，请直接使用runsql方法。
 * @param action: 执行方法，[select, update, delete, insert]
 * @param tables: 表名，如果是多个表则使用数组
 * @param fields: 字段，如果是多个字段则使用数组
 * @param where: 可选，查询条件
 * @param orders: 可选，排序字段，如果是多个字段则使用数组
 * @param top: 可选，查询记录条数
 * @returns {string}
 */
exports.produceSQL = function(action, tables, fields, where, orders, top) {
    var sql = "", s=", ";
    var N = this.options.dbType === dbTypes.mssql ? "N" : "";

    // 以JSON传入参数
    if (Object.prototype.toString.call(tables) === '[object Object]') {
        top = tables.top;
        orders = tables.orders;
        where = tables.where;
        fields = tables.fields;
        tables = tables.tables;
    }

    // 处理参数
    if (typeof fields === 'undefined' || !fields === null) fields = '*';
    if (typeof tables === 'string' && tables.length>0) tables = [tables];
    if (typeof fields === 'string' && fields.length>0) fields = [fields];
    if (typeof orders === 'string' && orders.length>0) orders = [orders];

    // 保存表格
    this.tables = tables;

    switch (action)
    {
        case "select":
        case "delete":
            // 处理SQLite删除不兼容*
            if ( action === "delete" && fields[0] === "*" ) fields = [];

            // 原始语句
            sql = action + " " + fields.join(s) + " from " + tables.join(s);

            // 处理where
            if (where) {
                sql += " where " + where;
            }

            // 处理orderby
            if (orders) {
                sql += " order by " + orders.join(s).replace(/\+/g, "asc").replace(/\-/g, "desc");
            }

            // 处理top查询
            if (typeof top === 'number') {
                if (this.options.dbType === dbTypes.mysql || this.options.dbType === dbTypes.sqlite) {
                    sql = sql + " limit " + top;
                } else {
                    sql = sql.substring(0, 6) + " top " + top + sql.substring(6);
                }
            }

            break;
        case "insert":
            // 处理fields
            var keys = [], values = [];
            for (var i in fields) {
                keys.push(i);

                // 处理不同字段类型
                var type = helper.getType(fields[i]);
                if (type === "number") {
                    values.push(fields[i]);
                } else if (type === "date") {
                    if (this.options.dbType === dbTypes.access) {
                        values.push("'" + fields[i].toLocaleString() + "'");
                    } else {
                        values.push("'" + helper.convertDateTime(fields[i]) + "'");
                    }
                } else if (type === 'boolean') {
                    values.push(fields[i] ? 1 : 0);
                } else if (type === 'string') {
                    values.push(N + "'" + fields[i].replace(/'/g, "''") + "'");
                } else {
                    values.push("'" + fields[i] + "'");
                }
            }

            // 原始语句
            sql = "insert into " + tables.join(s);
            sql += " (" + keys.join(s) + ") values (" + values.join(s) + ")";

            break;
        case "update":
            // 处理fields
            var pairs = [];
            for (var i in fields) {
                // 处理不同字段类型
                var type = helper.getType(fields[i]);
                if (type === "number") {
                    pairs.push(i + "=" + fields[i]);
                } else if (type === "date") {
                    if (this.options.dbType === dbTypes.access) {
                        pairs.push(i + "='" + fields[i].toLocaleString() + "'");
                    } else {
                        pairs.push(i + "='" + helper.convertDateTime(fields[i]) + "'");
                    }
                } else if (type === 'boolean') {
                    pairs.push(i + "=" + (fields[i] ? 1 : 0));
                } else if (type === 'string') {
                    pairs.push(i + "=" + N + "'" + fields[i].replace(/'/g, "''") + "'");
                } else {
                    pairs.push(i + "='" + "'" + fields[i] + "'");
                }
            }

            // 原始语句
            if (this.options.dbType === dbTypes.mssql && tables.length>1) {
                sql = "update " + tables[0].split(/\s/)[0] + " set ";
                sql += pairs.join(s);
                sql += " from " + tables.join(s);
            } else {
                sql = "update " + tables.join(s) + " set ";
                sql += pairs.join(s);
            }

            // 处理where
            if (where) {
                sql += " where " + where;
            }

            break;
    }

    // 删除多余的空格
    sql = sql.replace(/\s+/g, ' ');

    // 构造toString();
    this.toString = function() { return sql };

    return sql;
};

/**
 * 遍历数据库，返回所有表名及其中字段信息
 * @returns {table: {filed:{Name: Name, Type: Type, Status: Status, DefinedSize: DefinedSize}}}
 */
exports.getTables = function(onlyTable) {
    helper.checkConnection();

    var tables = {};

    // 遍历数据库，返回所有表名及其中字段信息
    var rst = this.conn.openSchema(20);
    rst.MoveFirst();
    while ( !rst.EOF )
    {
        var tbName = rst.Fields("TABLE_NAME").Value;
        var tbType = rst.Fields("TABLE_TYPE").Value;
        if ( tbType === "TABLE" ) {
            tables[ tbName ] = onlyTable ? "" : this.getFields(tbName);
        }

        rst.MoveNext();
    }

    return onlyTable ? Object.keys(tables) : tables;
};

/**
 * 返回表中字段信息
 * @param table: 表名，如果不指定则使用上一次操作的表格
 * @returns {{}}
 */
exports.getFields = function(table) {
    helper.checkConnection();

    table = table || this.tables[0];

    var rs = this.conn.openSchema(4, table);

    var fields = {};

    for ( var i = 0; i < rs.Fields.Count; i++ ) {
        fields[ rs.Fields(i).Name ] = {
            Name: rs.Fields(i).Name,
            Type: rs.Fields(i).Type
        }
    }

    return fields;
};

/**
 * 获取数据库的版本号
 * @returns {string}
 * @thanks: @codestone(easyasp)
 */
exports.getVersion = function() {
    helper.checkConnection();

    var dType = '', dVer = '';
    var sVer = this.conn.Properties('DBMS Version').Value;
    switch (this.options.dbType)
    {
        case dbTypes.access:
            dType = 'Microsoft Access';

            switch (sVer.substring(0, 2))
            {
                case '04': dVer = '2000-2003';break;
                case '12': dVer = '2007';break;
            }

            break;
        case dbTypes.mssql:
            dType = 'Microsoft SQL Server';

            switch (sVer.substring(0, 8))
            {
                case '12.00.40': dVer = '2014 Service Pack 1'; break;
                case '12.00.20': dVer = '2014 RTM'; break;
                case '11.00.60': dVer = '2012 Service Pack 3'; break;
                case '11.00.50': dVer = '2012 Service Pack 2'; break;
                case '11.00.30': dVer = '2012 Service Pack 1'; break;
                case '11.00.21': dVer = '2012 RTM'; break;
                case '10.50.60': dVer = '2008 R2 Service Pack 3'; break;
                case '10.50.40': dVer = '2008 R2 Service Pack 2'; break;
                case '10.50.25': dVer = '2008 R2 Service Pack 1'; break;
                case '10.50.16': dVer = '2008 R2 RTM'; break;
                case '10.00.55': dVer = '2008 Service Pack 3'; break;
                case '10.00.40': dVer = '2008 Service Pack 2'; break;
                case '10.00.25': dVer = '2008 Service Pack 1'; break;
                case '10.00.16': dVer = '2008 RTM'; break;
                case '9.00.500': dVer = '2005 Service Pack 4'; break;
                case '9.00.403': dVer = '2005 Service Pack 3'; break;
                case '9.00.304': dVer = '2005 Service Pack 2'; break;
                case '9.00.204': dVer = '2005 Service Pack 1'; break;
                case '9.00.139': dVer = '2005 RTM'; break;
                case '8.00.203': dVer = '2000 Service Pack 4'; break;
                case '8.00.760': dVer = '2000 Service Pack 3'; break;
                case '8.00.534': dVer = '2000 Service Pack 2'; break;
                case '8.00.384': dVer = '2000 Service Pack 1'; break;
                case '8.00.194': dVer = '2000 RTM'; break;
                case '09.00.50': dVer = '2005 Service Pack 4'; break;
                case '09.00.40': dVer = '2005 Service Pack 3'; break;
                case '09.00.30': dVer = '2005 Service Pack 2'; break;
                case '09.00.20': dVer = '2005 Service Pack 1'; break;
                case '09.00.13': dVer = '2005 RTM'; break;
                case '08.00.20': dVer = '2000 Service Pack 4'; break;
                case '08.00.76': dVer = '2000 Service Pack 3'; break;
                case '08.00.53': dVer = '2000 Service Pack 2'; break;
                case '08.00.38': dVer = '2000 Service Pack 1'; break;
                case '08.00.19': dVer = '2000 RTM'; break;
            }

            break;
        case dbTypes.mysql:
            dType = 'MySQL Server';

            dVer = sVer.substring(0, 6);
            break;
        case dbTypes.sqlite:
            dType = 'SQLite';
            dVer = sVer;
            break;
    }

    var version = dType + ' ' + dVer;

    return version.trim();
};

/**
 * 将记录集结果转为JSON。如果给了index参数，则返回对应索引的JSON；如果未给定index参数，则返回数组；如果无结果，则返回false。
 * @returns {boolean|JSON|Array}
 */
exports.toJSON = function(index) {
    helper.checkConnection();

    if ( !this.rs ) helper.throwError('不正确的数据库操作!');

    // 处理多表查询
    var sql = typeof arguments[0] === 'string' ? arguments[0] : this.rs.Source;    // 原始的SQL语句
    sql = sql.substring(0, sql.search(/\s(where|having|order|group|for|limit|offset|union)\s|$/i));
    sql = sql.replace(/select\s(top\s\d+\s)?/i, '');
    sql = sql.replace(/\([^)]\)/g, '');

    var tables = sql.split(/\sfrom\s/i)[1].split(',');  // 查询的表格
    var fields = sql.split(/\sfrom\s/i)[0].split(',');  // 查询的字段

    // 处理带*多表查询的情况
    var stars = [];
    if (sql.contains('*') && tables.length > 1) {
        fields.forEach(function(field) {
            field = field.trim();
            if (field.contains('*') && stars.indexOf(field) === -1) {
                stars.push(field);
            }
        });
        // 因为多表查询时，access和mysql对*的处理方式不一样，所以如果存在同名table.*，则直接返回false
        if (stars.length !== sql.match(/\*/g).length) return false;
        // 因为多表查询时，access和mysql对*的处理方式不一样，所以如果同时存在*和table.*，则直接返回false
        if (stars.length > 1 && stars.indexOf('*') > -1) return false;
        // 如果只有一个*，则拆成多个*
        if (stars[0] === '*') stars = '*'.repeat(tables.length).split('');
    }

    // 查询原始的表格和字段
    if (tables.length > 1) {
        var that = this;
        // 遍历所有表和字段
        var alias = {};     // 表的别名
        var tlist = {};     // 临时表名
        var flist = [];     // 临时字段
        tables.forEach(function(table, i) {
            table = table.trim().replace(/\[|]|`/g, '');
            if (table.contains(' ')) {
                // 有别名的情况
                table = table.split(/\s+/);
                tables[i] = {name: table[0], alias: table.slice(-1)[0]};
            } else {
                // 无别名的情况
                tables[i] = {name: table, alias: table};
            }

            alias[tables[i].alias] = tables[i].name;
            tlist[tables[i].name] = tables[i].alias;
        });
        stars.forEach(function(star, i) {
            var table = star === '*' ? tables[i].name : alias[star.split('.').slice(-2)[0]];
            var tmpfs = that.getFields(table);

            stars[i] = [];
            for ( var name in tmpfs ) {
                var field = {
                    name: name,
                    alias: tlist[table] + '.' + name,
                    table: table
                };

                stars[i].push(field);
            }
        });
        fields.forEach(function(field, i) {
            // 处理带*查询的字段
            if (field.contains('*')) {
                if (field.contains('.')) {
                    // 如果*是某个表
                    flist = flist.concat(stars[0]);
                    stars.shift();
                } else {
                    // 如果*是所有表
                    flist = flist.concat.apply(flist, stars);
                }

                return true;
            }

            field = field.trim().replace(/\[|]|`/g, '');
            field = field.split(/\s+/);

            // 有别名就用别名，没别名就用查询字段名
            var f = { alias: field.slice(-1)[0] };

            field = field[0].split('.');

            f.name = field.slice(-1)[0];
            f.table = alias[field.slice(-2)[0]];

            flist.push(f);
        });
        fields = flist;
    }

    var keep = [], rs = this.rs;

    if ( !rs || (rs.EOF && rs.BOF) ) return false;   // 无记录集时直接返回false

    rs.MoveFirst();
    while ( !rs.EOF )
    {
        var json = {};
        if (tables.length > 1) {
            json.all = {};
            tables.forEach(function(table) { json[table.name] = {} });

            try{
                for ( var i = 0; i < rs.Fields.Count; i++ ) {
                    if (/^__\w+__$/.test(rs.Fields(i).Name)) continue;

                    json.all[fields[i].alias] = helper.formatData(rs.Fields(i).Value);
                    json[fields[i].table][fields[i].name] = helper.formatData(rs.Fields(i).Value);
                }
            }catch(e){
                console.error(e);
            }

        } else {
            for ( var i = 0; i < rs.Fields.Count; i++ ) {
                if (/^__\w+__$/.test(rs.Fields(i).Name)) continue;
                json[rs.Fields(i).Name] = helper.formatData(rs.Fields(i).Value);
            }
        }

        keep.push(json);

        rs.MoveNext();
    }

    if (keep.length === 0) {
        return false;
    } else {
        if (typeof index === 'number') {
            return keep[index];
        } else {
            return keep;
        }
    }
};

/**
 * 将记录集结果转为Array。如果给了index参数，则返回对应索引的数组；如果未给定index参数，则返回整个结果数组；如果没有查询到记录，则返回空数组。
 * @returns {Array}
 */
exports.toArray = function(index) {
    helper.checkConnection();

    var keep = [], rs = this.rs;

    if ( !rs || (rs.EOF && rs.BOF) ) return keep;   // 无记录集时直接返回

    if ( rs.toArray ) {
        return rs.toArray(index);
    }

    rs.MoveFirst();
    while ( !rs.EOF )
    {
        var arr = [];
        for ( var i = 0; i < rs.Fields.Count; i++ ) {
            arr.push(helper.formatData(rs.Fields(i).Value));
        }
        keep.push(arr);

        rs.MoveNext();
    }

    if (typeof index === 'number') {
        return keep[index];
    } else {
        return keep;
    }
};

/**
 * 循环处理查询得到记录集
 * @returns {exports}
 * @param callback(json)
 */
exports.forEach = function(callback) {
    helper.checkConnection();

    var rs = this.rs;

    if ( !rs || (rs.EOF && rs.BOF) ) return this;                // 无记录集时直接返回

    if ( typeof callback !== 'function' ) return this;  // 无回调函数时直接返回

    var row = 0;
    rs.MoveFirst();
    while ( !rs.EOF )
    {
        var json = {};
        for ( var i = 0; i < rs.Fields.Count; i++ ) {
            json[rs.Fields(i).Name] = helper.formatData(rs.Fields(i).Value);
        }

        callback.call(callback, json, row);

        row++;
        rs.MoveNext();
    }

    return this;
};

/**
 * 循环处理查询得到记录集
 * @returns {exports}
 * @param callback(value, name, rowIndex, colIndex)
 */
exports.each = function(callback) {
    helper.checkConnection();

    var rs = this.rs;

    if ( !rs || (rs.EOF && rs.BOF) ) return this;                // 无记录集时直接返回

    if ( typeof callback !== 'function' ) return this;  // 无回调函数时直接返回

    var row = 0;
    rs.MoveFirst();
    while ( !rs.EOF )
    {
        for ( var i = 0; i < rs.Fields.Count; i++ ) {
            callback.call(callback, helper.formatData(rs.Fields(i).Value), rs.Fields(i).Name, row, i);
        }

        row++;
        rs.MoveNext();
    }

    return this;
};

var where = function() {
    this.wheres = [];
};

/**
 * where and
 * @param {String|[{key, val, operate}]} key
 * @param {*} val
 * @param {String} [operate="="]
 * @returns {where}
 */
where.prototype.and = function(key, val, operate) {
    if (key instanceof Array) {
        var that = this;
        key.forEach(function(item) {
            that.push(item.key, item.val, item.operate, "and")
        });
    } else {
        this.push(key, val, operate, "and");
    }

    return this;
};

/**
 * where or
 * @param {String|[{key, val, operate}]} key
 * @param {*} val
 * @param {String} [operate="="]
 * @returns {where}
 */
where.prototype.or = function(key, val, operate) {
    if (key instanceof Array) {
        var that = this;
        key.forEach(function(item) {
            that.push(item.key, item.val, item.operate, "or")
        });
    } else {
        this.push(key, val, operate, "or");
    }

    return this;
};

/**
 *
 * @param {String} key
 * @param {*} val
 * @param {String} [operate="="]
 * @param {String} [logic="and"]
 * @returns {where}
 */
where.prototype.push = function(key, val, operate, logic) {
    operate = operate || '=';
    logic = logic || 'and';

    var text;
    var type = helper.getType(val);
    if (type === "number") {
        val = String(val);
    } else if (type === "date") {
        if (exports.options.dbType === dbTypes.access) {
            val = "'" + val.toLocaleString() + "'";
        } else {
            val = "'" + helper.convertDateTime(val) + "'";
        }
    } else if (type === 'boolean') {
        if (exports.options.dbType === dbTypes.access) {
            val = val ? '-1' : '0';
        } else {
            val = val ? '1' : '0';
        }
    } else if (type === 'string') {
        val = "'" + val.replace(/'/g, "''") + "'";
    } else {
        val = ("'" + String(val) + "'");
    }

    text = key + operate + val;

    this.wheres.push(text);
    this.wheres = [this.wheres.join(" " + logic + " ")];

    return this;
};

where.prototype.toString = function() {
    return this.wheres.join(' and ');
};

exports.where = where;

/**
 * 打开数据库连接
 * @returns {exports}
 */
exports.open = function() {
    try{
        if (!this.conn || this.conn.State !== 1) {
            this.conn.open(this.options);
        }
    } catch(e) {
        console.error(e);
    }

    return this;
};

/**
 * 关闭数据库连接
 * @returns {exports}
 */
exports.close = function() {
    try{
        if (this.conn && this.conn.State !== 0) {
            this.conn.close();
        }
    } catch(e) {
        console.error(e);
    }

    return this;
};

/**
 * 辅助私有方法类
 */
var helper = {};

/**
 * 执行sql语句原型方法。
 * @param sql: 要执行的sql语句(access语法)
 * @param type: 执行方式(insert: 0, select: 1, update/remove: 2)
 */
helper.exec = function(sql, type) {
    helper.checkConnection();

    try{
        var rs = exports.conn.exec(sql, type);
        if (type === 0) {
            exports.id = rs.Fields('id').Value;
            exports.ar = rs.Fields('ar').Value;
        } else if (type === 1) {
            exports.rs = rs;
        } else if (type === 2) {
            exports.ar = rs.Fields('ar').Value;
        }
    } catch (e) {
        helper.throwError(e.message || '执行SQL语句出错！');
    }

    return exports;
};

/**
 * 处理不同数据库创建表时的字段类型。
 * @param field
 * @returns {string}
 */
helper.resolveField = function(field) {
    var dbType = exports.options.dbType;
    var parts = [];

    // 取是否唯一
    var u = field.search(/ unique\s*$/i);
    if (u > -1) {
        parts.unshift('unique');
        field = field.substring(0, u).trim();
    }

    // 取是否主键
    var p = field.search(/ primary key\s*$/i);
    if (p > -1) {
        var primary = field.substring(p).trim();
        parts.unshift(primary);
        field = field.substring(0, p).trim();
    }

    // 取默认值
    var d = field.search(/ default/i);
    if (d > -1) {
        var value = field.substring(d).trim();
        value = value.replace(/^(default)\s*\(/i, "$1 ").replace(/\)$/, "");
        parts.unshift(value);
        field = field.substring(0, d).trim();
    }

    // 取not null
    var n = field.search(/ not| null/i);
    if (n > -1) {
        var nullable = field.substring(n).trim();
        parts.unshift(nullable);
        field = field.substring(0, n).trim();
    }

    // 取字段类型
    var s = field.search(/ /);
    var type = field.substring(s).trim().toLowerCase();
    parts.unshift.apply(parts, type.split(/(?=\()/));

    // 取字段名
    var name = field.substring(0, s);
    parts.unshift(name);

    // 转换字段类型
    type = parts[1];
    parts[1] = fdTypes[type] ? fdTypes[type][dbType] : parts[1];

    // 处理SQLite自增长主键
    if ( dbType === dbTypes.sqlite && /^identity/i.test(type) ) {
        var piece = parts[1].split(/ /);
        parts[1] = piece[0];
        parts.push(piece[1]);
    }

    return parts.join(" ");
};

/**
 * 获取对象类型：undefined, null, string, number, array, boolean, date, error, function, math, object, regexp.
 * @param obj
 * @returns {string}
 */
helper.getType = function(obj) {
    var type = obj === null ? 'null' : typeof obj;
    if (type === 'object') {
        type = Object.prototype.toString.call(obj); // [object Array];
        type = type.replace(/(\[object )|]/g, '').toLowerCase();
    }

    return type;
};

/**
 * 将日期时间转为mysql/mssql能够识别的格式
 * @param date: 传入日期时间
 * @returns {string}
 */
helper.convertDateTime = function(date) {
    var timeString = '';
    timeString = date.getFullYear() + '-' +
        ('00' + (date.getMonth()+1)).slice(-2) + '-' +
        ('00' + date.getDate()).slice(-2) + ' ' +
        ('00' + date.getHours()).slice(-2) + ':' +
        ('00' + date.getMinutes()).slice(-2) + ':' +
        ('00' + date.getSeconds()).slice(-2);

    return timeString;
};

/**
 * Unix时间戳与JS时间戳互相转换。
 * @param stamp
 * @returns {number}
 */
helper.convertTimeStamp = function(stamp, isUnix) {
    if ( isUnix ) {
        return new Date(stamp * 1000).getTime();
    } else {
        return Math.round(new Date(stamp).getTime() / 1000);
    }
};

/**
 * 将从数据库中取出的数据转换成可识别的格式
 * @param data
 * @returns {*}
 */
helper.formatData = function(data) {
    var type = helper.getType(data);

    if ( type === 'date' ) {
        return new Date(data).getTime();
    }

    return data;
};

/**
 * 压缩并修复Access数据库
 * @param connStr
 */
helper.compactAccess = function(connStr) {
    var temprary = '.temp.' + new Date().getTime();
    var source = connStr;
    var target = source.replace(/(;Jet OLEDB:)/, temprary + '$1');

    var engine = new ActiveXObject('JRO.JetEngine');
    engine.CompactDatabase(source, target);

    source = source.match(/Data Source=([^;]+);/)[1];
    target = target.match(/Data Source=([^;]+);/)[1];
    var fso = new ActiveXObject('Scripting.FileSystemObject');
    fso.CopyFile(target, source);
    fso.DeleteFile(target, true);
};

/**
 * 检查数据库是否连接
 */
helper.checkConnection = function() {
    if ( !exports.conn ) {
        helper.throwError('未连接数据库！');
    }
};

/**
 * 打印并抛出错误
 * @param message
 */
helper.throwError = function(message) {
    console.error(message);
    throw new Error(message);
};

// 定义contains方法
if (!String.prototype.contains) {
    String.prototype.contains = function(char) {
        return this.indexOf(char) > -1;
    }
}

// 定义startsWith方法
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(char) {
        return this.indexOf(char) === 0;
    }
}

// 定义endsWith方法
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(char) {
        return this.substr(-1) === char;
    }
}