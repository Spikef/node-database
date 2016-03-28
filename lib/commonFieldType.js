/**
 * Usage: Access、SQL Server、MYSQL通用字段类型
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

module.exports = {
    // 自增长
    identity: ['counter', 'int identity', 'int auto_increment', 'integer autoincrement'],
    // 短文本
    varchar: ['varchar', 'varchar', 'varchar', 'varchar'],
    nvarchar: ['varchar', 'nvarchar', 'nvarchar', 'nvarchar'],
    // 长文本
    text: ['text', 'text', 'text', 'text'],
    ntext: ['text', 'ntext', 'text', 'text'],
    // 字节   0~255
    byte: ['byte', 'tinyint', 'tinyint unsigned', 'tinyint'],
    // 短整型 -32,768~+32,767
    short: ['short', 'smallint', 'smallint', 'smallint'],
    // 长整型 -2147483648~+2147483647
    int: ['int', 'int', 'int', 'int'],
    // 小数
    decimal: ['decimal', 'decimal', 'decimal', 'decimal'],
    // 单精度型 -3.4×1038~3.4×1038
    float: ['float', 'float', 'float', 'float'],
    // 双精度型 -1.797×10308~+1.797×10308
    double: ['double', 'double', 'double', 'double'],
    // 货币
    money: ['money', 'money', 'money', 'decimal'],
    // 日期时间型
    datetime: ['date', 'datetime', 'datetime', 'datetime'],
    date: ['date', 'date', 'date', 'date'],
    // 是/否
    bit: ['bit', 'bit', 'bit', 'boolean']
};

// http://www.chinaz.com/program/2009/0105/59154.shtml
// http://www.cnblogs.com/andy_tigger/archive/2011/08/21/2147745.html
// http://blog.csdn.net/firebird2010/article/details/4958358
// https://www.sqlite.org/datatype3.html