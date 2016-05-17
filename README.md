# 通用数据库操作模块 #

提供常用的数据库操作接口，支持Microsoft Access，Microsoft SQL Server，MySQL和SQLite数据库。

> **NOTE**
> 对于联表查询时，如果多个表中具有相同的字段，那么应该指定别名而不是使用*来查询，否则在某些数据库中会报错!!

## Environment ##

### Access ###

默认使用`Microsoft.JET.OLEDB.4.0`连接，支持Office 97-2003(.mdb)。如果是Office 2007及以上的版本(.accdb)，请手动指定驱动程序，例如：<code>Microsoft.ACE.OLEDB.12.0</code>。

### SQL Server ###

记得开启TCP/IP，提高访问速度。

### MySQL ###

默认使用32位`5.1`版本驱动。如果是其它版本驱动程序，请手动指定驱动程序版本，例如：`5.3 unicode`。

> MYSQL ODBC 5.1 Driver下载：
> http://dev.mysql.com/get/Downloads/Connector-ODBC/5.1/mysql-connector-odbc-5.1.13-win32.msi

### SQLite ###

默认使用32位`SQLite 3`驱动。

> SQLite ODBC 3 Driver下载：
> http://www.ch-werner.de/sqliteodbc/sqliteodbc.exe

## Methods ##

### connect(options) ###

连接数据库，如果连接失败，会抛出错误信息。

**options:** 数据库连接设置参数(JSON)，对应不同的数据库，参数略有不同。

*对于Access数据库：*

```javascript
{
    "dbType": 0,                        // 表示是Access类型数据库
    "dbPath": "./excms.mdb",            // 数据库绝对路径或相对路径
    "dbUser": "",                       // 可选，用户名
    "dbCode": "",                       // 可选，密码
    "driver": ""                        // 可选，数据库连接驱动
},
```

*对于SQL Server数据库*

```javascript
{
    "dbType": 1,            // 表示是SQL Server类型数据库
    "server": ".",          // 服务器地址
    "dbPort": "",           // 可选，服务器端口
    "dbName": "excms",      // 数据库名称
    "dbUser": "sa",         // 用户名
    "dbCode": "123456"      // 密码
},
```

*对于MySQL数据库*

```javascript
{
    "dbType": 2,            // 表示是MYSQL类型数据库
    "server": "localhost",  // 服务器地址
    "dbPort": "",           // 可选，服务器端口
    "dbName": "excms",      // 数据库名称
    "dbUser": "root",       // 用户名
    "dbCode": "123456",     // 密码
    "driver": ""            // 可选，ODBC驱动版本
}
```

*对于SQLite数据库*

```javascript
{
    "dbType": 3,                        // 表示是Access类型数据库
    "dbPath": "./excms.db",             // 数据库绝对路径或相对路径
    "driver": ""                        // 可选，数据库连接驱动
}
```

Example:

```javascript
var db = require('database');
var config = {dbType: 0, dbPath: './excms.mdb'};
db.connect(config);             // 返回db自身
```

### table(tables) ###

设置要操作的表格，返回this。便于多次操作的链式写法。

**tables:** 表名，如果是多个表则使用数组

### createDatabase(options) ###

创建数据库，通常在虚拟主机上没有足够的权限创建。

**options:** 与connect相同。

### createTable(table, fields) ###

创建一张数据表。

**table:** 表名

**fields:** 字段列表(array)

### clearTable(table) ###

清除一张表中所有数据，并重置索引。该操作不可恢复，请慎用。

**table:** 表名

### deleteTable(table) ###

彻底删除一张表，不可恢复，请慎用。

**table:** 表名

### appendField(table, fields) ###

添加字段。

**table:** 表名

**fields:** 字段列表(array)

### deleteFiled(table, fields) ###

删除字段。

**table:** 表名

**fields:** 字段列表(array)

### select(tables, fields, where, orders, top) ###

查询记录，返回this。后面可跟toJSON()以JSON返回，或者rs返回原始记录集对象。

**tables:** 表名，如果是多个表则使用数组

**fields:** 字段，如果是多个字段则使用数组

**where:** 可选，查询条件

**orders:** 可选，排序字段，如果是多个字段则使用数组

**top:** 可选，查询记录条数

Example:

```javascript
// 单表查询
var config = {
    action: "select",
    tables: "cms_news",
    fields: ["id", "title", "posttime"],
    where: "title like '菱湖%'",
    orders: "id desc",
    top: 4
};

var ret = db.select(config.tables, config.fields, config.where, config.orders, config.top).toJSON();
console.log(ret);

//[
//    {
//        "id": 107,
//        "title": "菱湖早茶与渔业",
//        "posttime": "2015年8月29日 7:38:37"
//    }
//    ,
//    ...
//    {
//        "id": 104,
//        "title": "菱湖渔业协会7点早市",
//        "posttime": "2015年8月27日 7:11:24"
//    }
//]
```

```javascript
// 多表查询
var config = {
    action: "select",
    tables: ["cms_news as N", "cms_news_class as C"],
    fields: ["N.id", "N.title", "N.posttime", "N.category", "N.poster", "C.id", "C.title as cate_title"],
    where: "N.category=C.id and N.title like '菱湖%'",
    orders: "N.id desc",
    top: 4
};

var ret = db.select(config.tables, config.fields, config.where, config.orders, config.top).toJSON();
console.log(ret);
//[
//    {
//        "all": {
//            "N.id": 107,
//            "N.title": "菱湖早茶与渔业",
//            "N.posttime": "2015年8月29日 7:38:37",
//            "N.category": 5,
//            "N.poster": 1,
//            "C.id": 5,
//            "cate_title": "要闻"    // <-- 指定了别名，则使用别名
//        },
//        "cms_news": {
//            "id": 107,
//            "title": "菱湖早茶与渔业",
//            "posttime": "2015年8月29日 7:38:37",
//            "category": 5,
//            "poster": 1
//        },
//        "cms_news_class": {
//            "id": 5,
//            "title": "要闻"
//        }
//    }
//    ...
//]
```

### sel(fields, where, orders, top) ###

查询记录，返回this，用于链式写法操作相同表格。后面可跟toJSON()以JSON返回，或者rs返回原始记录集对象。

### getLastId(id, table) ###

获取最后一条记录的id值

**id:** 要查询的id字段名称

**table:** 要查询的表格，如果省略则使用上一次操作的表格

### exist(where, table) ###

判断表中是否存在某字段值

**where:** 要查询的条件

**table:** 要查询的表格，如果省略则使用上一次操作的表格

### insert(tables, fields) ###

插入记录，返回this。后面可跟ar返回受影响的行数，或者id返回新记录的id值。

**tables:** 表名，如果是多个表则使用数组

**fields:** 字段，如果是多个字段则使用JSON

### ins(fields) ###

插入记录，返回this，用于链式写法操作相同表格。后面可跟ar返回受影响的行数，或者id返回新记录的id值。

### update(tables, fields, where) ###

更新记录，返回this。后面可跟ar返回受影响的行数。

**tables:** 表名，如果是多个表则使用数组

**fields:** 字段，如果是多个字段则使用JSON

**where:** 可选，查询条件

### upd(fields, where) ###

更新记录，返回this，用于链式写法操作相同表格。后面可跟ar返回受影响的行数。

### remove(tables, fields, where, orders, top) ###

删除记录，返回this。后面可跟ar返回受影响的行数。

**tables:** 表名，如果是多个表则使用数组

**fields:** 字段，如果是多个字段则使用数组

**where:** 可选，查询条件

**orders:** 可选，排序字段，如果是多个字段则使用数组

**top:** 可选，查询记录条数

### rem(fields, where, orders, top) ###

删除记录，返回this，用于链式写法操作相同表格。后面可跟ar返回受影响的行数。

### runSQL(sql) ###

执行SQL语句，返回记录集(this.rs)或受影响的行数(this.ar)或者插入记录的索引(this.id)。

**sql:** 要执行的sql语句(access语法)，为了兼容多种数据库，sql语句中的字符串全部需要使用'包围。

### page ###

分页查询，可以是单表、多表连接或者包含子查询的复杂SQL查询语句。

### toJSON(index) ###

将记录集结果转为JSON。如果给了index参数，则返回对应索引的JSON；如果未给定index参数，则返回数组；如果无结果，则返回false。

> 如果是多表查询，且查询语句中包含*，请使用toArray()方法返回结果。

Example:

```javascript
var ret1 = db.runsql('select top 10 * from users').toJSON();
ret1.forEach(function(item){
    console.log(item.username);
})

var ret2 = db.runsql('select * from users where id=1').toJSON(0);
console.log(ret2);

// 其它示例请查看select()方法
```

### toArray(index) ###

将记录集结果转为Array。如果给了index参数，则返回对应索引的数组；如果未给定index参数，则返回整个结果数组；如果没有查询到记录，则返回空数组。

### forEach(callback) ###

循环处理查询得到记录集。

```javascript
db.runsql('select top 10 * from users');
db.forEach(function(value, name, rowIndex, colIndex) {
    console.log(value, name, rowIndex, colIndex);
});
```

### resolveSQL(sql) ###

将Access的语句转换为Mssql/Mysql的语句。

**sql:** 原始的sql语句(access语法)，为了兼容多种数据库，sql语句中的字符串全部需要使用'包围。

Example:

```javascript
var sql = "select top 10 * from [users]";
sql = db.resolveSQL(sql);
console.log(sql);
// prints:
// select * from `users` limit 10
```

### produceSQL(action, tables, fields, where, orders, top) ###

根据当前连接的数据库类型，生成SQL语句。该方法对于复杂的SQL语句无力，请直接使用runsql方法。

**action:** 执行方法，[select, delete, update, insert]

**tables:** 表名，如果是多个表则使用数组

**fields:** 字段，如果是多个字段则使用数组(select, delete)或JSON(update, insert)

**where:** 可选，查询条件

**orders:** 可选，排序字段，如果是多个字段则使用数组

**top:** 可选，查询记录条数

Example:

```javascript
var config = {
    action: "select",
    tables: ["cms_news as N", "cms_news_class as C"],
    fields: ["N.id", "N.title", "N.posttime", "N.category", "N.poster", "C.id", "C.title"],
    where: "N.category=C.id and N.title like '菱湖%'",
    orders: "N.id desc",
    top: 4
};

var db = require("database");
db.options = {};
db.options.dbType = 0;
var sql1 = db.produceSQL(config.action, config.tables, config.fields, config.where, config.orders, config.top);
console.log(sql1);
// prints:
// select top 4 N.id,N.title,N.posttime,N.category,N.poster,C.id,C.title from cms_news as N,cms_news_class as C where N.category=C.id and N.title like '菱湖%' order by N.id desc
db.options.dbType = 2;
var sql2 = db.produceSQL(config.action, config.tables, config.fields, config.where, config.orders, config.top);
console.log(sql2);
// prints:
// select N.id,N.title,N.posttime,N.category,N.poster,C.id,C.title from cms_news as N,cms_news_class as C where N.category=C.id and N.title like '菱湖%' order by N.id desc limit 4
```

### getTables() ###

遍历数据库，返回所有表名及其中字段信息。

Example:

```javascript
var tables = db.getTables();
console.log(tables);

/* prints like bellow:
{
    "users": {
        "id": {
            Name: "id",
            Type: 0,
            Status: 0,
            DefinedSize: 4
        }
    }
}
*/
```

### getFields(table) ###

返回表中字段信息

**table:** 表名，如果不指定则使用上一次操作的表格

### getVersion() ###

获取数据库的版本号，例如：Microsoft SQL Server 2008 R2 Service Pack 2。

## Objects ##

### options ###

原始的数据库连接参数对象。

### conn ###

当前的数据库连接对象。

### rs ###

当前的记录集(RecordSet)。

### ar ###

受影响的行数(Affected rows)。

### id ###

插入数据后的id值

### dbTypes ###

支持的数据库类型的代号。

### fdTypes ###

通用字段类型。为了兼容所有数据库，在创建表的时候，请使用通用字段类型。

### fdCodes ###

数据表字段类型代号。