/**
 * Usage: 封装Adodb风格的RecordSet对象, 只处理一条sql查询语句的情况
 * Author: Spikef < Spikef@Foxmail.com >
 * Copyright: Envirs Team < http://envirs.com >
 */

module.exports = RecordSet;

/**
 * 创建一个类似记录集的对象, 仅支持部分常用属性和方法
 * @param {Object} data {fields: [], values: []}  字段名称列表, 值列表
 * @param sql
 * @constructor
 */
function RecordSet(data, sql) {
    this.CursorLocation = data.values.length - 1;

    Object.defineProperty(this, 'data', {
        get: function() {
            return data;
        }
    });

    Object.defineProperty(this, 'Source', {
        enumerable: true,
        get: function() {
            return sql;
        }
    });

    Object.defineProperty(this, 'RecordCount', {
        enumerable: true,
        get: function() {
            return data.values.length;
        }
    });

    Object.defineProperty(this, 'BOF', {
        enumerable: true,
        get: function() {
            return !data.values.length || this.CursorLocation === -1;
        }
    });

    Object.defineProperty(this, 'EOF', {
        enumerable: true,
        get: function() {
            return !data.values.length || this.CursorLocation === data.values.length;
        }
    });

    this.Fields = Fields();

    Object.defineProperty(this.Fields, 'Count', {
        get: function() {
            return data.fields.length;
        }
    });
}

RecordSet.prototype.MoveFirst = function() {
    this.CursorLocation = 0;
};

RecordSet.prototype.MoveLast = function() {
    this.CursorLocation = this.RecordCount - 1;
};

RecordSet.prototype.MoveNext = function() {
    if (!this.EOF) {
        this.CursorLocation++;
    } else {
        throw new Error('已到达记录的最后面.');
    }
};

RecordSet.prototype.MovePrevious = function() {
    if (!this.BOF) {
        this.CursorLocation--;
    } else {
        throw new Error('已到达记录的最前面.');
    }
};

RecordSet.prototype.toJSON = function(index) {
    if ( !this.data.values.length ) return false;

    var arr = [], that = this;

    if ( typeof index === 'number' ) {
        var json = {};
        this.data.values[index].forEach(function(value, index) {
            json[that.data.fields[index]] = value;
        });

        return json;
    } else{
        this.data.values.forEach(function(values) {
            var json = {};
            values.forEach(function(value, i) {
                json[that.data.fields[i]] = value;
            });

            arr.push(json);
        });
        return arr;
    }
};

RecordSet.prototype.toArray = function(index) {
    if ( typeof index === 'number' ) {
        return this.data.values[index];
    } else {
        return this.data.values;
    }
};

function Fields() {
    return function(i) {
        try {
            if ( typeof i === 'string' ) {
                i = this.data.fields.indexOf(i);
            }

            return {
                Name: this.data.fields[i],
                Type: this.data.types ? this.data.types[i] : null,
                Value: this.data.values[this.CursorLocation][i]
            }
        } catch(e) {
            throw new Error('访问了不存在的记录集.');
        }
    }
};

/*
var data = {
    fields: ['id', 'name', 'title'],
    values: [
        [1, 'aa', '宁静的夏天'],
        [2, 'bb', '知了在唱歌']
    ]
};

var rs = new recordSet(data, "select * from a");

console.log(rs.Source);

var arr = [];

// example 1:

rs.MoveFirst();

while ( !rs.EOF )
{
    var json = {};
    for ( var i = 0; i < rs.Fields.Count; i++ ) {
        json[rs.Fields(i).Name] = rs.Fields(i).Value;
    }
    arr.push(json);

    rs.MoveNext();
}

// example 2:

rs.MoveLast();

while ( !rs.BOF )
{
    var json = {};
    for ( var i = 0; i < rs.Fields.Count; i++ ) {
        json[rs.Fields(i).Name] = rs.Fields(i).Value;
    }

    arr.push(json);

    rs.MovePrevious();
}

console.log(arr);
*/